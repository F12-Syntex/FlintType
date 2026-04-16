import { defineNamespace, defineRoute } from '@/server';
import {
  tableRowsInputSchema,
  type DatabaseHealth,
  type TableRowsInput,
  type TableRowsOutput,
} from '@/types/admin';

const health = defineRoute<void, DatabaseHealth>({
  handler: async ({ db, log }) => {
    const result = await db.$health.overall();
    log.debug('database health', {
      driver: result.driver,
      databaseBytes: result.databaseBytes,
      tableCount: result.tables.length,
    });
    return result;
  },
});

const rows = defineRoute<TableRowsInput, TableRowsOutput>({
  input: tableRowsInputSchema,
  handler: async ({ input, db }) =>
    db.$health.rows(input.table, input.limit, input.offset),
});

export const database = defineNamespace({
  routes: { health, rows },
});
