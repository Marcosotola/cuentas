"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { formatMonto } from "@/lib/format";
import type { BillsSummary } from "@/hooks/useBills";

export function SummaryCard({ summary }: { summary: BillsSummary }) {
  const progress = summary.total > 0 ? summary.pagadoTotal / summary.total : 0;

  return (
    <div className="mx-4 mt-2 rounded-3xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.15)]">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Te falta pagar
        </span>
        {summary.vencidasCount > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">
            <AlertTriangle size={12} strokeWidth={2.5} />
            {summary.vencidasCount} vencida{summary.vencidasCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="mt-1 text-[34px] font-bold leading-tight tracking-tight tabular-nums">
        {formatMonto(summary.pendienteTotal)}
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 1) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-surface-muted px-3.5 py-3">
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-success" />
            Pagado
          </span>
          <p className="mt-0.5 text-[16px] font-semibold tabular-nums text-foreground">
            {formatMonto(summary.pagadoTotal)}
          </p>
        </div>
        <div className="rounded-2xl bg-surface-muted px-3.5 py-3">
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Gasto total
          </span>
          <p className="mt-0.5 text-[16px] font-semibold tabular-nums text-foreground">
            {formatMonto(summary.total)}
          </p>
        </div>
      </div>

      <p className="mt-2.5 text-right text-[12px] text-muted-foreground">
        {summary.cantidadPagadas}/{summary.cantidadTotal} cuentas pagadas
      </p>
    </div>
  );
}
