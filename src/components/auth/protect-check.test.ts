import { describe, expect, it, vi } from "vitest";
import {
  isProtectCheckExpired,
  needsProtectCheck,
  type ProtectableResource,
  type ProtectCheck,
  ProtectCheckError,
  protectCheckMessage,
  runProtectCheck,
  type SdkLoader,
  validateSdkUrl,
} from "./protect-check";

const container = { replaceChildren: () => {} } as unknown as HTMLElement;

const challenge = (over: Partial<ProtectCheck> = {}): ProtectCheck => ({
  status: "pending",
  token: "tok",
  sdkUrl: "https://specter.protect.clerk.com/ins_x/speed-bump/v1.js",
  expiresAt: 10_000,
  ...over,
});

/** A Clerk-like resource: submitting a proof clears the challenge,
 *  mutating the resource in place like Clerk does. */
function fakeResource(check: ProtectCheck | null = challenge()) {
  const resource: ProtectableResource & {
    submitProtectCheck: ReturnType<typeof vi.fn>;
    reload: ReturnType<typeof vi.fn>;
  } = {
    missingFields: check ? ["protect_check"] : [],
    protectCheck: check,
    submitProtectCheck: vi.fn(async () => {
      resource.protectCheck = null;
      resource.missingFields = [];
      return resource;
    }),
    reload: vi.fn(async () => resource),
  };
  return resource;
}

const solvingSdk = (proof = "proof-1"): SdkLoader =>
  vi.fn(async () => ({
    default: async (_el: HTMLElement, opts: { setWidgetVisible: (v: boolean) => Promise<void> }) => {
      await opts.setWidgetVisible(true);
      return proof;
    },
  }));

const run = (resource: ProtectableResource, loadSdk: SdkLoader, extra = {}) =>
  runProtectCheck(resource, {
    container,
    signal: new AbortController().signal,
    setWidgetVisible: () => {},
    loadSdk,
    now: () => 0,
    ...extra,
  });

describe("needsProtectCheck", () => {
  it("is true for a pending challenge or a protect_check missing field", () => {
    expect(needsProtectCheck({ protectCheck: challenge() })).toBe(true);
    expect(needsProtectCheck({ missingFields: ["protect_check"] })).toBe(true);
  });

  it("is false otherwise", () => {
    expect(needsProtectCheck(null)).toBe(false);
    expect(needsProtectCheck({ missingFields: ["username"], protectCheck: null })).toBe(false);
  });
});

describe("validateSdkUrl / isProtectCheckExpired", () => {
  it("accepts only plain https URLs", () => {
    expect(validateSdkUrl("https://a.example/x.js").hostname).toBe("a.example");
    for (const bad of ["http://a.example/x.js", "https://u:p@a.example/x.js", "nope"]) {
      expect(() => validateSdkUrl(bad)).toThrow(ProtectCheckError);
    }
  });

  it("is expired only once expiresAt has passed", () => {
    expect(isProtectCheckExpired(challenge({ expiresAt: 100 }), 50)).toBe(false);
    expect(isProtectCheckExpired(challenge({ expiresAt: 100 }), 150)).toBe(true);
    expect(isProtectCheckExpired(challenge({ expiresAt: undefined }), 150)).toBe(false);
  });
});

