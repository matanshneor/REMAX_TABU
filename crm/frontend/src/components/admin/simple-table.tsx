"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type Column<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
};

/** Clickable data table used by the admin screens. */
export function SimpleTable<T extends { id: string }>({
  rows,
  columns,
  selectedId,
  onRowClick,
}: {
  rows: T[];
  columns: Column<T>[];
  selectedId?: string | null;
  onRowClick: (row: T) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-card">
      <Table className="[&_td]:py-3 [&_th]:h-11 [&_th]:text-xs [&_th]:font-semibold [&_th]:text-muted-foreground">
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {columns.map((c, i) => (
              <TableHead key={c.header} className={cn(i === 0 && "ps-4", i === columns.length - 1 && "pe-4", c.className)}>
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              onClick={() => onRowClick(row)}
              className={cn(
                "cursor-pointer transition-colors hover:bg-secondary/50",
                selectedId === row.id && "bg-primary/5 shadow-[inset_-3px_0_0_var(--primary)]",
              )}
            >
              {columns.map((c, i) => (
                <TableCell key={c.header} className={cn(i === 0 && "ps-4 font-medium", i === columns.length - 1 && "pe-4", c.className)}>
                  {c.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
