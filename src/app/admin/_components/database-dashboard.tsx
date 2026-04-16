'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useBackend } from '@/lib/backend';
import { useAsyncAction } from '@/lib/use-async-action';
import type { DatabaseHealth, TableRowsOutput, TableStats } from '@/types/admin';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = bytes / 1024;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[i]}`;
}

function formatCellValue(v: unknown): string {
  if (v === null) return 'null';
  if (v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function DatabaseDashboard() {
  const backend = useBackend();
  const healthAction = useAsyncAction(() => backend.admin.database.health());
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    healthAction.run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="flex flex-col gap-6 sm:gap-8">
      <OverviewCard action={healthAction} onSelect={setSelected} />
      {selected && (
        <TableExplorer
          table={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

function OverviewCard({
  action,
  onSelect,
}: {
  action: ReturnType<typeof useAsyncAction<DatabaseHealth>>;
  onSelect: (name: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          overview
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={action.run}
          disabled={action.loading}
          aria-busy={action.loading}
        >
          {action.loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {action.result && !action.result.ok && (
        <p className="text-sm text-red-600 dark:text-red-400">
          [{action.result.code}] {action.result.message}
        </p>
      )}

      {action.result?.ok && (
        <>
          <div className="flex flex-wrap gap-4 text-sm sm:gap-6">
            <Stat label="Driver" value={action.result.data.driver} />
            <Stat
              label="Database size"
              value={formatBytes(action.result.data.databaseBytes)}
            />
            <Stat
              label="Tables"
              value={String(action.result.data.tables.length)}
            />
          </div>
          <TablesList tables={action.result.data.tables} onSelect={onSelect} />
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-base text-zinc-950 dark:text-zinc-50">{value}</span>
    </div>
  );
}

function TablesList({
  tables,
  onSelect,
}: {
  tables: TableStats[];
  onSelect: (name: string) => void;
}) {
  if (tables.length === 0) {
    return <p className="text-sm text-zinc-500">No tables yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800">
            <th className="py-2 pr-3 font-medium">Table</th>
            <th className="py-2 pr-3 font-medium">Rows</th>
            <th className="py-2 pr-3 font-medium">Size</th>
            <th className="py-2 pr-3 font-medium">Reads</th>
            <th className="py-2 pr-3 font-medium">Writes</th>
            <th className="py-2 pr-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {tables.map((t) => (
            <tr
              key={t.name}
              className="border-b border-zinc-100 last:border-none dark:border-zinc-900"
            >
              <td className="py-2 pr-3 font-mono text-zinc-950 dark:text-zinc-50">
                {t.name}
              </td>
              <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-400">
                {t.estimatedRows.toLocaleString()}
              </td>
              <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-400">
                {formatBytes(t.totalBytes)}
              </td>
              <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-400">
                {t.reads.toLocaleString()}
              </td>
              <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-400">
                {t.writes.toLocaleString()}
              </td>
              <td className="py-2 pr-3 text-right">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSelect(t.name)}
                >
                  View rows
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const PAGE_SIZE = 50;

function TableExplorer({
  table,
  onClose,
}: {
  table: string;
  onClose: () => void;
}) {
  const backend = useBackend();
  const [offset, setOffset] = useState(0);
  const action = useAsyncAction<TableRowsOutput>(() =>
    backend.admin.database.rows({ table, limit: PAGE_SIZE, offset }),
  );

  useEffect(() => {
    action.run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, offset]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          <span className="font-mono normal-case tracking-normal text-zinc-950 dark:text-zinc-50">
            {table}
          </span>
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={offset === 0 || action.loading}
          >
            Prev
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={
              action.loading ||
              !action.result?.ok ||
              offset + PAGE_SIZE >= action.result.data.totalRows
            }
          >
            Next
          </Button>
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {action.result && !action.result.ok && (
        <p className="text-sm text-red-600 dark:text-red-400">
          [{action.result.code}] {action.result.message}
        </p>
      )}

      {action.result?.ok && (
        <>
          <p className="text-xs text-zinc-500">
            Showing rows {offset + 1}&ndash;
            {Math.min(offset + PAGE_SIZE, action.result.data.totalRows)} of{' '}
            {action.result.data.totalRows.toLocaleString()}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-left uppercase tracking-wider text-zinc-500 dark:border-zinc-800">
                  {action.result.data.columns.map((col) => (
                    <th key={col} className="py-2 pr-3 font-medium">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {action.result.data.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={action.result.data.columns.length}
                      className="py-3 text-zinc-500"
                    >
                      No rows.
                    </td>
                  </tr>
                ) : (
                  action.result.data.rows.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-zinc-100 last:border-none dark:border-zinc-900"
                    >
                      {action.result!.ok &&
                        action.result!.data.columns.map((col) => (
                          <td
                            key={col}
                            className="max-w-xs truncate py-2 pr-3 font-mono text-zinc-600 dark:text-zinc-400"
                            title={formatCellValue(row[col])}
                          >
                            {formatCellValue(row[col])}
                          </td>
                        ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {action.loading && !action.result && (
        <p className="text-sm text-zinc-500">Loading…</p>
      )}
    </div>
  );
}
