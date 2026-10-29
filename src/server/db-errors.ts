/** Postgres SQLSTATE for undefined_table. */
const UNDEFINED_TABLE = "42P01";
/** How far down an error's `cause` chain to look (Drizzle wraps the
 *  driver's error once in a DrizzleQueryError; leave room for one more). */
const MAX_DEPTH = 3;

const RELATION_MISSING = /relation "([^"]+)" does not exist/;

/** The relation an undefined_table message names, schema prefix removed. */
function missingRelation(message: unknown): string | null {
  if (typeof message !== "string") return null;
  const m = RELATION_MISSING.exec(message);
  if (!m) return null;
  const name = m[1]!;
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1) : name;
}

function matchesOne(err: object, table: string): boolean {
  const e = err as { code?: unknown; message?: unknown; table?: unknown };
  const named = missingRelation(e.message);
  if (named !== null) return named === table;
  // A bare 42P01 that names no relation in its message: trust the
  // driver's own `table` field when it has one.
  if (e.code === UNDEFINED_TABLE) return e.table === undefined || e.table === null || e.table === table;
  return false;
}

/** True when err (or err.cause, recursively up to 3 levels) is Postgres
 *  42P01 undefined_table for `table`, or carries the message
 *  `relation "<table>" does not exist` (PGlite surfaces the message, and
 *  Drizzle wraps it as the cause of a DrizzleQueryError whose own message
 *  is the failed SQL). A message that names another relation is false.
 *  Never throws. */
export function isMissingTable(err: unknown, table: string): boolean {
  let cur: unknown = err;
  for (let depth = 0; depth <= MAX_DEPTH; depth++) {
    if (typeof cur !== "object" || cur === null) return false;
    try {
      if (matchesOne(cur, table)) return true;
      cur = (cur as { cause?: unknown }).cause;
    } catch {
      return false;
    }
  }
  return false;
}