describe("runProtectCheck", () => {
  it("does nothing when Clerk asked for no check", async () => {
    const resource = fakeResource(null);
    const loadSdk = solvingSdk();
    await run(resource, loadSdk);
    expect(loadSdk).not.toHaveBeenCalled();
    expect(resource.submitProtectCheck).not.toHaveBeenCalled();
  });

  it("loads the challenge script, shows the widget, and submits its proof", async () => {
    const resource = fakeResource();
    const loadSdk = solvingSdk("proof-xyz");
    const visible: boolean[] = [];
    await run(resource, loadSdk, { setWidgetVisible: (v: boolean) => visible.push(v) });
    expect(loadSdk).toHaveBeenCalledWith(
      "https://specter.protect.clerk.com/ins_x/speed-bump/v1.js",
    );
    expect(resource.submitProtectCheck).toHaveBeenCalledWith({ proofToken: "proof-xyz" });
    expect(visible).toEqual([true, false]);
  });

  it("reloads an expired challenge, then gives up after two reloads", async () => {
    const resource = fakeResource(challenge({ expiresAt: -1 }));
    await expect(run(resource, solvingSdk())).rejects.toMatchObject({ reason: "expired" });
    expect(resource.reload).toHaveBeenCalledTimes(2);
    expect(resource.submitProtectCheck).not.toHaveBeenCalled();
  });

  it("solves a fresh challenge issued after a reload", async () => {
    const resource = fakeResource(challenge({ expiresAt: -1 }));
    resource.reload.mockImplementation(async () => {
      resource.protectCheck = challenge({ expiresAt: 10_000, token: "fresh" });
      return resource;
    });
    await run(resource, solvingSdk());
    expect(resource.reload).toHaveBeenCalledTimes(1);
    expect(resource.submitProtectCheck).toHaveBeenCalledTimes(1);
  });

  it("maps a script that fails to load, or has no default export", async () => {
    const failing: SdkLoader = async () => {
      throw new Error("network");
    };
    await expect(run(fakeResource(), failing)).rejects.toMatchObject({ reason: "load_failed" });
    const empty: SdkLoader = async () => ({});
    await expect(run(fakeResource(), empty)).rejects.toMatchObject({ reason: "invalid_script" });
  });

  it("maps a challenge that doesn't pass to 'failed' and hides the widget", async () => {
    const visible: boolean[] = [];
    const rejecting: SdkLoader = async () => ({
      default: async () => {
        throw new Error("turnstile timeout");
      },
    });
    await expect(
      run(fakeResource(), rejecting, { setWidgetVisible: (v: boolean) => visible.push(v) }),
    ).rejects.toMatchObject({ reason: "failed" });
    expect(visible).toEqual([false]);
  });

  it("treats an already-resolved challenge as done after a reload", async () => {
    const resource = fakeResource();
    resource.submitProtectCheck.mockRejectedValueOnce({
      errors: [{ code: "protect_check_already_resolved" }],
    });
    resource.reload.mockImplementation(async () => {
      resource.protectCheck = null;
      resource.missingFields = [];
      return resource;
    });
    await run(resource, solvingSdk());
    expect(resource.reload).toHaveBeenCalledTimes(1);
  });

  it("rethrows other submit errors untouched", async () => {
    const resource = fakeResource();
    const clerkError = { errors: [{ code: "form_param_invalid" }] };
    resource.submitProtectCheck.mockRejectedValueOnce(clerkError);
    await expect(run(resource, solvingSdk())).rejects.toBe(clerkError);
  });

  it("stops with 'aborted' when the signal fires", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      run(fakeResource(), solvingSdk(), { signal: controller.signal }),
    ).rejects.toMatchObject({ reason: "aborted" });
  });

  it("fails when Clerk keeps issuing challenges", async () => {
    const resource = fakeResource();
    resource.submitProtectCheck.mockImplementation(async () => resource);
    await expect(run(resource, solvingSdk())).rejects.toMatchObject({ reason: "failed" });
    expect(resource.submitProtectCheck).toHaveBeenCalledTimes(4);
  });

  it("refuses a missing challenge object", async () => {
    await expect(
      run({ missingFields: ["protect_check"], protectCheck: null }, solvingSdk()),
    ).rejects.toMatchObject({ reason: "unavailable" });
  });
});

describe("protectCheckMessage", () => {
  it("gives plain copy per failure and stays quiet for an abort", () => {
    expect(protectCheckMessage(new ProtectCheckError("aborted", "x"))).toBe("");
    expect(protectCheckMessage(new ProtectCheckError("failed", "x"))).toMatch(/human/);
    expect(protectCheckMessage(new ProtectCheckError("load_failed", "x"))).toMatch(/connection/);
    expect(protectCheckMessage(new Error("other"))).toBeNull();
  });
});
