"use client";

import { useRef, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { motion } from "framer-motion";
import { Check, Repeat, StickyNote } from "lucide-react";
import { CATEGORY_META } from "@/lib/categoryMeta";
import { isVencida } from "@/lib/dates";
import { formatMonto } from "@/lib/format";
import type { Bill } from "@/types/bill";

type Status = "pagada" | "vencida" | "pendiente";

function getStatus(bill: Bill): Status {
  if (bill.pagada) return "pagada";
  if (isVencida(bill.fechaVencimiento)) return "vencida";
  return "pendiente";
}

const STATUS_STYLES: Record<Status, { bg: string; fg: string }> = {
  pagada: { bg: "bg-success-soft", fg: "text-success" },
  vencida: { bg: "bg-danger-soft", fg: "text-danger" },
  pendiente: { bg: "bg-surface-muted", fg: "text-foreground/70" },
};

export function BillRow({
  bill,
  onTogglePagada,
  onEdit,
}: {
  bill: Bill;
  onTogglePagada: (bill: Bill, pagada: boolean) => void;
  onEdit: (bill: Bill) => void;
}) {
  const [pending, setPending] = useState(false);
  const draggedRef = useRef(false);
  const status = getStatus(bill);
  const { icon: Icon, label } = CATEGORY_META[bill.categoria];
  const styles = STATUS_STYLES[status];

  async function handleSwipeComplete() {
    if (pending) return;
    setPending(true);
    try {
      await onTogglePagada(bill, !bill.pagada);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-0 flex items-center bg-success px-5 text-primary-foreground">
        <Check size={20} strokeWidth={2.5} />
        <span className="ml-2 text-sm font-semibold">
          {bill.pagada ? "Marcar pendiente" : "Marcar pagada"}
        </span>
      </div>

      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.04, right: 0.5 }}
        dragSnapToOrigin
        onDragStart={() => {
          draggedRef.current = true;
        }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 76) handleSwipeComplete();
          // native "click" fires right after the drag's pointerup; swallow just that one
          setTimeout(() => {
            draggedRef.current = false;
          }, 0);
        }}
        onClick={() => {
          if (draggedRef.current) return;
          onEdit(bill);
        }}
        whileTap={{ scale: 0.985 }}
        className={`relative flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 ${
          pending ? "opacity-60" : ""
        }`}
      >
        <button
          type="button"
          disabled={pending}
          aria-label={bill.pagada ? "Marcar como pendiente" : "Marcar como pagada"}
          aria-pressed={bill.pagada}
          onClick={(e) => {
            e.stopPropagation();
            handleSwipeComplete();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors active:scale-95 ${styles.bg} ${styles.fg}`}
        >
          {bill.pagada ? <Check size={20} strokeWidth={2.5} /> : <Icon size={20} strokeWidth={2} />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p
              className={`truncate text-[15px] font-medium ${
                bill.pagada ? "text-muted-foreground line-through" : "text-foreground"
              }`}
            >
              {bill.descripcion}
            </p>
            {bill.recurrente && (
              <Repeat size={12} className="shrink-0 text-muted-foreground" />
            )}
            {bill.observaciones && (
              <StickyNote size={12} className="shrink-0 text-muted-foreground" />
            )}
          </div>
          <p className={`text-[13px] ${styles.fg}`}>
            {bill.pagada
              ? bill.fechaPago
                ? `Pagada el ${format(bill.fechaPago, "d MMM", { locale: es })}`
                : "Pagada"
              : status === "vencida"
                ? `Vencida el ${format(bill.fechaVencimiento, "d MMM", { locale: es })}`
                : `Vence el ${format(bill.fechaVencimiento, "d MMM", { locale: es })}`}
            <span className="text-muted-foreground"> · {label}</span>
          </p>
          {bill.pagada && (
            <p className="text-[13px] text-muted-foreground">
              Vencía el {format(bill.fechaVencimiento, "d MMM", { locale: es })}
            </p>
          )}
        </div>

        <span
          className={`shrink-0 text-[15px] font-semibold tabular-nums ${
            bill.pagada ? "text-muted-foreground line-through" : "text-foreground"
          }`}
        >
          {formatMonto(bill.monto)}
        </span>
      </motion.div>
    </div>
  );
}
