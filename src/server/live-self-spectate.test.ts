import { describe, expect, it } from "vitest";
import { selfSpectateAllowed } from "./live-self-spectate";

describe("selfSpectateAllowed", () => {
  it("is false under the test runner (IS_TEST short-circuits the dev bypass)", () => {
    // NODE_ENV=test, so even though APP_ENV defaults to development the
    // gate must stay closed — the suite exercises the real prod behaviour.
    expect(selfSpectateAllowed()).toBe(false);
  });
});
