import { z } from 'zod';

export type TableStats = {
  name: string;
  estimatedRows: number;
  totalBytes: number;
  /** Total tuples read via sequential + index scans. */
  reads: number;
  /** Sum of inserts, updates, and deletes. */
  writes: number;
};

export type DatabaseHealth = {
  driver: 'neon' | 'pglite';
  databaseBytes: number;
  tables: TableStats[];
};

export const tableRowsInputSchema = z.object({
  table: z.string().min(1).max(63),
  limit: z.number().int().min(1).max(200).default(50).optional(),
  offset: z.number().int().min(0).default(0).optional(),
});
export type TableRowsInput = z.infer<typeof tableRowsInputSchema>;

export type TableRow = Record<string, unknown>;

export type TableRowsOutput = {
  table: string;
  columns: string[];
  rows: TableRow[];
  totalRows: number;
  limit: number;
  offset: number;
};
