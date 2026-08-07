"use client";

import { addMonths, format, isSameMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import type { RangeMode } from "@/hooks/useBills";

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function rangeLabel(mode: RangeMode): string {
  const now = new Date();
  switch (mode.type) {
    case "mes":
      return isSameMonth(mode.date, now)
        ? `${capitalize(format(mode.date, "MMMM", { locale: es }))} (actual)`
        : capitalize(format(mode.date, "MMMM yyyy", { locale: es }));
    case "anio":
      return `Año ${format(mode.date, "yyyy")}`;
    case "rango":
      return `${format(mode.start, "d MMM", { locale: es })} — ${format(mode.end, "d MMM yyyy", { locale: es })}`;
    case "todas":
      return "Todas las cuentas";
  }
}

export function MonthNavigator({
  mode,
  onModeChange,
  onOpenFilter,
}: {
  mode: RangeMode;
  onModeChange: (mode: RangeMode) => void;
  onOpenFilter: () => void;
}) {
  const isMonthMode = mode.type === "mes";

  function goPrev() {
    if (mode.type === "mes") onModeChange({ type: "mes", date: subMonths(mode.date, 1) });
  }
  function goNext() {
    if (mode.type === "mes") onModeChange({ type: "mes", date: addMonths(mode.date, 1) });
  }

  return (
    <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-1">
      <button
        type="button"
        onClick={goPrev}
        disabled={!isMonthMode}
        aria-label="Mes anterior"
        className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 transition-colors active:bg-surface-muted disabled:opacity-0"
      >
        <ChevronLeft size={20} />
      </button>

      <motion.div
        key={rangeLabel(mode)}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        drag={isMonthMode ? "x" : false}
        dragElastic={0.35}
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -60) goNext();
          else if (info.offset.x > 60) goPrev();
        }}
        onClick={onOpenFilter}
        className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full py-1.5 text-center active:opacity-70"
      >
        <span className="text-[15px] font-semibold tracking-tight">
          {rangeLabel(mode)}
        </span>
      </motion.div>

      <button
        type="button"
        onClick={isMonthMode ? goNext : onOpenFilter}
        aria-label={isMonthMode ? "Mes siguiente" : "Filtrar"}
        className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 transition-colors active:bg-surface-muted"
      >
        {isMonthMode ? <ChevronRight size={20} /> : <SlidersHorizontal size={18} />}
      </button>
    </div>
  );
}
