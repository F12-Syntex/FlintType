import { test, expect, type Page } from "@playwright/test";
import { PERSONAS, storageStatePath } from "./personas";
import {
  dismissChangelog,
  focusTypingInput,
  countdownVisible,
  finishRace,
} from "../e2e/helpers";

/**
 * Coordinated multi-user "social loop" simulation.
 *
 * One test process holds FOUR signed-in browser contexts (one per persona
 * from sim/.auth/<id>.json), so every emulated user is genuinely "aware of"
 * the others: ember sees flint come online, flint's race invite lands in
 * ember's notification bell, both land in the same lobby, and the authority
 * resolves the shared race for everyone at once.
 *
 * Flow:
 *   1. Warm up — each persona completes a real solo practice run at human
 *      speed (seeds the leaderboard + activity).
 *   2. Befriend — build a fully-connected friend graph (everyone follows
 *      everyone; mutual follows = friends).
 *   3. Lobby + duel — a host opens a private race lobby from a friend's
 *      profile ("Race" → /race/c/<slug>), the friend sees the invite in
 *      their notification bell + the friends-dock challenge badge, joins,
 *      readies up, the host starts, both race to the finish.
 *   4. Observe — assert the milestones (connected state, lobby join,
 *      countdown reaches every racer, the race resolves to FINISHED).
 *
 * Typing always stays under the 500-WPM gross cap (finishRace paces at
 * ~265 WPM; solo runs at 40ms/char ≈ ~300 WPM) so the authority records
 * progress + finishes instead of silently rejecting superhuman keystrokes.
 */

type Console = { persona: string; type: string; text: string };

/** Read the visible practice-passage words off the DOM (the inner block
 *  always carries a translate3d transform; each word renders a trailing
 *  space). */
async function practicePassageWords(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const inner = [...document.querySelectorAll("div")].find((d) =>
      /translate3d/.test(d.getAttribute("style") || ""),
    );
    if (!inner) return [];
    return (inner.textContent || "").trim().split(/\s+/).filter(Boolean);
  });
}

/** Complete one solo practice run at a human speed, leaving the results
 *  screen up (the "Save image" / "Replay" controls render there). */
async function completeSoloRun(page: Page): Promise<void> {
  await page.goto("/");
  await dismissChangelog(page);
  await page.waitForTimeout(600);
  const words = await practicePassageWords(page);
  expect(words.length).toBeGreaterThan(0);
  await focusTypingInput(page);
  // 40ms/char ≈ ~300 WPM gross — fast but under the authority's cap, and
  // there's no authority on the solo surface anyway. A trailing space
  // commits the final word.
  await page.keyboard.type(`${words.join(" ")} `, { delay: 40 });
  // Results screen: the run's stat strip renders RAW / PEAK / CONSISTENCY.
  await expect(page.getByText(/consistency/i).first()).toBeVisible({ timeout: 15_000 });
}

/** If the FollowButton on a friends route gets rate-limited, the page
 *  renders a "Too many requests — retry in Ns" line. Wait it out once so
 *  the next friends call lands. The friends namespace is keyed *per user*
 *  (requireAuth runs before rateLimit → bucket `u:<userId>`, 60/min), and
 *  every profile load also spends that budget on `relationship`/`stats`,
 *  so a chatty session can brush the cap; one backoff clears it. */
async function clearRateLimit(page: Page): Promise<boolean> {
  const limited = page.getByText(/too many requests/i);
  if (!(await limited.count())) return false;
  const m = (await limited.first().innerText()).match(/retry in (\d+)/i);
  const waitS = Math.min(Number(m?.[1] ?? 10), 25);
  await page.waitForTimeout((waitS + 1) * 1000);
  return true;
}

/** Make `viewer` follow `targetId`, tolerating one rate-limit backoff.
 *  Handles every FollowButton state: "Follow" / "Follow back" → click;
 *  already connected ("Friends" / "Following") → no-op. Returns the
 *  connected status label seen after (or "" if none). One profile load +
 *  at most one retry — kept lean so the per-user friends budget holds. */
async function followFrom(viewer: Page, targetId: string): Promise<string> {
  await viewer.goto(`/profile/sim_${targetId}`);
  await dismissChangelog(viewer);
  await viewer.waitForTimeout(400);

  for (let attempt = 0; attempt < 2; attempt++) {
    const followBtn = viewer.getByRole("button", { name: /^Follow$|^Follow back$/ });
    if (!(await followBtn.count())) break; // already connected — nothing to click
    await followBtn.first().click();
    await viewer.waitForTimeout(700);
    if (await clearRateLimit(viewer)) {
      await viewer.reload();
      await dismissChangelog(viewer);
      await viewer.waitForTimeout(400);
      continue;
    }
    break; // follow landed
  }

  const status = viewer.getByRole("button", { name: /^Friends$|^Following$/ }).first();
  return (await status.count()) ? (await status.innerText()).trim() : "";
}

test.describe.configure({ mode: "serial" });

