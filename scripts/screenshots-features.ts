/**
 * screenshots:features
 * ----------------------------------------------------------------------------
 * Captures Upwork-ready, demo-data-populated screenshots of every flinttype
 * feature surface, at a clean 1440x900 desktop viewport (no zoom, no mobile
 * crop).
 *
 * How it works (no new npm dependency — drives the global `playwright-cli`):
 *  1. Ensures a demo Clerk user exists (idempotent) via the Clerk Backend API,
 *     using the secret key from `.env.local`. Uploads a tasteful avatar.
 *  2. Mints a one-shot Clerk *sign-in token* (ticket) for that user.
 *  3. Opens a browser and, inside a single Playwright automation, signs in
 *     through `window.Clerk` (no fragile form selectors, bypasses the
 *     instance's MFA), installs network mocks for the data-backed routes so
 *     every surface shows rich, deterministic demo data, hides promo chrome,
 *     then navigates each feature route and writes a PNG.
 *
 * The whole browser session runs in ONE `run-code` call so the route mocks
 * stay active across every navigation (a route registered in one CLI call does
 * not carry to the next).
 *
 * Prereqs: dev server running (`yarn dev`); `.env.local` carries a Clerk *test*
 * secret key (sk_test_…). Run: `yarn screenshots:features`.
 *
 * Dev-only tooling. Never ships to the client bundle.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const BASE_URL = (process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const SESSION = "ftshots";
const OUT_DIR = resolve(ROOT, "screenshots/features");
const TMP_DIR = resolve(ROOT, ".playwright");
const VIEWPORT = { width: 1440, height: 900 };

// Stable demo identity. The `+clerk_test` local-part puts Clerk's dev instance
// in test mode for this address (fixed OTP, no real email, no bot check).
const DEMO = {
  email: "demo+clerk_test@flinttype.app",
  username: "flint_demo",
  firstName: "Alex",
  lastName: "Quill",
  password: "Demo-Flint-2026!xyz",
} as const;

const log = (...m: unknown[]) => console.log("[screenshots]", ...m);

// ─── Clerk Backend API (REST — no SDK import) ───────────────────────────────

function clerkSecret(): string {
  let raw = "";
  try {
    raw = readFileSync(resolve(ROOT, ".env.local"), "utf8");
  } catch {
    throw new Error("Missing .env.local — need a Clerk test secret key (sk_test_…).");
  }
  for (const line of raw.split(/\r?\n/)) {
    if (line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    if (line.slice(0, i).trim() === "CLERK_SECRET_KEY") return line.slice(i + 1).trim();
  }
  throw new Error("CLERK_SECRET_KEY not found in .env.local.");
}

async function clerk(path: string, init: RequestInit, sk: string): Promise<any> {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${sk}`, ...(init.headers ?? {}) },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`Clerk ${path} → ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  return body;
}

async function ensureDemoUser(sk: string): Promise<string> {
  const found = await clerk(`/users?email_address=${encodeURIComponent(DEMO.email)}`, {}, sk);
  const list = Array.isArray(found) ? found : (found?.data ?? []);
  if (list[0]) {
    log(`demo user exists: ${list[0].id} (@${list[0].username ?? "?"})`);
    return list[0].id;
  }
  const created = await clerk(
    "/users",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email_address: [DEMO.email],
        password: DEMO.password,
        username: DEMO.username,
        first_name: DEMO.firstName,
        last_name: DEMO.lastName,
        skip_password_checks: true,
      }),
    },
    sk,
  );
  log(`created demo user: ${created.id}`);
  return created.id;
}

/** Best-effort: give the demo user a clean avatar so chrome + profile match. */
async function ensureAvatar(userId: string, sk: string): Promise<string | null> {
  try {
    const png = await fetch(
      "https://api.dicebear.com/9.x/notionists/png?seed=AlexQuill&size=400&backgroundColor=f0ebe0",
    ).then((r) => r.arrayBuffer());
    const fd = new FormData();
    fd.append("file", new Blob([png], { type: "image/png" }), "avatar.png");
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}/profile_image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sk}` },
      body: fd,
    });
    const body = await res.json();
    const url = body?.image_url ?? null;
    log(url ? "avatar uploaded" : "avatar upload returned no url");
    return url;
  } catch (e) {
    log("avatar upload skipped:", (e as Error).message);
    return null;
  }
}

async function mintTicket(userId: string, sk: string): Promise<string> {
  const body = await clerk(
    "/sign_in_tokens",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: userId }) },
    sk,
  );
  return body.token as string;
}

// ─── Demo data (typed against src/types/*) ──────────────────────────────────

function buildMocks(userId: string, avatarUrl: string | null) {
  const now = Date.now();
  const DAY = 86_400_000;

  // ~140 completed runs across ~80 days, WPM trending up — fills the activity
  // heatmap, daily chart, skill radar, level/XP, and PB records.
  const recentTests: Record<string, unknown>[] = [];
  let id = 0;
  for (let d = 0; d < 80; d++) {
    const runs = d % 5 === 0 ? 0 : 1 + (d % 3); // some rest days
    for (let r = 0; r < runs; r++) {
      const t = now - d * DAY - r * 90 * 60_000;
      const trend = 96 + (80 - d) * 0.62; // climbs toward ~145 recently
      const wpm = Math.round(trend + (Math.sin(id * 1.7) * 9 + (id % 4) * 2.3));
      const len = [25, 50, 100, 15, 30, 60][id % 6];
      recentTests.push({
        id: `t_${id}`,
        startedAtMs: t - 30_000,
        completedAtMs: t,
        mode: id % 4 === 0 ? "casual" : "training",
        durationOrWordCount: len,
        wpm,
        accuracy: Math.round((94 + (id % 6) + Math.sin(id) * 1.5) * 10) / 10,
        errorCount: id % 7,
        wasCompleted: id % 17 !== 0,
      });
      id++;
    }
  }

  const pairs: [string, number, number, number][] = [
    ["br", 312, 2.21, 84], ["ws", 298, 2.1, 52], ["ki", 276, 1.94, 61],
    ["mn", 271, 1.88, 33], ["gh", 265, 1.82, 77], ["pl", 258, 1.74, 49],
    ["cy", 251, 1.69, 28], ["xt", 247, 1.63, 41], ["qu", 240, 1.55, 36],
    ["vr", 236, 1.5, 22], ["nf", 231, 1.44, 55], ["lk", 228, 1.4, 38],
  ];
  const tris: [string, number, number, number][] = [
    ["tch", 512, 2.11, 44], ["ght", 498, 1.98, 51], ["str", 476, 1.86, 63],
    ["scr", 461, 1.74, 29], ["thr", 449, 1.69, 58], ["spl", 437, 1.6, 33],
    ["nks", 428, 1.52, 41], ["mpt", 419, 1.46, 26], ["xpl", 408, 1.4, 22],
    ["rld", 399, 1.35, 37], ["chr", 391, 1.3, 31], ["dth", 384, 1.26, 28],
  ];
  const words = [
    "rhythm", "awkward", "minimum", "liquid", "journey", "sphinx", "quartz", "plywood",
    "beyond", "wizard", "frequency", "subtle", "yacht", "zephyr", "crypt", "glyph",
    "vexing", "juxtapose", "mnemonic", "kayak",
  ];
  const mk = (rows: [string, number, number, number][]) =>
    rows.map(([key, meanMs, weakness, sampleCount]) => ({ key, meanMs, weakness, sampleCount }));

  const summary = {
    recentTests,
    weakestPairs: mk(pairs),
    weakestTrigrams: mk(tris),
    weakestWords: words.map((w, i) => ({
      key: w, meanMs: 540 - i * 7, weakness: Math.round((2.3 - i * 0.07) * 100) / 100, sampleCount: 60 - i * 2,
    })),
    cold: false,
    bigramBaselineMs: 142,
    trigramBaselineMs: 238,
    wordBaselineMs: 372,
    monkeytype: null,
    tags: ["owner", "og"],
    eligibleTags: ["owner", "og"],
    rank: "wildfire",
    subjectAvatarUrl: avatarUrl,
    subjectUserId: userId,
    lifetimeStats: { drillsCompleted: 137, racesFinished: 58, racesWon: 23 },
  };

  // Leaderboard — creative names, organic WPMs, demo user mid-table for the
  // "you" highlight row.
  const people: [string, string, string[]][] = [
    ["Mara Vexley", "maravexley", ["owner"]], ["Tobias Renn", "tobiasrenn", []],
    ["Priya Anand", "priyaanand", ["og"]], ["Kenji Saito", "kenjisaito", []],
    ["Lena Brandt", "lenabrandt", ["og"]], ["Diego Costa", "diegocosta", []],
    ["Alex Quill", DEMO.username, ["owner", "og"]], ["Yusuf Demir", "yusufdemir", []],
    ["Nora Iqbal", "noraiqbal", ["og"]], ["Sven Aalto", "svenaalto", []],
    ["Camille Roy", "camilleroy", []], ["Hana Okafor", "hanaokafor", ["og"]],
    ["Milos Petrov", "milospetrov", []], ["Ines Duarte", "inesduarte", []],
    ["Omar Haddad", "omarhaddad", []], ["Greta Lindqvist", "gretalindqvist", []],
    ["Rafael Mota", "rafaelmota", []], ["Suki Tanaka", "sukitanaka", []],
    ["Bram de Vries", "bramdevries", []], ["Aisha Bello", "aishabello", []],
  ];
  const entries = people.map((p, i) => {
    const wpm = 196 - i * 4 - (i % 3);
    const accuracy = Math.round((99.4 - i * 0.18) * 10) / 10;
    return {
      testId: `lb_${i}`,
      rank: i + 1,
      userId: p[1] === DEMO.username ? userId : `user_demo_${i}`,
      name: p[0],
      username: p[1],
      tags: p[2],
      netWpm: Math.round(wpm * (accuracy / 100)),
      wpm,
      accuracy,
      mode: i % 3 === 0 ? "casual" : "training",
      durationOrWordCount: [50, 25, 100, 30][i % 4],
      completedAtMs: now - i * 1_900_000,
    };
  });
  const leaderboard = { scope: "all", window: "all_time", preset: "any", entries, generatedAtMs: now };

  const topPlayers = {
    players: people.slice(0, 12).map((p, i) => ({
      rank: i + 1,
      userId: p[1] === DEMO.username ? userId : `user_demo_${i}`,
      username: p[1], name: p[0], tags: p[2],
      bestNetWpm: 188 - i * 6, bestWpm: 196 - i * 6,
      bestAccuracy: Math.round((99.5 - i * 0.2) * 10) / 10,
      testsCompleted: 420 - i * 23,
    })),
    generatedAtMs: now,
  };
  const topByLevel = {
    players: people.slice(0, 12).map((p, i) => {
      const tests = 520 - i * 28;
      return {
        rank: i + 1,
        userId: p[1] === DEMO.username ? userId : `user_demo_${i}`,
        username: p[1], name: p[0], tags: p[2],
        xp: tests * 25,
        level: Math.max(1, Math.floor((tests * 25) / 600)),
        xpIntoLevel: (tests * 25) % 600,
        levelProgress: ((tests * 25) % 600) / 600,
        testsCompleted: tests,
      };
    }),
    generatedAtMs: now,
  };

  const part = (uid: string, uname: string | null, name: string, tags: string[] = []) => ({ userId: uid, username: uname, name, tags });
  const me = part(userId, DEMO.username, "Alex Quill", ["owner", "og"]);
  const duelWords = "the quick study found a steady rhythm and kept the pace through every word".split(" ");
  const duels = {
    incoming: [{
      id: "d_in_1", challenger: part("user_demo_0", "maravexley", "Mara Vexley", ["owner"]), opponent: me,
      words: duelWords, mode: "training", durationOrWordCount: 25,
      challengerWpm: 152, challengerAccuracy: 98.2, challengerWpmHistory: [60, 110, 138, 149, 152],
      status: "pending", opponentWpm: null, opponentAccuracy: null, createdAtMs: now - 2_400_000, completedAtMs: null,
    }],
    outgoing: [{
      id: "d_out_1", challenger: me, opponent: part("user_demo_3", "kenjisaito", "Kenji Saito"),
      words: duelWords, mode: "training", durationOrWordCount: 25,
      challengerWpm: 144, challengerAccuracy: 97.6, challengerWpmHistory: [55, 102, 130, 141, 144],
      status: "completed", opponentWpm: 131, opponentAccuracy: 96.1, createdAtMs: now - 26_000_000, completedAtMs: now - 25_000_000,
    }],
  };

  const notifications = {
    unreadCount: 3,
    items: [
      { id: "n1", kind: "personal_best", title: "New personal best", body: "152 wpm on words · 50", createdAtMs: now - 600_000, readAtMs: null, data: { mode: "training", durationOrWordCount: 50, wpm: 152, accuracy: 98.4, previousWpm: 147 } },
      { id: "n2", kind: "mutual", title: "You're now friends", body: "with Priya Anand", createdAtMs: now - 5_400_000, readAtMs: null, data: { friendId: "user_demo_2", friendName: "Priya Anand", friendUsername: "priyaanand" } },
      { id: "n3", kind: "follow", title: "New follower", body: "Tobias Renn followed you", createdAtMs: now - 9_000_000, readAtMs: null, data: { followerId: "user_demo_1", followerName: "Tobias Renn", followerUsername: "tobiasrenn" } },
      { id: "n4", kind: "friend_pb", title: "Mara Vexley set a PB", body: "188 wpm on words · 25", createdAtMs: now - 90_000_000, readAtMs: now - 80_000_000, data: { friendId: "user_demo_0", friendName: "Mara Vexley", friendUsername: "maravexley", mode: "training", durationOrWordCount: 25, wpm: 188, accuracy: 99.1 } },
      { id: "n5", kind: "og_granted", title: "Founding member", body: "You're one of the first to join flinttype", createdAtMs: now - 600_000_000, readAtMs: now - 500_000_000, data: { seq: 312, milestoneLimit: 1000 } },
    ],
  };

  const friendsStats = { userId, followers: 182, following: 97, friends: 54 };

  return {
    "history/summary": summary,
    "leaderboard/list": leaderboard,
    "leaderboard/topPlayers": topPlayers,
    "leaderboard/topByLevel": topByLevel,
    "duels/list": duels,
    "notifications/list": notifications,
    "friends/stats": friendsStats,
  } as Record<string, unknown>;
}

// ─── Shot list ──────────────────────────────────────────────────────────────
// `action` is a JS statement body (has `page` in scope) run after navigation,
// before the screenshot — for interactions like opening the dock or typing.

type Shot = { name: string; url: string; wait?: number; action?: string };

const SHOTS: Shot[] = [
  { name: "01-practice", url: "/", wait: 1600 },
  { name: "02-appearance", url: "/customise/appearance", wait: 2000 },
  { name: "03-themes", url: "/customise/appearance/themes", wait: 2000 },
  { name: "04-behaviour", url: "/customise/behaviour", wait: 1800 },
  { name: "05-leaderboard", url: "/leaderboard", wait: 2000 },
  { name: "06-profile", url: "/profile", wait: 2400 },
  { name: "07-insights", url: "/insights", wait: 2400 },
  { name: "08-drills", url: "/drills", wait: 2000 },
  { name: "09-duels", url: "/duels", wait: 1800 },
  { name: "10-race", url: "/race", wait: 1800 },
  {
    name: "11-friends-dock", url: "/leaderboard", wait: 1800,
    action: `await page.locator('button[aria-label="Friends"]').first().click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(1200);`,
  },
  {
    name: "12-notifications", url: "/leaderboard", wait: 1500,
    action: `await page.locator('button[aria-label*="otification" i]').first().click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(900);`,
  },
  {
    name: "13-results", url: "/", wait: 1500,
    action: `
      await page.waitForTimeout(700);
      const words = await page.evaluate(() => {
        const root = document.querySelector('[role="status"]');
        if (!root) return [];
        return Array.from(root.querySelectorAll('span.whitespace-nowrap'))
          .map((s) => (s.textContent || '').trim()).filter(Boolean).slice(0, 26);
      });
      if (words.length) {
        await page.mouse.click(720, 360);
        for (const w of words) { await page.keyboard.type(w, { delay: 58 }); await page.keyboard.press('Space'); await page.waitForTimeout(35); }
        await page.waitForTimeout(2400);
      }
    `,
  },
];

// ─── One self-contained Playwright automation ───────────────────────────────
// Everything runs in a single run-code call so the route mocks stay active
// across every navigation.

function buildAutomation(ticket: string, mocks: Record<string, unknown>): string {
  const shotsJs = SHOTS.map((s) => {
    const action = s.action ? `, action: async (page) => { ${s.action} }` : "";
    return `{ name: ${JSON.stringify(s.name)}, url: ${JSON.stringify(s.url)}, wait: ${s.wait ?? 1500}${action} }`;
  }).join(",\n    ");

  return `async page => {
  const BASE = ${JSON.stringify(BASE_URL)};
  const OUT = ${JSON.stringify(OUT_DIR.replace(/\\\\/g, "/"))};
  const VP = ${JSON.stringify(VIEWPORT)};
  const TICKET = ${JSON.stringify(ticket)};
  const MOCKS = ${JSON.stringify(mocks)};
  const SHOTS = [
    ${shotsJs}
  ];

  await page.setViewportSize(VP);
  // Hide the Discord promo banner on every page so portfolio shots stay clean.
  await page.addInitScript(() => {
    try {
      const s = document.createElement('style');
      s.textContent = '[data-ft-banner="discord"]{display:none !important}';
      (document.head || document.documentElement).appendChild(s);
    } catch (e) {}
  });
  // Mock the data-backed routes; everything else hits the real (signed-in) backend.
  await page.route('**/api/**', async (route) => {
    try {
      const u = new URL(route.request().url());
      const key = u.pathname.replace(/^\\/api\\//, '');
      if (u.host.startsWith('localhost') && Object.prototype.hasOwnProperty.call(MOCKS, key)) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCKS[key]) });
      }
    } catch (e) {}
    return route.continue();
  });

  // Sign in via Clerk ticket (skips MFA + form selectors).
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Clerk && window.Clerk.loaded, { timeout: 25000 }).catch(() => {});
  const signin = await page.evaluate(async (ticket) => {
    const c = window.Clerk;
    try {
      if (c.user) return { ok: true, already: true };
      const si = await c.client.signIn.create({ strategy: 'ticket', ticket });
      await c.setActive({ session: si.createdSessionId });
      return { ok: !!c.user, user: c.user && c.user.id };
    } catch (e) { return { ok: false, err: e && e.errors ? JSON.stringify(e.errors) : String(e && e.message || e) }; }
  }, TICKET);
  await page.waitForTimeout(900);
  // Close any first-run "what's new" dialog so it doesn't block shots.
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(200);

  const results = [];
  for (const shot of SHOTS) {
    try {
      await page.goto(BASE + shot.url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(shot.wait || 1500);
      if (shot.action) await shot.action(page);
      await page.waitForTimeout(300);
      await page.screenshot({ path: OUT + '/' + shot.name + '.png' });
      results.push(shot.name + ':ok');
    } catch (e) {
      results.push(shot.name + ':ERR ' + (e && e.message || e));
    }
  }
  return JSON.stringify({ signin, results });
}`;
}

// ─── playwright-cli orchestration ───────────────────────────────────────────

function pw(args: string, { quiet = false } = {}): string {
  const r = spawnSync(`npx --no-install playwright-cli -s=${SESSION} ${args}`, {
    shell: true,
    encoding: "utf8",
    cwd: ROOT,
    maxBuffer: 64 * 1024 * 1024,
  });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  if (r.status !== 0 && !quiet) log(`  ! playwright-cli exit ${r.status}: ${out.trim().slice(-300)}`);
  return out;
}

async function main() {
  log(`base ${BASE_URL} · viewport ${VIEWPORT.width}x${VIEWPORT.height}`);
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(TMP_DIR, { recursive: true });

  try {
    const ping = await fetch(`${BASE_URL}/landing`, { redirect: "manual" });
    if (ping.status >= 500) throw new Error(`status ${ping.status}`);
  } catch (e) {
    throw new Error(`Dev server not reachable at ${BASE_URL} — run \`yarn dev\` first. (${(e as Error).message})`);
  }

  const sk = clerkSecret();
  if (!sk.startsWith("sk_")) throw new Error("CLERK_SECRET_KEY doesn't look like a Clerk key.");
  const userId = await ensureDemoUser(sk);
  const avatarUrl = await ensureAvatar(userId, sk);
  const ticket = await mintTicket(userId, sk);
  const mocks = buildMocks(userId, avatarUrl);

  const file = resolve(TMP_DIR, "ftshots-run.mjs");
  writeFileSync(file, buildAutomation(ticket, mocks), "utf8");

  pw("close", { quiet: true }); // clear any stale session
  log("opening browser…");
  pw(`open --browser=chrome "${BASE_URL}/"`);
  log("running automation (sign-in, mocks, all shots)…");
  const out = pw(`run-code --filename="${file}"`);
  pw("close", { quiet: true });

  // Surface the automation's JSON summary.
  const m = out.match(/\{"signin".*\}/);
  if (m) {
    try {
      const parsed = JSON.parse(m[0]);
      log(parsed.signin?.ok ? "signed in ✓" : `sign-in: ${JSON.stringify(parsed.signin)}`);
      for (const r of parsed.results as string[]) log(`  ${r.endsWith(":ok") ? "✓" : "✗"} ${r}`);
      const ok = (parsed.results as string[]).filter((r) => r.endsWith(":ok")).length;
      log(`done — ${ok}/${SHOTS.length} screenshots in screenshots/features/`);
    } catch {
      log("automation finished; could not parse summary. Tail:", out.trim().slice(-400));
    }
  } else {
    log("automation finished; no summary found. Tail:", out.trim().slice(-500));
  }
}

main().catch((e) => {
  console.error("[screenshots] FAILED:", e instanceof Error ? e.message : e);
  pw("close", { quiet: true });
  process.exit(1);
});
