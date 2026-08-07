"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Copy, Repeat, Trash2 } from "lucide-react";
import { BottomSheet } from "./BottomSheet";
import { CATEGORY_META } from "@/lib/categoryMeta";
import { CUENTAS_FRECUENTES } from "@/lib/cuentasFrecuentes";
import type { Bill, Categoria, NewBillInput } from "@/types/bill";

function toDateInputValue(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function parseDateInputValue(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function BillFormSheet({
  open,
  onClose,
  initial,
  defaultDate,
  onSubmit,
  onDelete,
  onDuplicate,
}: {
  open: boolean;
  onClose: () => void;
  initial: Bill | null;
  defaultDate: Date;
  onSubmit: (id: string | null, input: NewBillInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDuplicate: (bill: Bill) => Promise<void>;
}) {
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("otro");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(toDateInputValue(defaultDate));
  const [recurrente, setRecurrente] = useState(false);
  const [observaciones, setObservaciones] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset the form fields whenever the sheet opens */
    if (!open) return;
    if (initial) {
      setDescripcion(initial.descripcion);
      setCategoria(initial.categoria);
      setMonto(String(initial.monto));
      setFecha(toDateInputValue(initial.fechaVencimiento));
      setRecurrente(initial.recurrente);
      setObservaciones(initial.observaciones);
    } else {
      setDescripcion("");
      setCategoria("otro");
      setMonto("");
      setFecha(toDateInputValue(defaultDate));
      setRecurrente(false);
      setObservaciones("");
    }
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, initial, defaultDate]);

  function pickCuenta(cuenta: { label: string; categoria: Categoria }) {
    setDescripcion(cuenta.label);
    setCategoria(cuenta.categoria);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const montoNum = Number(monto.replace(",", "."));
    if (!descripcion.trim()) {
      setError("Poné una descripción.");
      return;
    }
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      setError("El monto tiene que ser mayor a 0.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(initial?.id ?? null, {
        descripcion: descripcion.trim(),
        categoria,
        monto: montoNum,
        fechaVencimiento: parseDateInputValue(fecha),
        recurrente,
        observaciones: observaciones.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!initial) return;
    setSubmitting(true);
    try {
      await onDelete(initial.id);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDuplicate() {
    if (!initial) return;
    setSubmitting(true);
    try {
      await onDuplicate(initial);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={initial ? "Editar cuenta" : "Nueva cuenta"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted-foreground">Tus cuentas</span>
          <div className="flex flex-wrap gap-2">
            {CUENTAS_FRECUENTES.map((cuenta) => {
              const Icon = CATEGORY_META[cuenta.categoria].icon;
              const active = descripcion === cuenta.label;
              return (
                <button
                  key={cuenta.label}
                  type="button"
                  onClick={() => pickCuenta(cuenta)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-[13px] font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-surface-muted text-foreground/80"
                  }`}
                >
                  <Icon size={14} strokeWidth={2} />
                  {cuenta.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted-foreground">Descripción</span>
          <input
            type="text"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej. Tarjeta Naranja"
            className="w-full min-w-0 rounded-xl border border-border bg-background px-3.5 py-3 text-[15px] outline-none focus:border-primary"
          />
        </label>

        <div className="flex gap-3">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-[13px] font-medium text-muted-foreground">Monto</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0"
              className="w-full min-w-0 rounded-xl border border-border bg-background px-3.5 py-3 text-[15px] outline-none focus:border-primary"
            />
          </label>

          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-[13px] font-medium text-muted-foreground">Vencimiento</span>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full min-w-0 rounded-xl border border-border bg-background px-3.5 py-3 text-[15px] outline-none focus:border-primary"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => setRecurrente((v) => !v)}
          className="flex items-center justify-between rounded-xl border border-border bg-background px-3.5 py-3"
        >
          <span className="flex items-center gap-2 text-[14px] font-medium">
            <Repeat size={16} className="text-muted-foreground" />
            Repetir todos los meses
          </span>
          <span
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              recurrente ? "bg-primary" : "bg-surface-muted"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                recurrente ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </span>
        </button>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted-foreground">
            Observaciones <span className="font-normal">(opcional)</span>
          </span>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Ej. Pagar antes del 10 para evitar recargo"
            rows={2}
            className="w-full min-w-0 resize-none rounded-xl border border-border bg-background px-3.5 py-3 text-[15px] outline-none focus:border-primary"
          />
        </label>

        {error && <p className="text-[13px] text-danger">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-primary py-3.5 text-[15px] font-semibold text-primary-foreground transition-opacity active:opacity-80 disabled:opacity-50"
        >
          {initial ? "Guardar cambios" : "Agregar cuenta"}
        </button>

        {initial && (
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={handleDuplicate}
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-3 text-[14px] font-medium text-foreground/80 active:bg-surface-muted"
            >
              <Copy size={15} />
              Repetir mes que viene
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={submitting}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-danger/25 px-4 py-3 text-[14px] font-medium text-danger active:bg-danger-soft"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </form>
    </BottomSheet>
  );
}
