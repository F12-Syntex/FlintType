import { expect, test } from "@playwright/test";
import {
  countdownVisible,
  dismissChangelog,
  finishRace,
  maxLaneWidth,
} from "./helpers";

/** Public lobby — the "Find race" path. The server joins the most-
 *  available matchmaking room or spins one up (clients can't create a
 *  public lobby; `race.queue` only takes a modeId), bots fill empty
 *  seats, then a 3-2-1 countdown and the live race. This drives the
 *  whole lifecycle to a finished result. */
test("public lobby: Find race joins/creates, races to a finish", async ({
  page,
}) => {
  await page.goto("/race");
  await dismissChangelog(page);

  // Enter the public lobby. The button is unchanged copy; the reframe
  // is conceptual (this IS the public lobby).
  await page.getByRole("button", { name: "Find race" }).click();

  // Matchmaking → lobby → the 3-2-1 countdown appears.
  await expect
    .poll(() => countdownVisible(page), { timeout: 30_000 })
    .toBe(true);

  // The gun: countdown digit clears → racing.
  await expect
    .poll(() => countdownVisible(page), { timeout: 25_000 })
    .toBe(false);

  // Type the full passage to completion.
  await finishRace(page);

  // Our lane reaches the finish line. We assert this rather than the
  // room's "finished" state on purpose: a public 1v1 fills the other
  // seat with a bot, and the room only finishes once the bot also
  // crosses — the slowest bot (~42 WPM) takes ~40s on a 25-word race.
  // But no bot can be at 100% this soon after the gun, so a lane at
  // 100% right after we finish typing is unambiguously *ours* — proof
  // the public-lobby race ran end-to-end and our run completed.
  await expect
    .poll(() => maxLaneWidth(page), { timeout: 12_000 })
    .toBeGreaterThanOrEqual(99);
});
