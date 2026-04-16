import { sql } from 'drizzle-orm';
import { BackendError } from '@/lib/errors';
import type {
  DatabaseHealth,
  TableRow,
  TableRowsOutput,
  TableStats,
} from '@/types/admin';
import type { DriverMode } from '../driver';
import type { ServerDrizzle } from '../driver';

export type HealthRepo = ReturnType<typeof healthRepo>;

/**
 * Read-only inspection queries against the active Postgres (Neon or PGlite).
 * Used by the `admin.database.*` routes. All queries hit system catalogs that
 * exist on both drivers; stats-specific columns from `pg_stat_user_tables`
 * fall back to 0 if the view is empty or missing on this backend.
 */
export function healthRepo(db: ServerDrizzle, driver: DriverMode) {
  async function listPublicTableNames(): Promise<string[]> {
    const result = await db.execute(sql`
      SELECT table_name AS name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    return extractRows(result).map((r) => String(r.name));
  }

  return {
    overall: async (): Promise<DatabaseHealth> => {
      const [sizeRow] = extractRows(
        await db.execute(sql`
          SELECT COALESCE(pg_database_size(current_database()), 0)::bigint AS bytes
        `),
      );

      const tableRows = extractRows(
        await db.execute(sql`
          SELECT
            t.table_name AS name,
            COALESCE(s.n_live_tup, 0)::bigint AS estimated_rows,
            COALESCE(pg_total_relation_size(c.oid), 0)::bigint AS total_bytes,
            (COALESCE(s.seq_tup_read, 0) + COALESCE(s.idx_tup_fetch, 0))::bigint AS reads,
            (COALESCE(s.n_tup_ins, 0) + COALESCE(s.n_tup_upd, 0) + COALESCE(s.n_tup_del, 0))::bigint AS writes
          FROM information_schema.tables t
          LEFT JOIN pg_class c
            ON c.relname = t.table_name AND c.relkind = 'r'
          LEFT JOIN pg_stat_user_tables s
            ON s.relid = c.oid
          WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
          ORDER BY t.table_name
        `),
      );

      const tables: TableStats[] = tableRows.map((r) => ({
        name: String(r.name),
        estimatedRows: Number(r.estimated_rows ?? 0),
        totalBytes: Number(r.total_bytes ?? 0),
        reads: Number(r.reads ?? 0),
        writes: Number(r.writes ?? 0),
      }));

      return {
        driver,
        databaseBytes: Number(sizeRow?.bytes ?? 0),
        tables,
      };
    },

    rows: async (
      table: string,
      limit = 50,
      offset = 0,
    ): Promise<TableRowsOutput> => {
      const allowed = new Set(await listPublicTableNames());
      if (!allowed.has(table)) {
        throw new BackendError(
          404,
          'NOT_FOUND',
          `table "${table}" is not a public base table`,
          { table },
        );
      }

      const columns = extractRows(
        await db.execute(sql`
          SELECT column_name AS name
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = ${table}
          ORDER BY ordinal_position
        `),
      ).map((r) => String(r.name));

      const ident = sql.identifier(table);
      const rows = extractRows(
        await db.execute(
          sql`SELECT * FROM ${ident} LIMIT ${limit} OFFSET ${offset}`,
        ),
      ) as TableRow[];

      const [totalRow] = extractRows(
        await db.execute(sql`SELECT COUNT(*)::bigint AS count FROM ${ident}`),
      );

      return {
        table,
        columns,
        rows,
        totalRows: Number(totalRow?.count ?? 0),
        limit,
        offset,
      };
    },
  };
}

/**
 * Normalizes the various shapes Drizzle's driver adapters return from
 * `db.execute(sql\`...\`)`. Neon-HTTP and PGlite both expose `.rows`,
 * but some code paths return the array directly.
 */
function extractRows(
  result: unknown,
): Array<Record<string, unknown>> {
  if (Array.isArray(result)) return result as Array<Record<string, unknown>>;
  if (
    result &&
    typeof result === 'object' &&
    'rows' in result &&
    Array.isArray((result as { rows: unknown }).rows)
  ) {
    return (result as { rows: Array<Record<string, unknown>> }).rows;
  }
  return [];
}
