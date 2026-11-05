"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, History, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { BottomSheet } from "./BottomSheet";
import { SelectSheet } from "./SelectSheet";
import { useCatalogo } from "@/context/CatalogoContext";
import { CATEGORIA_COMODIN } from "@/lib/catalogo";
import { ICONOS_CATEGORIA, ICONO_POR_DEFECTO, iconoDe } from "@/lib/categoryMeta";
import { normalizar } from "@/lib/texto";
import type { CategoriaItem, CuentaGuardada } from "@/types/catalogo";

type Tab = "cuentas" | "categorias";
type Vista =
  | { tipo: "lista" }
  | { tipo: "cuenta"; cuenta: CuentaGuardada | null }
  | { tipo: "categoria"; categoria: CategoriaItem | null };

const inputClass =
  "w-full min-w-0 rounded-xl border border-border bg-background px-3.5 py-3 text-[15px] outline-none focus:border-primary";

/** Hoja para crear, editar y borrar las cuentas guardadas y las categorías. */
export function CatalogoSheet({
  open,
  onClose,
  tabInicial = "cuentas",
  onVerHistorial,
}: {
  open: boolean;
  onClose: () => void;
  tabInicial?: Tab;
  /** Abre el historial de la cuenta con ese nombre. */
  onVerHistorial: (nombre: string) => void;
}) {
  const [tab, setTab] = useState<Tab>(tabInicial);
  const [vista, setVista] = useState<Vista>({ tipo: "lista" });

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- volver a la lista cada vez que se abre */
    if (!open) return;
    setTab(tabInicial);
    setVista({ tipo: "lista" });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, tabInicial]);

  const titulo =
    vista.tipo === "cuenta"
      ? vista.cuenta
        ? "Editar cuenta"
        : "Nueva cuenta"
      : vista.tipo === "categoria"
        ? vista.categoria
          ? "Editar categoría"
          : "Nueva categoría"
        : "Cuentas y categorías";

  const volver = () => setVista({ tipo: "lista" });
  const { error } = useCatalogo();

  return (
    <BottomSheet open={open} onClose={onClose} title={titulo}>
      {vista.tipo === "lista" && (
        <div className="flex flex-col gap-4">
          {error && (
            <div className="rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-[13px] text-danger">
              No pudimos leer tus cuentas y categorías guardadas: {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-muted p-1">
            {(["cuentas", "categorias"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-lg py-2 text-[14px] font-semibold transition-colors ${
                  tab === t ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {t === "cuentas" ? "Cuentas" : "Categorías"}
              </button>
            ))}
          </div>
          {tab === "cuentas" ? (
            <ListaCuentas
              onEditar={(cuenta) => setVista({ tipo: "cuenta", cuenta })}
              onVerHistorial={onVerHistorial}
            />
          ) : (
            <ListaCategorias onEditar={(categoria) => setVista({ tipo: "categoria", categoria })} />
          )}
        </div>
      )}
      {vista.tipo === "cuenta" && <FormCuenta cuenta={vista.cuenta} onListo={volver} onVerHistorial={onVerHistorial} />}
      {vista.tipo === "categoria" && <FormCategoria categoria={vista.categoria} onListo={volver} />}
    </BottomSheet>
  );
}

function BotonNuevo({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-primary/50 py-3 text-[14px] font-semibold text-primary active:bg-primary-soft"
    >
      <Plus size={16} strokeWidth={2.5} />
      {label}
    </button>
  );
}

function ListaCuentas({
  onEditar,
  onVerHistorial,
}: {
  onEditar: (cuenta: CuentaGuardada | null) => void;
  onVerHistorial: (nombre: string) => void;
}) {
  const { cuentas, categorias, categoria } = useCatalogo();
  const [busqueda, setBusqueda] = useState("");
  /** Categorías plegadas (por defecto todas abiertas). */
  const [plegadas, setPlegadas] = useState<Set<string>>(new Set());

  const grupos = useMemo(() => {
    const termino = normalizar(busqueda);
    const filtradas = termino ? cuentas.filter((c) => normalizar(c.nombre).includes(termino)) : cuentas;
    const orden = new Map(categorias.map((c, i) => [c.id, i]));
    const map = new Map<string, CuentaGuardada[]>();
    for (const c of filtradas) map.set(c.categoriaId, [...(map.get(c.categoriaId) ?? []), c]);
    return [...map.entries()].sort(
      ([a], [b]) => (orden.get(a) ?? Infinity) - (orden.get(b) ?? Infinity),
    );
  }, [cuentas, categorias, busqueda]);

  function togglePlegada(id: string) {
    setPlegadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <BotonNuevo label="Nueva cuenta" onClick={() => onEditar(null)} />

      {cuentas.length > 6 && (
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar cuenta…"
            className={`${inputClass} pl-10`}
          />
        </div>
      )}

      {grupos.length === 0 && (
        <p className="py-6 text-center text-[14px] text-muted-foreground">
          {busqueda ? `No hay cuentas que coincidan con “${busqueda}”.` : "Todavía no guardaste ninguna cuenta."}
        </p>
      )}

      {grupos.map(([categoriaId, lista]) => {
        const { nombre, icon: Icon } = categoria(categoriaId);
        // Mientras se busca se muestran todos los resultados aunque el grupo esté plegado.
        const abierto = Boolean(busqueda) || !plegadas.has(categoriaId);
        return (
          <div key={categoriaId} className="overflow-hidden rounded-xl border border-border bg-background">
            <button
              type="button"
              onClick={() => togglePlegada(categoriaId)}
              aria-expanded={abierto}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left active:bg-surface-muted"
            >
              <Icon size={15} className="text-muted-foreground" />
              <span className="flex-1 text-[13px] font-semibold text-muted-foreground">{nombre}</span>
              <span className="text-[12px] tabular-nums text-muted-foreground">{lista.length}</span>
              <ChevronDown
                size={16}
                className={`text-muted-foreground transition-transform ${abierto ? "" : "-rotate-90"}`}
              />
            </button>
            {abierto && (
              <ul className="border-t border-border">
                {lista.map((cuenta) => (
                  <li key={cuenta.id} className="flex items-center border-b border-border last:border-b-0">
                    <button
                      type="button"
                      onClick={() => onVerHistorial(cuenta.nombre)}
                      className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-3.5 pr-2 text-left active:bg-surface-muted"
                    >
                      <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{cuenta.nombre}</span>
                      <span className="flex shrink-0 items-center gap-1 text-[12px] text-muted-foreground">
                        <History size={13} />
                        Historial
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditar(cuenta)}
                      aria-label={`Editar ${cuenta.nombre}`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center border-l border-border text-muted-foreground active:bg-surface-muted"
                    >
                      <Pencil size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ListaCategorias({ onEditar }: { onEditar: (categoria: CategoriaItem | null) => void }) {
  const { categorias, cuentas } = useCatalogo();
  const usos = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of cuentas) map.set(c.categoriaId, (map.get(c.categoriaId) ?? 0) + 1);
    return map;
  }, [cuentas]);

  return (
    <div className="flex flex-col gap-3">
      <BotonNuevo label="Nueva categoría" onClick={() => onEditar(null)} />
      <ul className="overflow-hidden rounded-xl border border-border bg-background">
        {categorias.map((cat) => {
          const Icon = iconoDe(cat.icono);
          const n = usos.get(cat.id) ?? 0;
          return (
            <li key={cat.id} className="border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() => onEditar(cat)}
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-surface-muted"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-foreground/70">
                  <Icon size={16} strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{cat.nombre}</span>
                  <span className="block text-[12px] text-muted-foreground">
                    {n === 0 ? "Sin cuentas guardadas" : n === 1 ? "1 cuenta" : `${n} cuentas`}
                  </span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Botón de borrar que pide un segundo toque para confirmar. */
function BotonBorrar({
  aviso,
  disabled,
  onConfirmar,
}: {
  aviso: string;
  disabled: boolean;
  onConfirmar: () => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        disabled={disabled}
        className="flex items-center justify-center gap-1.5 rounded-xl border border-danger/25 py-3 text-[14px] font-medium text-danger active:bg-danger-soft disabled:opacity-50"
      >
        <Trash2 size={15} />
        Borrar
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-danger/25 bg-danger-soft p-3.5">
      <p className="text-[13px] text-danger">{aviso}</p>
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          disabled={disabled}
          className="flex-1 rounded-xl border border-border bg-background py-2.5 text-[14px] font-medium text-foreground/80"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          disabled={disabled}
          className="flex-1 rounded-xl bg-danger py-2.5 text-[14px] font-semibold text-white disabled:opacity-50"
        >
          Sí, borrar
        </button>
      </div>
    </div>
  );
}

function useGuardado(onListo: () => void) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function ejecutar(accion: () => Promise<void>) {
    setGuardando(true);
    setError(null);
    try {
      await accion();
      onListo();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal.");
    } finally {
      setGuardando(false);
    }
  }
  return { guardando, error, setError, ejecutar };
}

function FormCuenta({
  cuenta,
  onListo,
  onVerHistorial,
}: {
  cuenta: CuentaGuardada | null;
  onListo: () => void;
  onVerHistorial: (nombre: string) => void;
}) {
  const { cuentas, categorias, categoria, crearCuenta, editarCuenta, borrarCuenta } = useCatalogo();
  const [nombre, setNombre] = useState(cuenta?.nombre ?? "");
  const [categoriaId, setCategoriaId] = useState(cuenta?.categoriaId ?? CATEGORIA_COMODIN);
  const [eligiendoCategoria, setEligiendoCategoria] = useState(false);
  const [renombrarCargadas, setRenombrarCargadas] = useState(true);
  const { guardando, error, setError, ejecutar } = useGuardado(onListo);
  const cat = categoria(categoriaId);
  const cambioNombre = cuenta !== null && nombre.trim() !== "" && nombre.trim() !== cuenta.nombre;

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    const limpio = nombre.trim();
    if (!limpio) return setError("Poné un nombre.");
    const repetida = cuentas.some((c) => c.id !== cuenta?.id && normalizar(c.nombre) === normalizar(limpio));
    if (repetida) return setError(`Ya tenés una cuenta llamada “${limpio}”.`);
    ejecutar(() =>
      cuenta
        ? editarCuenta(
            cuenta.id,
            { nombre: limpio, categoriaId },
            renombrarCargadas ? cuenta.nombre : undefined,
          )
        : crearCuenta({ nombre: limpio, categoriaId }),
    );
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-muted-foreground">Nombre</span>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej. Naranja Lu"
          className={inputClass}
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-muted-foreground">Categoría</span>
        <button
          type="button"
          onClick={() => setEligiendoCategoria(true)}
          className={`${inputClass} flex items-center gap-2.5 text-left`}
        >
          <cat.icon size={16} className="text-muted-foreground" />
          <span className="flex-1">{cat.nombre}</span>
          <ChevronDown size={16} className="text-muted-foreground" />
        </button>
      </div>

      {cambioNombre && (
        <button
          type="button"
          onClick={() => setRenombrarCargadas((v) => !v)}
          aria-pressed={renombrarCargadas}
          className="-mt-2 flex items-start gap-2 text-left text-[13px] text-muted-foreground"
        >
          <span
            className={`mt-px flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border transition-colors ${
              renombrarCargadas ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
            }`}
          >
            {renombrarCargadas && <Check size={12} strokeWidth={3} />}
          </span>
          Cambiar también el nombre en las cuentas ya cargadas como “{cuenta.nombre}”, así el historial queda junto.
        </button>
      )}

      {error && <p className="text-[13px] text-danger">{error}</p>}

      <button
        type="submit"
        disabled={guardando}
        className="rounded-xl bg-primary py-3.5 text-[15px] font-semibold text-primary-foreground transition-opacity active:opacity-80 disabled:opacity-50"
      >
        {cuenta ? "Guardar cambios" : "Agregar cuenta"}
      </button>

      <div className="flex flex-col gap-2.5">
        {cuenta && (
          <button
            type="button"
            onClick={() => onVerHistorial(cuenta.nombre)}
            disabled={guardando}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border py-3 text-[14px] font-medium text-foreground/80 active:bg-surface-muted disabled:opacity-50"
          >
            <History size={15} />
            Ver historial
          </button>
        )}
        {cuenta && (
          <BotonBorrar
            aviso={`¿Borrar “${cuenta.nombre}” de tus cuentas? Las cuentas ya cargadas con ese nombre no se borran.`}
            disabled={guardando}
            onConfirmar={() => ejecutar(() => borrarCuenta(cuenta.id))}
          />
        )}
        <BotonVolver onClick={onListo} disabled={guardando} />
      </div>

      <SelectSheet
        open={eligiendoCategoria}
        onClose={() => setEligiendoCategoria(false)}
        title="Categoría"
        items={categorias.map((c) => ({ id: c.id, label: c.nombre, icon: iconoDe(c.icono) }))}
        selectedId={categoriaId}
        onSelect={setCategoriaId}
        searchPlaceholder="Buscar categoría…"
      />
    </form>
  );
}

function FormCategoria({ categoria, onListo }: { categoria: CategoriaItem | null; onListo: () => void }) {
  const { categorias, cuentas, crearCategoria, editarCategoria, borrarCategoria } = useCatalogo();
  const [nombre, setNombre] = useState(categoria?.nombre ?? "");
  const [icono, setIcono] = useState(categoria?.icono ?? ICONO_POR_DEFECTO);
  const { guardando, error, setError, ejecutar } = useGuardado(onListo);
  const enUso = categoria ? cuentas.filter((c) => c.categoriaId === categoria.id).length : 0;

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    const limpio = nombre.trim();
    if (!limpio) return setError("Poné un nombre.");
    const repetida = categorias.some(
      (c) => c.id !== categoria?.id && normalizar(c.nombre) === normalizar(limpio),
    );
    if (repetida) return setError(`Ya tenés una categoría llamada “${limpio}”.`);
    ejecutar(() =>
      categoria
        ? editarCategoria(categoria.id, { nombre: limpio, icono })
        : crearCategoria({ nombre: limpio, icono }),
    );
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-muted-foreground">Nombre</span>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej. Seguros"
          className={inputClass}
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-muted-foreground">Ícono</span>
        <div className="grid grid-cols-7 gap-1.5">
          {Object.entries(ICONOS_CATEGORIA).map(([clave, Icon]) => {
            const active = clave === icono;
            return (
              <button
                key={clave}
                type="button"
                onClick={() => setIcono(clave)}
                aria-label={clave}
                aria-pressed={active}
                className={`flex aspect-square items-center justify-center rounded-xl border transition-colors ${
                  active
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-background text-foreground/70 active:bg-surface-muted"
                }`}
              >
                <Icon size={18} strokeWidth={2} />
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-[13px] text-danger">{error}</p>}

      <button
        type="submit"
        disabled={guardando}
        className="rounded-xl bg-primary py-3.5 text-[15px] font-semibold text-primary-foreground transition-opacity active:opacity-80 disabled:opacity-50"
      >
        {categoria ? "Guardar cambios" : "Agregar categoría"}
      </button>

      <div className="flex flex-col gap-2.5">
        {categoria && categoria.id !== CATEGORIA_COMODIN && (
          <BotonBorrar
            aviso={`¿Borrar la categoría “${categoria.nombre}”? ${
              enUso > 0 ? `Sus ${enUso === 1 ? "1 cuenta guardada" : `${enUso} cuentas guardadas`} y las` : "Las"
            } cuentas cargadas con esta categoría pasan a “Otro”.`}
            disabled={guardando}
            onConfirmar={() => ejecutar(() => borrarCategoria(categoria.id))}
          />
        )}
        {categoria?.id === CATEGORIA_COMODIN && (
          <p className="text-[12px] text-muted-foreground">
            Esta categoría no se puede borrar: es donde van las cuentas cuando borrás su categoría.
          </p>
        )}
        <BotonVolver onClick={onListo} disabled={guardando} />
      </div>
    </form>
  );
}

function BotonVolver({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center gap-1.5 rounded-xl border border-border py-3 text-[14px] font-medium text-foreground/80 active:bg-surface-muted disabled:opacity-50"
    >
      <X size={15} />
      Cancelar
    </button>
  );
}
