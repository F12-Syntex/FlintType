import { expect, test } from "@playwright/test";
import {
  countdownVisible,
  dismissChangelog,
  finishRace,
} from "./helpers";

/** Private lobby — the "race a friend" path. The friend graph (app DB)
 *  and the room store (race authority) live in different places, so the
 *  invite is a `race_invite` notification carrying the lobby slug; the
 *  Join link is just `/race/c/<slug>`. Notifications need auth (out of
 *  reach for keyless E2E), so this exercises the join-link half — exactly
 *  what clicking "Join" on the notification does: a host opens a private
 *  lobby, a *second* browser joins it by URL, the host starts, and both
 *  race to a finish. A 2-human 1v1 fills no bot seats, so the room
 *  finishes as soon as both cross the line. */
test("private lobby: host opens, a second player joins by link, both race", async ({
  page,
  browser,
}) => {
  // ─── Host opens a private lobby ───
  await page.goto("/race");
  await dismissChangelog(page);

  await page.getByRole("button", { name: "Create lobby" }).click();
  // The create panel (popover on desktop) → "Create & invite" spins up
  // the room and navigates the host to /race/c/<slug>.
  await page.getByRole("button", { name: "Create & invite" }).click();

  await page.waitForURL(/\/race\/c\/[^/]+$/, { timeout: 20_000 });
  const slug = page.url().split("/race/c/")[1]!;
  expect(slug.length).toBeGreaterThan(0);

  // Host is in their lobby with the host-only Start control. Two
  // "Start race" affordances render: the action-bar button is a no-op
  // online (the start is server-driven), so the *host-bar* button (the
  // last one in DOM, which fires `race.challenge.start`) is the real
  // one. Click that.
  const hostStart = page.getByRole("button", { name: "Start race" }).last();
  await expect(hostStart).toBeVisible({ timeout: 20_000 });

  // ─── A second player joins by the shared link ───
  const joinerCtx = await browser.newContext();
  const joiner = await joinerCtx.newPage();
  await joiner.goto(`/race/c/${slug}`);
  await dismissChangelog(joiner);

  // Joiner landed on the lobby page (not the expired-link error screen).
  await expect(
    joiner.getByText(new RegExp(`Lobby · ${slug}`, "i")),
  ).toBeVisible({ timeout: 20_000 });
  await expect(
    joiner.getByRole("heading", { name: /expired|already started|couldn't reach/i }),
  ).toHaveCount(0);

  // ─── Host starts; both race ───
  await hostStart.click();

  // Both clients run the 3-2-1 countdown — the joiner getting a countdown
  // is the definitive proof they're a real racer in this room, i.e. both
  // are genuinely in the lobby together.
  await expect.poll(() => countdownVisible(page), { timeout: 20_000 }).toBe(true);
  await expect.poll(() => countdownVisible(joiner), { timeout: 20_000 }).toBe(true);
  await expect.poll(() => countdownVisible(page), { timeout: 20_000 }).toBe(false);
  await expect.poll(() => countdownVisible(joiner), { timeout: 20_000 }).toBe(false);

  // Both type their copy of the passage to completion at a human speed
  // (so the authority records each finish). A 2-human 1v1 fills no bot
  // seats, so once both cross the line the room resolves to finished —
  // the "Race again" CTA only renders at phase === "finished", on BOTH
  // screens. That's the full private-lobby race, end to end.
  await finishRace(page);
  await finishRace(joiner);

  await expect(
    page.getByRole("button", { name: "Race again" }).first(),
  ).toBeVisible({ timeout: 25_000 });
  await expect(
    joiner.getByRole("button", { name: "Race again" }).first(),
  ).toBeVisible({ timeout: 25_000 });

  await joinerCtx.close();
});

/** A dead / unknown lobby slug shows the reframed expired-link copy
 *  ("lobby", not "challenge") with a route back into a race. */
test("private lobby: an unknown slug shows the expired-lobby copy", async ({
  page,
}) => {
  await page.goto("/race/c/this-lobby-does-not-exist");
  await dismissChangelog(page);

  await expect(
    page.getByRole("heading", { name: /this lobby link has expired/i }),
  ).toBeVisible({ timeout: 20_000 });
  // The reframed copy never says "challenge".
  await expect(page.locator("main")).not.toContainText(/challenge/i);
});
