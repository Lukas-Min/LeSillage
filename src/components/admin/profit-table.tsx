import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPHP } from "@/domain/money";
import type { ProfitSummary } from "@/domain/profit";

export interface ProfitRow {
  label: string;
  summary: ProfitSummary;
}

const MONTH = new Intl.DateTimeFormat("en-PH", { month: "long", timeZone: "Asia/Manila" });

/** "October", for the month an instant falls in, in Manila time. */
export function manilaMonthName(instant: Date): string {
  return MONTH.format(instant);
}

/** Sales, cost and profit per period, shared by the dashboard and its loading screen. */
export function ProfitTable({ rows }: { rows: readonly ProfitRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Period</TableHead>
          <TableHead className="text-right">Sales</TableHead>
          <TableHead className="text-right">Cost</TableHead>
          <TableHead className="text-right">Profit</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ label, summary }) => (
          <TableRow key={label}>
            <TableCell>
              <span className="block font-medium">{label}</span>
              <span className="block text-xs text-muted-foreground">
                {summary.orders} order{summary.orders === 1 ? "" : "s"}
              </span>
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatPHP(summary.salesCentavos)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatPHP(summary.costCentavos)}</TableCell>
            <TableCell className="text-right tabular-nums">
              <span className="block font-medium">{formatPHP(summary.profitCentavos)}</span>
              {summary.marginPercent !== null ? (
                <span className="block text-xs text-muted-foreground">{summary.marginPercent}% margin</span>
              ) : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
