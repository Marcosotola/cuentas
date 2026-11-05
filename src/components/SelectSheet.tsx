"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, Search, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BottomSheet } from "./BottomSheet";
import { normalizar } from "@/lib/texto";

export interface SelectItem {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Texto chico debajo del nombre. */
  detail?: string;
  /** Si se indica, la lista se agrupa con estos títulos (en el orden en que aparecen). */
  group?: string;
}

/** Lista de opciones en una hoja inferior, con buscador. Reemplaza a las píldoras cuando hay muchas opciones. */
export function SelectSheet({
  open,
  onClose,
  title,
  items,
  selectedId,
  onSelect,
  searchPlaceholder = "Buscar…",
  emptyText = "No hay nada para mostrar.",
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  items: SelectItem[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  searchPlaceholder?: string;
  emptyText?: string;
  footer?: ReactNode;
}) {
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- limpiar la búsqueda al abrir
    if (open) setBusqueda("");
  }, [open]);

  const grupos = useMemo(() => {
    const termino = normalizar(busqueda);
    const filtrados = termino
      ? items.filter((item) => normalizar(item.label).includes(termino) || normalizar(item.group ?? "").includes(termino))
      : items;
    const map = new Map<string, SelectItem[]>();
    for (const item of filtrados) {
      const key = item.group ?? "";
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()];
  }, [items, busqueda]);

  const mostrarBuscador = items.length > 6;

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-3">
        {mostrarBuscador && (
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full min-w-0 rounded-xl border border-border bg-background py-3 pl-10 pr-10 text-[15px] outline-none focus:border-primary [&::-webkit-search-cancel-button]:hidden"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                aria-label="Borrar búsqueda"
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground active:bg-surface-muted"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {grupos.length === 0 && (
          <p className="py-6 text-center text-[14px] text-muted-foreground">
            {busqueda ? `No hay resultados para “${busqueda}”.` : emptyText}
          </p>
        )}

        {grupos.map(([grupo, lista]) => (
          <div key={grupo} className="flex flex-col">
            {grupo && (
              <h3 className="px-1 pb-1.5 pt-1 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                {grupo}
              </h3>
            )}
            <ul className="overflow-hidden rounded-xl border border-border bg-background">
              {lista.map((item) => {
                const Icon = item.icon;
                const active = item.id === selectedId;
                return (
                  <li key={item.id} className="border-b border-border last:border-b-0">
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(item.id);
                        onClose();
                      }}
                      className={`flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors active:bg-surface-muted ${
                        active ? "bg-primary-soft/60" : ""
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          active ? "bg-primary text-primary-foreground" : "bg-surface-muted text-foreground/70"
                        }`}
                      >
                        <Icon size={16} strokeWidth={2} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-[15px] ${active ? "font-semibold text-primary" : "font-medium"}`}>
                          {item.label}
                        </span>
                        {item.detail && (
                          <span className="block truncate text-[12px] text-muted-foreground">{item.detail}</span>
                        )}
                      </span>
                      {active && <Check size={18} className="shrink-0 text-primary" strokeWidth={2.5} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {footer}
      </div>
    </BottomSheet>
  );
}
