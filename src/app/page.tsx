"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { MonthNavigator } from "@/components/MonthNavigator";
import { SummaryCard } from "@/components/SummaryCard";
import { BillList } from "@/components/BillList";
import { BillFormSheet } from "@/components/BillFormSheet";
import { FilterSheet } from "@/components/FilterSheet";
import { useBills, type RangeMode } from "@/hooks/useBills";
import type { Bill } from "@/types/bill";

export default function Home() {
  const [mode, setMode] = useState<RangeMode>({ type: "mes", date: new Date() });
  const [filterOpen, setFilterOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  const { bills, loading, error, summary, create, update, togglePagada, remove, duplicate } =
    useBills(mode);

  function openNewBillForm() {
    setEditingBill(null);
    setFormOpen(true);
  }

  function openEditForm(bill: Bill) {
    setEditingBill(bill);
    setFormOpen(true);
  }

  const defaultDate = mode.type === "mes" ? mode.date : new Date();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <h1 className="px-4 pt-3 text-[22px] font-bold tracking-tight">Cuentas</h1>
        <MonthNavigator mode={mode} onModeChange={setMode} onOpenFilter={() => setFilterOpen(true)} />
      </header>

      <main className="flex-1 pb-28">
        <SummaryCard summary={summary} />

        {error && (
          <div className="mx-4 mt-4 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-[13px] text-danger">
            No pudimos conectar con la base de datos: {error}
          </div>
        )}

        <div className="mt-5">
          <BillList bills={bills} loading={loading} onTogglePagada={togglePagada} onEdit={openEditForm} />
        </div>
      </main>

      <button
        type="button"
        onClick={openNewBillForm}
        aria-label="Agregar cuenta"
        className="fixed bottom-6 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      <BillFormSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editingBill}
        defaultDate={defaultDate}
        onSubmit={async (id, input) => {
          if (id) await update(id, input);
          else await create(input);
        }}
        onDelete={remove}
        onDuplicate={duplicate}
      />

      <FilterSheet open={filterOpen} onClose={() => setFilterOpen(false)} mode={mode} onModeChange={setMode} />
    </div>
  );
}
