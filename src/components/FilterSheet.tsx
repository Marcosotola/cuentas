"use client";

import { useState } from "react";
import { format } from "date-fns";
import { BottomSheet } from "./BottomSheet";
import type { RangeMode } from "@/hooks/useBills";

function toDateInputValue(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function parseDateInputValue(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

const QUICK_OPTIONS: { key: string; label: string; build: () => RangeMode }[] = [
  { key: "mes", label: "Mes actual", build: () => ({ type: "mes", date: new Date() }) },
  { key: "anio", label: "Año actual", build: () => ({ type: "anio", date: new Date() }) },
  { key: "todas", label: "Todas las cuentas", build: () => ({ type: "todas" }) },
];

export function FilterSheet({
  open,
  onClose,
  mode,
  onModeChange,
}: {
  open: boolean;
  onClose: () => void;
  mode: RangeMode;
  onModeChange: (mode: RangeMode) => void;
}) {
  const today = new Date();
  const [rangoInicio, setRangoInicio] = useState(toDateInputValue(today));
  const [rangoFin, setRangoFin] = useState(toDateInputValue(today));

  function apply(next: RangeMode) {
    onModeChange(next);
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Filtrar cuentas">
      <div className="flex flex-col gap-2">
        {QUICK_OPTIONS.map((option) => {
          const active = mode.type === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => apply(option.build())}
              className={`rounded-xl border px-4 py-3 text-left text-[15px] font-medium transition-colors ${
                active
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border bg-background active:bg-surface-muted"
              }`}
            >
              {option.label}
            </button>
          );
        })}

        <div className="mt-2 rounded-xl border border-border bg-background p-4">
          <p className="mb-3 text-[13px] font-medium text-muted-foreground">
            Rango personalizado
          </p>
          <div className="flex items-center gap-2.5">
            <input
              type="date"
              value={rangoInicio}
              onChange={(e) => setRangoInicio(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-border px-2.5 py-2.5 text-[14px] outline-none focus:border-primary"
            />
            <span className="text-muted-foreground">—</span>
            <input
              type="date"
              value={rangoFin}
              onChange={(e) => setRangoFin(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-border px-2.5 py-2.5 text-[14px] outline-none focus:border-primary"
            />
          </div>
          <button
            type="button"
            onClick={() =>
              apply({
                type: "rango",
                start: parseDateInputValue(rangoInicio),
                end: parseDateInputValue(rangoFin),
              })
            }
            className="mt-3 w-full rounded-lg bg-primary py-2.5 text-[14px] font-semibold text-primary-foreground active:opacity-80"
          >
            Aplicar rango
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
