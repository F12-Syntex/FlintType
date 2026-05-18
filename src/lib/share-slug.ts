/** Slug helpers for shareable run URLs.
 *
 *  A share slug is a friendly URL segment that decorates an opaque
 *  test-id prefix with the runner's handle and WPM so the URL reads
 *  as the artifact:
 *
 *      /share/saif-92wpm-a3f9c0d1
 *
 *  The trailing 8-hex-char segment is the only piece the server cares
 *  about — everything left of the last `-` is decoration and can be
 *  rewritten freely (different handle, different wpm) without breaking
 *  the link. This keeps the link stable when a user later changes
 *  their Clerk username while still letting the slug *look* personal
 *  at share time. */

/** First N hex chars of a UUIDv4 testId — 4 billion combinations, more
 *  than enough disambiguation for any plausible flinttype scale. */
const SHORT_ID_LEN = 8;

/** Lowercase, ASCII-only, hyphen-joined identifier safe for URL
 *  segments. Strips a leading `@`, collapses runs of non-ASCII chars
 *  to a single hyphen, trims edges. Empty input returns "run" so a
 *  pathological handle never produces an empty slug head. */
function slugifyHandle(handle: string): string {
  const stripped = handle.replace(/^@/, "").toLowerCase();
  const ascii = stripped
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return ascii || "run";
}

/** Build the friendly slug for a shareable run. The trailing 8 hex
 *  chars come from the testId UUID; the slug head is the runner's
 *  handle + rounded WPM so a glance at the URL conveys whose run it
 *  is and how fast.
 *
 *  `handle` may include or omit the leading `@`. `wpm` is rounded to
 *  the nearest integer (a slug of `91.6wpm` would read wrong).
 *  `testId` is the full server-minted UUID. */
export function buildShareSlug(input: {
  handle: string;
  wpm: number;
  testId: string;
}): string {
  const head = slugifyHandle(input.handle);
  const wpm = Math.max(0, Math.round(input.wpm));
  const short = input.testId.replace(/-/g, "").slice(0, SHORT_ID_LEN);
  return `${head}-${wpm}wpm-${short}`;
}

/** Extract the test-id prefix from a share slug. The contract is the
 *  inverse of `buildShareSlug` — take the last `-`-separated segment.
 *
 *  Backward-compat: visitors hitting an old `/r/<full-uuid>` URL still
 *  resolve because UUIDs themselves contain `-` separators in the
 *  format `8-4-4-4-12`; the parser takes the trailing 12-char chunk,
 *  which is a valid id-prefix lookup the repo can still satisfy.
 *
 *  Hex-only enforcement is deliberate — without it a malformed slug
 *  whose tail happens to be alphabetical (`foo-bar-baz`) would issue
 *  a `LIKE 'baz%'` query that scans the whole tests table. Returns
 *  null when the tail isn't a hex prefix so the caller can 404 cleanly. */
export function parseShareSlug(slug: string): string | null {
  if (!slug) return null;
  const idx = slug.lastIndexOf("-");
  const tail = idx === -1 ? slug : slug.slice(idx + 1);
  if (!/^[0-9a-f]+$/i.test(tail)) return null;
  return tail.toLowerCase();
}
