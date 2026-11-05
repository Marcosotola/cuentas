"use client";

import { useMemo, useRef, useState } from "react";
import { History, Plus, Settings2 } from "lucide-react";
import { MonthNavigator } from "@/components/MonthNavigator";
import { SummaryCard } from "@/components/SummaryCard";
import { DueDateStrip } from "@/components/DueDateStrip";
import { BillList } from "@/components/BillList";
import { BillFormSheet } from "@/components/BillFormSheet";
import { FilterSheet } from "@/components/FilterSheet";
import { CatalogoSheet } from "@/components/CatalogoSheet";
import { HistorialSheet } from "@/components/HistorialSheet";
import { SelectSheet } from "@/components/SelectSheet";
import { useCatalogo } from "@/context/CatalogoContext";
import { normalizar } from "@/lib/texto";
import { CatalogoProvider } from "@/context/CatalogoContext";
import { useBills, type RangeMode } from "@/hooks/useBills";
import { buildDueDateChips, groupByDueDate } from "@/lib/dueDates";
import type { Bill } from "@/types/bill";

export default function Home() {
  return (
    <CatalogoProvider>
      <Cuentas />
    </CatalogoProvider>
  );
}

function Cuentas() {
  const [mode, setMode] = useState<RangeMode>({ type: "mes", date: new Date() });
  const [filterOpen, setFilterOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [catalogoTab, setCatalogoTab] = useState<"cuentas" | "categorias" | null>(null);
  const [historialDe, setHistorialDe] = useState<string | null>(null);
  const [eligiendoHistorial, setEligiendoHistorial] = useState(false);
  const catalogo = useCatalogo();

  const {
    bills,
    loading,
    error,
    summary,
    create,
    update,
    togglePagada,
    pagarParcial,
    corregirPago,
    borrarPago,
    remove,
    duplicate,
  } = useBills(mode);

  const groups = useMemo(() => groupByDueDate(bills), [bills]);

  // Para el historial se ofrecen las cuentas guardadas y, además, las cargadas
  // en el período que se está viendo aunque no estén guardadas.
  const itemsHistorial = useMemo(() => {
    const orden = new Map(catalogo.categorias.map((c, i) => [c.id, i]));
    const vistos = new Set<string>();
    const lista: { nombre: string; categoriaId: string }[] = [];
    for (const c of [
      ...catalogo.cuentas,
      ...bills.map((b) => ({ nombre: b.descripcion, categoriaId: b.categoria })),
    ]) {
      const key = normalizar(c.nombre);
      if (!key || vistos.has(key)) continue;
      vistos.add(key);
      lista.push(c);
    }
    return lista
      .sort(
        (a, b) =>
          (orden.get(a.categoriaId) ?? Infinity) - (orden.get(b.categoriaId) ?? Infinity) ||
          a.nombre.localeCompare(b.nombre, "es"),
      )
      .map((c) => {
        const cat = catalogo.categoria(c.categoriaId);
        return { id: c.nombre, label: c.nombre, icon: cat.icon, group: cat.nombre };
      });
  }, [catalogo, bills]);
  const chips = useMemo(() => buildDueDateChips(groups), [groups]);
  const headerRef = useRef<HTMLElement>(null);

  function scrollToDueDate(key: string) {
    const target = document.getElementById(`vence-${key}`);
    if (!target) return;
    // El header es sticky: dejamos el encabezado del grupo justo debajo de él.
    const offset = (headerRef.current?.offsetHeight ?? 0) + 12;
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: "smooth" });
  }

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
      <header ref={headerRef} className="sticky top-0 z-30 border-b border-border/60 bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="flex items-center justify-between px-4 pt-3">
          <h1 className="text-[22px] font-bold tracking-tight">Cuentas</h1>
          <div className="-mr-1.5 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setEligiendoHistorial(true)}
              className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[14px] font-medium text-foreground/70 transition-colors active:bg-surface-muted"
            >
              <History size={18} />
              Historial
            </button>
            <button
              type="button"
              onClick={() => setCatalogoTab("cuentas")}
              aria-label="Gestionar cuentas y categorías"
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 transition-colors active:bg-surface-muted"
            >
              <Settings2 size={19} />
            </button>
          </div>
        </div>
        <MonthNavigator mode={mode} onModeChange={setMode} onOpenFilter={() => setFilterOpen(true)} />
      </header>

      <main className="flex-1 pb-28">
        <SummaryCard summary={summary} />
        {!loading && <DueDateStrip chips={chips} onSelect={scrollToDueDate} />}

        {error && (
          <div className="mx-4 mt-4 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-[13px] text-danger">
            No pudimos conectar con la base de datos: {error}
          </div>
        )}

        <div className="mt-5">
          <BillList groups={groups} loading={loading} onTogglePagada={togglePagada} onEdit={openEditForm} />
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
        onPagoParcial={pagarParcial}
        onEditarPago={corregirPago}
        onEliminarPago={borrarPago}
        onGestionar={setCatalogoTab}
        onVerHistorial={setHistorialDe}
      />

      <CatalogoSheet
        open={catalogoTab !== null}
        onClose={() => setCatalogoTab(null)}
        tabInicial={catalogoTab ?? "cuentas"}
        onVerHistorial={setHistorialDe}
      />

      <SelectSheet
        open={eligiendoHistorial}
        onClose={() => setEligiendoHistorial(false)}
        title="Ver historial de…"
        items={itemsHistorial}
        onSelect={setHistorialDe}
        searchPlaceholder="Buscar cuenta…"
        emptyText="Todavía no hay cuentas."
      />

      <HistorialSheet
        nombre={historialDe}
        onClose={() => setHistorialDe(null)}
        onAbrirCuenta={(bill) => {
          setHistorialDe(null);
          openEditForm(bill);
        }}
      />

      <FilterSheet open={filterOpen} onClose={() => setFilterOpen(false)} mode={mode} onModeChange={setMode} />
    </div>
  );
}
