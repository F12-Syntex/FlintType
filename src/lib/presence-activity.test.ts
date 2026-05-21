import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getActivity,
  setActivity,
  subscribeActivity,
} from "./presence-activity";

// The store is a module singleton — reset to the default after each test
// so cases don't leak state into one another.
afterEach(() => setActivity("online"));

describe("presence-activity", () => {
  it("defaults to 'online'", () => {
    expect(getActivity()).toBe("online");
  });

  it("updates the current activity", () => {
    setActivity("practicing");
    expect(getActivity()).toBe("practicing");
    setActivity("racing");
    expect(getActivity()).toBe("racing");
  });

  it("notifies subscribers on change", () => {
    const fn = vi.fn();
    subscribeActivity(fn);
    setActivity("practicing");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not notify when the value is unchanged", () => {
    setActivity("practicing");
    const fn = vi.fn();
    subscribeActivity(fn);
    setActivity("practicing");
    expect(fn).not.toHaveBeenCalled();
  });

  it("stops notifying after unsubscribe", () => {
    const fn = vi.fn();
    const unsubscribe = subscribeActivity(fn);
    unsubscribe();
    setActivity("racing");
    expect(fn).not.toHaveBeenCalled();
  });
});
