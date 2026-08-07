"use client";

import { AnimatePresence, motion } from "framer-motion";
import { PartyPopper } from "lucide-react";
import { BillRow } from "./BillRow";
import type { Bill } from "@/types/bill";

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
  bills,
  loading,
  onTogglePagada,
  onEdit,
}: {
  bills: Bill[];
  loading: boolean;
  onTogglePagada: (bill: Bill, pagada: boolean) => void;
  onEdit: (bill: Bill) => void;
}) {
  if (loading) return <Skeleton />;

  if (bills.length === 0) {
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
    <div className="space-y-2.5 px-4">
      <AnimatePresence initial={false}>
        {bills.map((bill) => (
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
  );
}
