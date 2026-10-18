"use client";

import Link from "next/link";
import { SimpleTable } from "@/components/admin/simple-table";
import { Money } from "@/components/crm/money";
import { useAgentName } from "@/lib/data";
import { formatAddress, formatDate } from "@/lib/format";
import type { DealRow } from "./deals-data";

/**
 * Closed deals. `showAgent` adds the agent column (admin); `onOpen` makes rows editable (admin).
 * Agents see "my share" instead of the office split.
 */
export function DealsTable({
  deals,
  showAgent,
  onOpen,
}: {
  deals: DealRow[];
  showAgent?: boolean;
  onOpen?: (deal: DealRow) => void;
}) {
  const agentName = useAgentName();
  return (
    <SimpleTable
      rows={deals}
      onRowClick={(d) => onOpen?.(d)}
      columns={[
        { header: "תאריך", cell: (d) => formatDate(d.closed_on), className: "tabular-nums" },
        ...(showAgent ? [{ header: "סוכן", cell: (d: DealRow) => agentName(d.agent_id) }] : []),
        {
          header: "נכס",
          cell: (d) =>
            d.properties ? (
              <Link href={`/properties?open=${d.properties.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                {formatAddress(d.properties)}, {d.properties.city}
              </Link>
            ) : (
              <span className="text-muted-foreground">—</span>
            ),
        },
        { header: "קונה", cell: (d) => d.buyers?.full_name ?? <span className="text-muted-foreground">—</span> },
        { header: "עמלה", cell: (d) => <Money value={Number(d.commission_amount)} className="font-semibold" /> },
        { header: "אחוז", cell: (d) => <span className="tabular-nums">{Number(d.agent_percent)}%</span> },
        {
          header: showAgent ? "לסוכן" : "החלק שלי",
          cell: (d) => <Money value={Number(d.agent_amount)} className="font-semibold text-primary" />,
        },
        ...(showAgent
          ? [{ header: "למשרד", cell: (d: DealRow) => <Money value={Number(d.office_amount)} className="font-semibold text-emerald-700" /> }]
          : []),
      ]}
    />
  );
}
