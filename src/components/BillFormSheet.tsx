"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Check, ChevronDown, Copy, List, Pencil, Repeat, Settings2, Trash2 } from "lucide-react";
import { BottomSheet } from "./BottomSheet";
import { SelectSheet } from "./SelectSheet";
import { useCatalogo } from "@/context/CatalogoContext";
import { CATEGORIA_COMODIN } from "@/lib/catalogo";
import { iconoDe } from "@/lib/categoryMeta";
import { formatMonto } from "@/lib/format";
import { normalizar } from "@/lib/texto";
import type { Bill, Categoria, NewBillInput } from "@/types/bill";
import type { CuentaGuardada } from "@/types/catalogo";

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
  onPagoParcial,
  onEditarPago,
  onEliminarPago,
  onGestionar,
}: {
  open: boolean;
  onClose: () => void;
  initial: Bill | null;
  defaultDate: Date;
  onSubmit: (id: string | null, input: NewBillInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDuplicate: (bill: Bill) => Promise<void>;
  onPagoParcial: (bill: Bill, importe: number, fecha: Date) => Promise<void>;
  onEditarPago: (bill: Bill, index: number, importe: number, fecha: Date) => Promise<void>;
  onEliminarPago: (bill: Bill, index: number) => Promise<void>;
  /** Abre la gestión de cuentas y categorías guardadas. */
  onGestionar: (tab: "cuentas" | "categorias") => void;
}) {
  const catalogo = useCatalogo();
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState<Categoria>(CATEGORIA_COMODIN);
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(toDateInputValue(defaultDate));
  const [recurrente, setRecurrente] = useState(false);
  const [observaciones, setObservaciones] = useState("");
  const [pago, setPago] = useState("");
  const [fechaPago, setFechaPago] = useState(toDateInputValue(new Date()));
  /** Índice del pago que se está corrigiendo, o null si se está cargando uno nuevo. */
  const [editandoPago, setEditandoPago] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eligiendo, setEligiendo] = useState<"cuenta" | "categoria" | null>(null);
  const [sugiriendo, setSugiriendo] = useState(false);
  const [guardarCuenta, setGuardarCuenta] = useState(false);

  const termino = normalizar(descripcion);
  const yaGuardada = catalogo.cuentas.some((c) => normalizar(c.nombre) === termino);
  /** El texto escrito no coincide con ninguna cuenta guardada: se ofrece guardarla. */
  const esNueva = termino.length > 0 && !yaGuardada;
  const sugerencias = useMemo(
    () =>
      termino && !yaGuardada
        ? catalogo.cuentas.filter((c) => normalizar(c.nombre).includes(termino)).slice(0, 5)
        : [],
    [catalogo.cuentas, termino, yaGuardada],
  );
  const categoriaActual = catalogo.categoria(categoria);
  const CategoriaIcon = categoriaActual.icon;

  const itemsCuentas = useMemo(() => {
    const orden = new Map(catalogo.categorias.map((c, i) => [c.id, i]));
    return [...catalogo.cuentas]
      .sort((a, b) => (orden.get(a.categoriaId) ?? Infinity) - (orden.get(b.categoriaId) ?? Infinity))
      .map((c) => {
        const cat = catalogo.categoria(c.categoriaId);
        return { id: c.id, label: c.nombre, icon: cat.icon, group: cat.nombre };
      });
  }, [catalogo]);

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
      setCategoria(CATEGORIA_COMODIN);
      setMonto("");
      setFecha(toDateInputValue(defaultDate));
      setRecurrente(false);
      setObservaciones("");
    }
    setPago("");
    setFechaPago(toDateInputValue(new Date()));
    setEditandoPago(null);
    setError(null);
    setEligiendo(null);
    setGuardarCuenta(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, initial, defaultDate]);

  function pickCuenta(cuenta: CuentaGuardada) {
    setDescripcion(cuenta.nombre);
    setCategoria(cuenta.categoriaId);
    setSugiriendo(false);
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
    if (initial && !initial.pagada && montoNum <= initial.montoPagado) {
      setError(`El monto tiene que ser mayor a lo ya pagado (${formatMonto(initial.montoPagado)}).`);
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
      if (esNueva && guardarCuenta) {
        // Si falla no se pierde la cuenta a pagar, que ya se guardó.
        await catalogo.crearCuenta({ nombre: descripcion.trim(), categoriaId: categoria }).catch(() => {});
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePagoParcial() {
    if (!initial || initial.pagada) return;
    const importe = Number(pago.replace(",", "."));
    if (!Number.isFinite(importe) || importe <= 0) {
      setError("Poné cuánto pagaste (mayor a 0).");
      return;
    }
    if (!fechaPago) {
      setError("Poné la fecha en que pagaste.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const fechaDelPago = parseDateInputValue(fechaPago);
      if (editandoPago === null) await onPagoParcial(initial, importe, fechaDelPago);
      else await onEditarPago(initial, editandoPago, importe, fechaDelPago);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal.");
    } finally {
      setSubmitting(false);
    }
  }

  function empezarEdicionPago(index: number) {
    const p = initial?.pagos[index];
    if (!p) return;
    setEditandoPago(index);
    setPago(String(p.importe));
    setFechaPago(toDateInputValue(p.fecha));
    setError(null);
  }

  function cancelarEdicionPago() {
    setEditandoPago(null);
    setPago("");
    setFechaPago(toDateInputValue(new Date()));
    setError(null);
  }

  async function handleEliminarPago(index: number) {
    if (!initial || initial.pagada) return;
    setSubmitting(true);
    setError(null);
    try {
      await onEliminarPago(initial, index);
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

  // Lo que falta pagar contando el pago que se está corrigiendo (si hay uno) como no hecho.
  const saldoDelPago =
    initial && !initial.pagada
      ? initial.monto -
        initial.montoPagado +
        (editandoPago !== null ? (initial.pagos[editandoPago]?.importe ?? 0) : 0)
      : 0;

  return (
    <BottomSheet open={open} onClose={onClose} title={initial ? "Editar cuenta" : "Nueva cuenta"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted-foreground">Cuenta</span>
          <div className="relative flex gap-2">
            <input
              type="text"
              value={descripcion}
              onChange={(e) => {
                setDescripcion(e.target.value);
                setSugiriendo(true);
              }}
              onFocus={() => setSugiriendo(true)}
              onBlur={() => setTimeout(() => setSugiriendo(false), 150)}
              placeholder="Escribí o elegí de tus cuentas"
              autoComplete="off"
              className="w-full min-w-0 flex-1 rounded-xl border border-border bg-background px-3.5 py-3 text-[15px] outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => setEligiendo("cuenta")}
              aria-label="Elegir de tus cuentas"
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-surface-muted px-3.5 text-[14px] font-medium text-foreground/80 active:bg-border"
            >
              <List size={16} />
              Elegir
            </button>

            {sugiriendo && sugerencias.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-10 mt-1.5 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
                {sugerencias.map((cuenta) => {
                  const { icon: Icon, nombre } = catalogo.categoria(cuenta.categoriaId);
                  return (
                    <li key={cuenta.id} className="border-b border-border last:border-b-0">
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickCuenta(cuenta)}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left active:bg-surface-muted"
                      >
                        <Icon size={15} className="shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{cuenta.nombre}</span>
                        <span className="shrink-0 text-[12px] text-muted-foreground">{nombre}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {esNueva && (
            <button
              type="button"
              onClick={() => setGuardarCuenta((v) => !v)}
              aria-pressed={guardarCuenta}
              className="flex items-center gap-2 self-start py-1 text-[13px] text-muted-foreground"
            >
              <span
                className={`flex h-4.5 w-4.5 items-center justify-center rounded-md border transition-colors ${
                  guardarCuenta ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
                }`}
              >
                {guardarCuenta && <Check size={12} strokeWidth={3} />}
              </span>
              Guardar “{descripcion.trim()}” en tus cuentas
            </button>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted-foreground">Categoría</span>
          <button
            type="button"
            onClick={() => setEligiendo("categoria")}
            className="flex w-full min-w-0 items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 py-3 text-left text-[15px] outline-none focus:border-primary"
          >
            <CategoriaIcon size={16} className="text-muted-foreground" />
            <span className="flex-1">{categoriaActual.nombre}</span>
            <ChevronDown size={16} className="text-muted-foreground" />
          </button>
        </div>

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

        {initial && (!initial.pagada || initial.pagos.length > 0) && (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-muted p-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-medium text-muted-foreground">Pagos parciales</span>
              {!initial.pagada && (
                <span className="text-[13px] tabular-nums text-muted-foreground">
                  {initial.montoPagado > 0
                    ? `Pagaste ${formatMonto(initial.montoPagado)} · Resta ${formatMonto(initial.monto - initial.montoPagado)}`
                    : `Resta ${formatMonto(initial.monto)}`}
                </span>
              )}
            </div>

            {initial.pagos.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {initial.pagos.map((p, i) => (
                  <li
                    key={i}
                    className={`flex items-center gap-1 text-[14px] ${
                      editandoPago === i ? "font-semibold text-primary" : ""
                    }`}
                  >
                    <span className={editandoPago === i ? "" : "text-muted-foreground"}>
                      {format(p.fecha, "d 'de' MMM yyyy", { locale: es })}
                    </span>
                    <span
                      className={`ml-auto mr-2 font-medium tabular-nums ${
                        editandoPago === i ? "" : "text-foreground"
                      }`}
                    >
                      {formatMonto(p.importe)}
                    </span>
                    {!initial.pagada && (
                      <>
                        <button
                          type="button"
                          onClick={() => empezarEdicionPago(i)}
                          disabled={submitting}
                          aria-label={`Editar el pago del ${format(p.fecha, "d 'de' MMM", { locale: es })}`}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground active:bg-background disabled:opacity-50"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminarPago(i)}
                          disabled={submitting}
                          aria-label={`Borrar el pago del ${format(p.fecha, "d 'de' MMM", { locale: es })}`}
                          className="-mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-danger active:bg-danger-soft disabled:opacity-50"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {!initial.pagada && (
              <>
                <div className="flex gap-3">
                  <label className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="text-[13px] font-medium text-muted-foreground">Importe</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={pago}
                      onChange={(e) => setPago(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handlePagoParcial();
                        }
                      }}
                      placeholder="0"
                      className="w-full min-w-0 rounded-xl border border-border bg-background px-3.5 py-3 text-[15px] outline-none focus:border-primary"
                    />
                  </label>
                  <label className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="text-[13px] font-medium text-muted-foreground">
                      Fecha del pago
                    </span>
                    <input
                      type="date"
                      value={fechaPago}
                      max={toDateInputValue(new Date())}
                      onChange={(e) => setFechaPago(e.target.value)}
                      className="w-full min-w-0 rounded-xl border border-border bg-background px-3.5 py-3 text-[15px] outline-none focus:border-primary"
                    />
                  </label>
                </div>
                <div className="flex gap-2.5">
                  {editandoPago !== null && (
                    <button
                      type="button"
                      onClick={cancelarEdicionPago}
                      disabled={submitting}
                      className="rounded-xl border border-border bg-background px-4 py-3 text-[14px] font-medium text-foreground/80 active:bg-surface-muted disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handlePagoParcial}
                    disabled={submitting}
                    className="flex-1 rounded-xl border border-primary bg-primary-soft py-3 text-[14px] font-semibold text-primary transition-opacity active:opacity-80 disabled:opacity-50"
                  >
                    {Number(pago.replace(",", ".")) >= saldoDelPago
                      ? "Completar pago"
                      : editandoPago !== null
                        ? "Guardar pago"
                        : "Registrar pago"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

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
              className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
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

      <SelectSheet
        open={eligiendo === "cuenta"}
        onClose={() => setEligiendo(null)}
        title="Tus cuentas"
        items={itemsCuentas}
        selectedId={catalogo.cuentas.find((c) => normalizar(c.nombre) === termino)?.id}
        onSelect={(id) => {
          const cuenta = catalogo.cuentas.find((c) => c.id === id);
          if (cuenta) pickCuenta(cuenta);
        }}
        searchPlaceholder="Buscar cuenta…"
        emptyText="Todavía no guardaste ninguna cuenta."
        footer={<BotonGestionar label="Gestionar cuentas" onClick={() => {
              setEligiendo(null);
              onGestionar("cuentas");
            }} />}
      />
      <SelectSheet
        open={eligiendo === "categoria"}
        onClose={() => setEligiendo(null)}
        title="Categoría"
        items={catalogo.categorias.map((c) => ({ id: c.id, label: c.nombre, icon: iconoDe(c.icono) }))}
        selectedId={categoria}
        onSelect={setCategoria}
        searchPlaceholder="Buscar categoría…"
        footer={<BotonGestionar label="Gestionar categorías" onClick={() => {
              setEligiendo(null);
              onGestionar("categorias");
            }} />}
      />
    </BottomSheet>
  );
}

function BotonGestionar({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 rounded-xl border border-border py-3 text-[14px] font-medium text-foreground/80 active:bg-surface-muted"
    >
      <Settings2 size={15} />
      {label}
    </button>
  );
}
