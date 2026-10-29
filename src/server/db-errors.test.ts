import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { createTestDatabase } from "@/db/server/testing";
import { isMissingTable } from "./db-errors";

/** A fresh PGlite database takes a few seconds to boot under load. */
const OWN_DB_TIMEOUT_MS = 30_000;

/** A driver-shaped Postgres error. */
function pgError(code: string, message: string, extra: Record<string, unknown> = {}): Error {
  return Object.assign(new Error(message), { code, ...extra });
}

describe("isMissingTable", () => {
  it("matches 42P01 directly", () => {
    expect(isMissingTable(pgError("42P01", 'relation "test_analyses" does not exist'), "test_analyses")).toBe(true);
  });

  it("matches a bare 42P01 that names no relation", () => {
    expect(isMissingTable({ code: "42P01" }, "test_analyses")).toBe(true);
    expect(isMissingTable({ code: "42P01", table: "test_analyses" }, "test_analyses")).toBe(true);
    expect(isMissingTable({ code: "42P01", table: "tests" }, "test_analyses")).toBe(false);
  });

  it("matches 42P01 wrapped in cause", () => {
    const inner = pgError("42P01", 'relation "test_analyses" does not exist');
    const wrapped = new Error('Failed query: select "test_id" from "test_analyses"', { cause: inner });
    expect(isMissingTable(wrapped, "test_analyses")).toBe(true);
    expect(isMissingTable(new Error("outer", { cause: wrapped }), "test_analyses")).toBe(true);
  });

  it("stops after three levels of cause", () => {
    let err: unknown = pgError("42P01", 'relation "test_analyses" does not exist');
    for (let i = 0; i < 4; i++) err = new Error(`level ${i}`, { cause: err });
    expect(isMissingTable(err, "test_analyses")).toBe(false);
  });

  it("matches the message alone (PGlite) and a schema-qualified name", () => {
    expect(isMissingTable(new Error('relation "test_analyses" does not exist'), "test_analyses")).toBe(true);
    expect(isMissingTable(new Error('relation "public.test_analyses" does not exist'), "test_analyses")).toBe(true);
  });

  it("is false for another table's name", () => {
    expect(isMissingTable(pgError("42P01", 'relation "tests" does not exist'), "test_analyses")).toBe(false);
    expect(isMissingTable(new Error('relation "test_analyses_old" does not exist'), "test_analyses")).toBe(false);
  });

  it("is false for other codes, including a failed query that only mentions the table", () => {
    expect(isMissingTable(pgError("23505", "duplicate key value violates unique constraint"), "test_analyses")).toBe(false);
    expect(isMissingTable(pgError("42703", 'column "diff" does not exist'), "test_analyses")).toBe(false);
    expect(isMissingTable(new Error('Failed query: insert into "test_analyses"'), "test_analyses")).toBe(false);
  });

  it("never throws on null, strings, numbers or hostile objects", () => {
    expect(isMissingTable(null, "test_analyses")).toBe(false);
    expect(isMissingTable(undefined, "test_analyses")).toBe(false);
    expect(isMissingTable('relation "test_analyses" does not exist', "test_analyses")).toBe(false);
    expect(isMissingTable(42, "test_analyses")).toBe(false);
    const hostile = Object.defineProperty({}, "message", {
      get() {
        throw new Error("boom");
      },
    });
    expect(isMissingTable(hostile, "test_analyses")).toBe(false);
    const loop: { cause?: unknown } = {};
    loop.cause = loop;
    expect(isMissingTable(loop, "test_analyses")).toBe(false);
  });

  it("recognises the real error Drizzle and PGlite raise for a dropped table", async () => {
    const { db, close } = await createTestDatabase();
    try {
      await db.$drizzle.execute(sql.raw("DROP TABLE test_analyses"));
      const err = await db.testAnalyses.indexForUser("u1", 5).then(
        () => null,
        (e: unknown) => e,
      );
      expect(err).not.toBeNull();
      expect(isMissingTable(err, "test_analyses")).toBe(true);
      expect(isMissingTable(err, "tests")).toBe(false);
    } finally {
      await close();
    }
  }, OWN_DB_TIMEOUT_MS);
});
