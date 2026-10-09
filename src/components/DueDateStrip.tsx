"use client";

import { formatMonto } from "@/lib/format";
import type { DueDateChip } from "@/lib/dueDates";

const CHIP_STYLES: Record<DueDateChip["tipo"], { box: string; label: string }> = {
  vencidas: { box: "border-danger/25 bg-danger-soft", label: "text-danger" },
  hoy: { box: "border-primary/30 bg-primary-soft", label: "text-primary" },
  proxima: { box: "border-border bg-surface", label: "text-muted-foreground" },
};

export function DueDateStrip({
  chips,
  onSelect,
}: {
  chips: DueDateChip[];
  onSelect: (targetKey: string) => void;
}) {
  if (chips.length === 0) return null;

  return (
    <section className="mt-4" aria-label="Falta pagar por fecha">
      <h2 className="px-4 text-[13px] font-medium text-muted-foreground">Falta pagar por fecha</h2>
      <div className="mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {chips.map((chip) => {
          const styles = CHIP_STYLES[chip.tipo];
          return (
            <button
              key={chip.targetKey + chip.tipo}
              type="button"
              onClick={() => onSelect(chip.targetKey)}
              className={`shrink-0 rounded-2xl border px-3.5 py-2.5 text-left transition-transform active:scale-95 ${styles.box}`}
            >
              <span className={`block text-[12px] font-semibold ${styles.label}`}>
                {chip.label}
              </span>
              <span className="block text-[15px] font-semibold tabular-nums text-foreground">
                {formatMonto(chip.pendiente)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
