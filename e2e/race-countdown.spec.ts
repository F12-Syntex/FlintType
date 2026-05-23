import { expect, test } from "@playwright/test";
import {
  countdownVisible,
  dismissChangelog,
  focusTypingInput,
  maxLaneWidth,
} from "./helpers";

/** The bug that recurred twice: typing during the 3-2-1 countdown must
 *  not advance the run. This drives a real matchmaking → countdown →
 *  racing lifecycle and asserts the lane stays at 0% through the
 *  countdown, then moves once the race starts. */
test("typing is locked during the race countdown and unlocked when racing", async ({
  page,
}) => {
  await page.goto("/race");
  await dismissChangelog(page);
  await page.getByRole("button", { name: "Find race" }).click();

  // Spam keys the *instant* we enter — matchmaking / connecting, before
  // the countdown even shows. This is the window that used to leak
  // (snapshot still null → lock open). Nothing may register.
  await focusTypingInput(page);
  await page.keyboard.type("spamspamspam ", { delay: 5 });
  expect(await maxLaneWidth(page)).toBe(0);

  // Wait for the countdown digit to appear (matchmaking + lobby first).
  await expect.poll(() => countdownVisible(page), { timeout: 25_000 }).toBe(true);

  // Hammer the keyboard through the countdown. The hidden input is the
  // real focus target, so these are genuine onKeyDown events.
  await focusTypingInput(page);
  await page.keyboard.type("the quick brown fox ", { delay: 8 });

  // Nothing may have advanced while the countdown is still on screen.
  expect(await countdownVisible(page)).toBe(true);
  expect(await maxLaneWidth(page)).toBe(0);

  // Wait for the gun (countdown digit gone → racing).
  await expect.poll(() => countdownVisible(page), { timeout: 25_000 }).toBe(false);

  // Now the same typing must register.
  await focusTypingInput(page);
  await page.keyboard.type("the quick brown fox jumps ", { delay: 8 });
  await expect.poll(() => maxLaneWidth(page), { timeout: 10_000 }).toBeGreaterThan(0);
});