test("social loop: warm up, befriend, then duel — four aware users", async ({
  browser,
}) => {
  // Generous headroom: the per-user friends rate-limit window (60/min)
  // forces deliberate back-off pauses between the chatty befriend phase
  // and the duel, on top of two human-paced races.
  test.setTimeout(280_000);

  const consoleErrors: Console[] = [];
  const pageErrors: Console[] = [];

  // ── Open one signed-in context per persona ──
  const contexts = await Promise.all(
    PERSONAS.map((p) => browser.newContext({ storageState: storageStatePath(p.id) })),
  );
  const pages: Record<string, Page> = {};
  await Promise.all(
    PERSONAS.map(async (p, i) => {
      const page = await contexts[i].newPage();
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push({ persona: p.id, type: "console.error", text: msg.text() });
        }
      });
      page.on("pageerror", (err) => {
        pageErrors.push({ persona: p.id, type: "pageerror", text: err.message });
      });
      pages[p.id] = page;
    }),
  );

  const ember = pages.ember;
  const flint = pages.flint;
  const spark = pages.spark;
  const coal = pages.coal;

  try {
    // ─────────────────────────────────────────────────────────────
    // 1. WARM UP — every persona does a real solo run.
    // ─────────────────────────────────────────────────────────────
    for (const id of ["ember", "flint", "spark", "coal"]) {
      await completeSoloRun(pages[id]);
    }

    // ─────────────────────────────────────────────────────────────
    // 2. BEFRIEND — fully-connected graph (each follows the other 3).
    //    A mutual follow is a friendship; the 12 directed follows make
    //    everyone friends with everyone. The friends namespace is rate
    //    limited 60/min *per user* (requireAuth → bucket u:<id>), and every
    //    profile load also spends that budget on relationship/stats — so a
    //    chatty pass can brush the cap; followFrom() backs off once. The
    //    graph persists in pglite, so reruns mostly find edges already set.
    // ─────────────────────────────────────────────────────────────
    const ids = ["ember", "flint", "spark", "coal"];
    let connected = 0;
    for (const viewer of ids) {
      for (const target of ids) {
        if (viewer === target) continue;
        const status = await followFrom(pages[viewer], target);
        if (/Friends|Following/i.test(status)) connected++;
        await pages[viewer].waitForTimeout(250);
      }
    }
    // Most directed edges resolved to a connected state (Friends/Following).
    expect(connected, `connected edges: ${connected}/12`).toBeGreaterThanOrEqual(6);

    // The friend graph is now visible on the profile counts: flint's hero
    // shows a non-zero friend count (mutual edges).
    await flint.goto("/profile/sim_flint");
    await dismissChangelog(flint);
    await expect(flint.getByText(/[1-9]\d* friends?/i).first()).toBeVisible({ timeout: 15_000 });

    // Let every persona's per-minute friends budget recover before the
    // duel's relationship-heavy profile loads + lobby creation.
    await flint.waitForTimeout(35_000);

    // ─────────────────────────────────────────────────────────────
    // 3. DUEL — flint (host) invites ember from ember's profile.
    //    The hero's friend-only "Race" button opens a private lobby and
    //    navigates the host to /race/c/<slug>, and drops a `race_invite`
    //    notification on the invited friend. The button only renders when
    //    the pair is *mutual* — ember↔flint were just made friends above,
    //    so ensure the edges, then open flint's view of ember and click
    //    Race (tolerating one rate-limit backoff on lobby creation).
    // ─────────────────────────────────────────────────────────────
    await followFrom(flint, "ember");
    await followFrom(ember, "flint");

    // Two equivalent invite affordances on a friend's profile: a direct
    // "Race" button (the sm:+ <InviteToRaceButton>), and the "Friends"
    // status menu → "Invite to a race". Both call createLobbyAndInvite →
    // /race/c/<slug>.
    let slug = "";
    for (let attempt = 0; attempt < 5 && !slug; attempt++) {
      await flint.goto("/profile/sim_ember");
      await dismissChangelog(flint);
      await flint.waitForTimeout(800);

      // The hero's relationship control is hydrated by friends.relationship,
      // which shares flint's per-user friends budget with every other
      // profile call this session. A chatty run can leave the hero showing
      // "Too many requests — retry in Ns" and NO button at all — wait the
      // window out, reload, retry.
      if (await clearRateLimit(flint)) {
        await flint.reload();
        await dismissChangelog(flint);
        await flint.waitForTimeout(800);
      }

      // Scope to the profile hero (main) so we don't grab the friends-dock
      // pill, which is ALSO labelled "Friends" and sits in its own region.
      const hero = flint.locator("main");
      const raceBtn = hero.getByRole("button", { name: /^Race$/ });
      const friendsStatus = hero.getByRole("button", { name: /^Friends$/ });

      if (await raceBtn.count()) {
        await raceBtn.first().click();
      } else if (await friendsStatus.count()) {
        await friendsStatus.first().click();
        const invite = flint.getByRole("menuitem", { name: /invite to a race/i }).first();
        if (await invite.count()) {
          await invite.click();
        } else {
          await flint.keyboard.press("Escape");
          await flint.waitForTimeout(2000);
          continue; // menu didn't render the item — retry the profile load
        }
      } else {
        // Relationship control not hydrated (rate-limit aftermath) — back
        // off and retry the profile load.
        await flint.waitForTimeout(4000);
        continue;
      }

      try {
        await flint.waitForURL(/\/race\/c\/[^/]+$/, { timeout: 15_000 });
        slug = flint.url().split("/race/c/")[1]!;
      } catch {
        // Lobby creation itself rate-limited — wait it out and retry.
        await clearRateLimit(flint);
        await flint.waitForTimeout(2000);
      }
    }
    expect(slug.length, "host should have navigated to /race/c/<slug>").toBeGreaterThan(0);

    // Host is in their lobby (heading "Lobby · <slug>") with the host-only
    // Start control.
    await expect(flint.getByText(new RegExp(`Lobby · ${slug}`, "i"))).toBeVisible({
      timeout: 20_000,
    });

    // ── ember sees the invite in the notification bell ──
    await ember.goto("/");
    await dismissChangelog(ember);
    await ember.waitForTimeout(2500);
    const bell = ember.getByRole("button", { name: /Notifications/i }).first();
    await expect(bell).toBeVisible({ timeout: 10_000 });
    await bell.click();
    // The freshest notification is the race invite; a "Join" link routes to
    // the lobby. (Multiple stale invites can exist across reruns, so we just
    // assert the invite + Join affordance are present, then join by the slug
    // we already hold — exactly what clicking "Join" does.)
    await expect(ember.getByText(/opened a race lobby and invited you/i).first()).toBeVisible({
      timeout: 10_000,
    });
    expect(await ember.getByRole("link", { name: /^Join$/i }).count()).toBeGreaterThan(0);
    await ember.keyboard.press("Escape");

    // ── ember accepts: lands in the same lobby and readies up ──
    await ember.goto(`/race/c/${slug}`);
    await dismissChangelog(ember);
    await expect(ember.getByText(new RegExp(`Lobby · ${slug}`, "i"))).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      ember.getByRole("heading", { name: /expired|already started|couldn't reach/i }),
    ).toHaveCount(0);
    const readyUp = ember.getByRole("button", { name: /ready up/i });
    await expect(readyUp.first()).toBeVisible({ timeout: 15_000 });
    await readyUp.first().click();
    await ember.waitForTimeout(1000);

    // ── host starts; both race ──
    // Two "Start race" affordances render; the host-bar one (last in DOM)
    // fires race.challenge.start. Give the ready-up a beat to propagate.
    const hostStart = flint.getByRole("button", { name: "Start race" }).last();
    await expect(hostStart).toBeVisible({ timeout: 15_000 });
    await flint.waitForTimeout(800);
    await hostStart.click();

    // The 3-2-1 countdown reaching BOTH clients proves they're genuinely in
    // the same room together.
    await expect.poll(() => countdownVisible(flint), { timeout: 20_000 }).toBe(true);
    await expect.poll(() => countdownVisible(ember), { timeout: 20_000 }).toBe(true);
    await expect.poll(() => countdownVisible(flint), { timeout: 20_000 }).toBe(false);
    await expect.poll(() => countdownVisible(ember), { timeout: 20_000 }).toBe(false);

    // Both type their copy to completion at a human speed → the authority
    // records each finish and resolves the 1v1 to its finished state.
    await finishRace(flint);
    await finishRace(ember);

    // ─────────────────────────────────────────────────────────────
    // 4. OBSERVE — the multiplayer finished screen ("RACE FINISHED" +
    //    "Rematch") renders on BOTH clients, with a final standings table.
    // ─────────────────────────────────────────────────────────────
    for (const racer of [flint, ember]) {
      await expect(racer.getByText(/race finished/i).first()).toBeVisible({ timeout: 25_000 });
      await expect(racer.getByRole("button", { name: /^Rematch$/i }).first()).toBeVisible({
        timeout: 25_000,
      });
    }
    // Final standings list both racers.
    await expect(flint.getByText(/@Flint/i).first()).toBeVisible();
    await expect(flint.getByText(/@Ember/i).first()).toBeVisible();
  } finally {
    // Surface any JS errors the contexts logged during the session.
    if (consoleErrors.length || pageErrors.length) {
      console.log("── captured browser errors ──");
      for (const e of [...pageErrors, ...consoleErrors]) {
        console.log(`[${e.persona}] ${e.type}: ${e.text}`);
      }
    } else {
      console.log("no console.error / pageerror captured across the 4 contexts");
    }
    await Promise.all(contexts.map((c) => c.close()));
  }

  // Page-level uncaught errors are a hard failure; noisy console.errors are
  // reported but don't fail the run (third-party/network chatter is common).
  expect(pageErrors, JSON.stringify(pageErrors)).toHaveLength(0);
});
