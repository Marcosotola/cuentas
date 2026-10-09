"use client";

import { AnimatePresence, motion } from "framer-motion";
import { format, isToday, isTomorrow } from "date-fns";
import { es } from "date-fns/locale";
import { Check, PartyPopper } from "lucide-react";
import { BillRow } from "./BillRow";
import { formatMonto } from "@/lib/format";
import type { DueDateGroup } from "@/lib/dueDates";
import type { Bill } from "@/types/bill";

function groupTitle(fecha: Date): string {
  const dia = format(fecha, "EEEE d 'de' MMMM", { locale: es });
  const titulo = isToday(fecha) ? `Hoy · ${dia}` : isTomorrow(fecha) ? `Mañana · ${dia}` : dia;
  return titulo.charAt(0).toUpperCase() + titulo.slice(1);
}

function GroupHeader({ group }: { group: DueDateGroup }) {
  const saldada = group.pendiente === 0;
  return (
    <div className="flex items-baseline justify-between gap-2 px-1 pb-2">
      <h3
        className={`text-[13px] font-semibold ${
          !saldada && group.vencida ? "text-danger" : "text-muted-foreground"
        }`}
      >
        {groupTitle(group.fecha)}
      </h3>
      {saldada ? (
        <span className="flex items-center gap-1 text-[12px] font-medium text-success">
          <Check size={12} strokeWidth={2.5} />
          Pagado
        </span>
      ) : (
        <span
          className={`text-[13px] font-semibold tabular-nums ${
            group.vencida ? "text-danger" : "text-foreground"
          }`}
        >
          Falta {formatMonto(group.pendiente)}
        </span>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2.5 px-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-[76px] animate-pulse rounded-2xl border border-border bg-surface-muted"
        />
      ))}
    </div>
  );
}

export function BillList({
  groups,
  loading,
  onTogglePagada,
  onEdit,
}: {
  groups: DueDateGroup[];
  loading: boolean;
  onTogglePagada: (bill: Bill, pagada: boolean) => void;
  onEdit: (bill: Bill) => void;
}) {
  if (loading) return <Skeleton />;

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-8 py-16 text-center">
        <PartyPopper className="text-muted-foreground" size={28} />
        <p className="text-sm font-medium text-foreground">
          No hay cuentas en este período
        </p>
        <p className="text-[13px] text-muted-foreground">
          Tocá el botón + para cargar una nueva.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4">
      {groups.map((group) => (
        <section key={group.key} id={`vence-${group.key}`}>
          <GroupHeader group={group} />
          <div className="space-y-2.5">
            <AnimatePresence initial={false}>
              {group.bills.map((bill) => (
                <motion.div
                  key={bill.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                >
                  <BillRow bill={bill} onTogglePagada={onTogglePagada} onEdit={onEdit} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      ))}
    </div>
  );
}
