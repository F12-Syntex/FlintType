/** Clerk Protect ("protect_check") for the custom auth forms.
 *
 *  When Protect is on, Clerk can answer `signUp.create()` (or a later
 *  step) with `missingFields: ["protect_check"]` and a `protectCheck`
 *  challenge: `{ token, sdkUrl, expiresAt, uiHints }`. Clerk's own
 *  components then load `sdkUrl` as an ES module, call its default
 *  export with a container element (it may mount a "Verify you are
 *  human" widget there and asks to be shown via `setWidgetVisible`),
 *  and send the proof it resolves with to `submitProtectCheck`. This is
 *  the same sequence for our own forms. The installed Clerk types
 *  predate the feature, so the resource is typed structurally. */

export type ProtectCheck = {
  status?: string;
  token: string;
  sdkUrl: string;
  /** Epoch milliseconds. */
  expiresAt?: number;
  uiHints?: unknown;
};

export type ProtectableResource = {
  missingFields?: readonly string[] | null;
  protectCheck?: ProtectCheck | null;
  submitProtectCheck?: (params: { proofToken: string }) => Promise<unknown>;
  reload?: () => Promise<unknown>;
};

type SolveOptions = {
  token: string;
  uiHints?: unknown;
  signal: AbortSignal;
  setWidgetVisible: (visible: boolean) => Promise<void>;
};
type ProtectSdk = { default?: unknown };
export type SdkLoader = (url: string) => Promise<ProtectSdk>;

export type ProtectFailure =
  | "unavailable"
  | "invalid_url"
  | "load_failed"
  | "invalid_script"
  | "failed"
  | "expired"
  | "aborted";

export class ProtectCheckError extends Error {
  constructor(
    readonly reason: ProtectFailure,
    message: string,
  ) {
    super(message);
    this.name = "ProtectCheckError";
  }
}

/** True when the resource is waiting on a Protect challenge. */
export function needsProtectCheck(resource: ProtectableResource | null | undefined): boolean {
  if (!resource) return false;
  return (
    resource.protectCheck != null ||
    (resource.missingFields ?? []).includes("protect_check")
  );
}

export function isProtectCheckExpired(check: ProtectCheck, now = Date.now()): boolean {
  return typeof check.expiresAt === "number" && check.expiresAt < now;
}

/** The challenge script must be a plain https URL; anything else is
 *  refused before it is imported. */
export function validateSdkUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ProtectCheckError("invalid_url", "Protect check sdk_url is not a valid URL");
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new ProtectCheckError("invalid_url", "Protect check sdk_url must be a plain https URL");
  }
  return url;
}

/** Native dynamic import, left alone by the bundler so the module is
 *  fetched from Clerk at runtime. */
const importSdk: SdkLoader = (url) => import(/* webpackIgnore: true */ url);

const MAX_ROUNDS = 4;
const MAX_EXPIRED_RELOADS = 2;

/** Runs every pending Protect challenge on `resource` until Clerk stops
 *  asking. Throws `ProtectCheckError` on failure; `aborted` when
 *  `signal` fires (the form unmounted or the user went back). */
export async function runProtectCheck(
  resource: ProtectableResource,
  {
    container,
    signal,
    setWidgetVisible,
    loadTimeoutMs = 60_000,
    loadSdk = importSdk,
    now = Date.now,
  }: {
    container: HTMLElement;
    signal: AbortSignal;
    setWidgetVisible: (visible: boolean) => void;
    loadTimeoutMs?: number;
    loadSdk?: SdkLoader;
    now?: () => number;
  },
): Promise<void> {
  const abortIfNeeded = () => {
    if (signal.aborted) throw new ProtectCheckError("aborted", "Protect check aborted");
  };
  let expiredReloads = 0;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    abortIfNeeded();
    if (!needsProtectCheck(resource)) return;
    const check = resource.protectCheck;
    if (!check || !resource.submitProtectCheck) {
      throw new ProtectCheckError("unavailable", "Protect check requested without a challenge");
    }
    if (isProtectCheckExpired(check, now())) {
      if (expiredReloads >= MAX_EXPIRED_RELOADS || !resource.reload) {
        throw new ProtectCheckError("expired", "Protect check expired");
      }
      expiredReloads += 1;
      await resource.reload();
      continue;
    }

    const proofToken = await solve(check, {
      container,
      signal,
      setWidgetVisible,
      loadTimeoutMs,
      loadSdk,
    });
    abortIfNeeded();
    try {
      await resource.submitProtectCheck({ proofToken });
    } catch (err) {
      // A double submit (another tab, a retry) is already done: reload
      // and carry on from Clerk's current state.
      if (clerkErrorCode(err) === "protect_check_already_resolved" && resource.reload) {
        await resource.reload();
      } else {
        throw err;
      }
    }
    // Clerk mutates the resource in place; loop in case it issued a
    // fresh challenge.
  }
  if (needsProtectCheck(resource)) {
    throw new ProtectCheckError("failed", "Protect check did not resolve");
  }
}

async function solve(
  check: ProtectCheck,
  {
    container,
    signal,
    setWidgetVisible,
    loadTimeoutMs,
    loadSdk,
  }: {
    container: HTMLElement;
    signal: AbortSignal;
    setWidgetVisible: (visible: boolean) => void;
    loadTimeoutMs: number;
    loadSdk: SdkLoader;
  },
): Promise<string> {
  const url = validateSdkUrl(check.sdkUrl);
  container.replaceChildren();

  let sdk: ProtectSdk;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    sdk = await Promise.race([
      loadSdk(url.toString()),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), loadTimeoutMs);
      }),
    ]);
  } catch {
    if (signal.aborted) throw new ProtectCheckError("aborted", "Protect check aborted");
    throw new ProtectCheckError("load_failed", "Protect check script failed to load");
  } finally {
    clearTimeout(timer);
  }
  if (typeof sdk.default !== "function") {
    throw new ProtectCheckError("invalid_script", "Protect check script has no default export");
  }

  const options: SolveOptions = {
    token: check.token,
    uiHints: check.uiHints,
    signal,
    setWidgetVisible: async (visible) => {
      if (!signal.aborted) setWidgetVisible(visible);
    },
  };
  let proof: unknown;
  try {
    proof = await (sdk.default as (el: HTMLElement, o: SolveOptions) => Promise<unknown>)(
      container,
      options,
    );
  } catch {
    if (signal.aborted) throw new ProtectCheckError("aborted", "Protect check aborted");
    throw new ProtectCheckError("failed", "Protect check did not pass");
  } finally {
    setWidgetVisible(false);
  }
  if (typeof proof !== "string" || proof.length === 0) {
    throw new ProtectCheckError("failed", "Protect check returned no proof");
  }
  return proof;
}

function clerkErrorCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "errors" in err) {
    const errors = (err as { errors?: { code?: string }[] }).errors;
    return Array.isArray(errors) ? errors[0]?.code : undefined;
  }
  return undefined;
}

/** Plain copy for a failed check, or null when `err` isn't one (the
 *  caller then falls back to Clerk's own message). `aborted` returns ""
 *  because the user left on purpose and needs no message. */
export function protectCheckMessage(err: unknown): string | null {
  if (!(err instanceof ProtectCheckError)) return null;
  switch (err.reason) {
    case "aborted":
      return "";
    case "expired":
      return "The human check timed out. Press the button to try again.";
    case "load_failed":
      return "The human check couldn't load. Check your connection and try again.";
    case "failed":
      return "We couldn't confirm you're human. Try again, or continue with Discord.";
    default:
      return "Sign-up's security check couldn't start. Try again later, or continue with Discord.";
  }
}
