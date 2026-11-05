"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronRight } from "lucide-react";
import { BottomSheet } from "./BottomSheet";
import { useHistorial } from "@/hooks/useHistorial";
import { isVencida } from "@/lib/dates";
import { formatMonto } from "@/lib/format";
import type { Bill } from "@/types/bill";

const MESES_GRAFICO = 12;

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function estado(bill: Bill): { texto: string; clase: string } {
  if (bill.pagada) {
    return {
      texto: bill.fechaPago ? `Pagada el ${format(bill.fechaPago, "d MMM", { locale: es })}` : "Pagada",
      clase: "text-success",
    };
  }
  const parcial = bill.montoPagado > 0 ? ` · pagaste ${formatMonto(bill.montoPagado)}` : "";
  if (isVencida(bill.fechaVencimiento)) {
    return { texto: `Vencida el ${format(bill.fechaVencimiento, "d MMM", { locale: es })}${parcial}`, clase: "text-danger" };
  }
  return { texto: `Vence el ${format(bill.fechaVencimiento, "d MMM", { locale: es })}${parcial}`, clase: "text-muted-foreground" };
}

/** Todo lo que se cargó de una cuenta, mes a mes, con totales y un gráfico de montos. */
export function HistorialSheet({
  nombre,
  onClose,
  onAbrirCuenta,
}: {
  /** Descripción de la cuenta; con `null` la hoja está cerrada. */
  nombre: string | null;
  onClose: () => void;
  onAbrirCuenta: (bill: Bill) => void;
}) {
  const { bills, loading, error, resumen } = useHistorial(nombre);

  const porAnio = useMemo(() => {
    const map = new Map<number, Bill[]>();
    for (const bill of bills) {
      const anio = bill.fechaVencimiento.getFullYear();
      map.set(anio, [...(map.get(anio) ?? []), bill]);
    }
    return [...map.entries()];
  }, [bills]);

  return (
    <BottomSheet open={nombre !== null} onClose={onClose} title={nombre ?? ""}>
      <div className="flex flex-col gap-5">
        {error && (
          <div className="rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-[13px] text-danger">
            No pudimos cargar el historial: {error}
          </div>
        )}

        {loading && !error && <p className="py-6 text-center text-[14px] text-muted-foreground">Cargando…</p>}

        {!loading && !error && bills.length === 0 && (
          <p className="py-6 text-center text-[14px] text-muted-foreground">
            Todavía no cargaste ninguna cuenta con este nombre.
          </p>
        )}

        {bills.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <Dato titulo="Pagaste en total" valor={formatMonto(resumen.totalPagado)} />
              <Dato titulo="Promedio" valor={formatMonto(resumen.promedio)} />
              <Dato titulo="Veces cargada" valor={String(resumen.cantidad)} />
              <Dato
                titulo="Falta pagar"
                valor={formatMonto(resumen.pendiente)}
                clase={resumen.pendiente > 0 ? "text-danger" : undefined}
              />
            </div>

            {bills.length > 1 && <Grafico bills={bills} />}

            {porAnio.map(([anio, lista]) => (
              <div key={anio} className="flex flex-col">
                <h3 className="flex items-baseline justify-between px-1 pb-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>{anio}</span>
                  <span className="tabular-nums normal-case tracking-normal">
                    {formatMonto(lista.reduce((t, b) => t + b.monto, 0))}
                  </span>
                </h3>
                <ul className="overflow-hidden rounded-xl border border-border bg-background">
                  {lista.map((bill) => {
                    const e = estado(bill);
                    return (
                      <li key={bill.id} className="border-b border-border last:border-b-0">
                        <button
                          type="button"
                          onClick={() => onAbrirCuenta(bill)}
                          className="flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-surface-muted"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-medium">
                              {capitalizar(format(bill.fechaVencimiento, "MMMM", { locale: es }))}
                            </span>
                            <span className={`block truncate text-[12px] ${e.clase}`}>{e.texto}</span>
                          </span>
                          <span className="shrink-0 text-[15px] font-semibold tabular-nums">
                            {formatMonto(bill.monto)}
                          </span>
                          <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </>
        )}
      </div>
    </BottomSheet>
  );
}

function Dato({ titulo, valor, clase }: { titulo: string; valor: string; clase?: string }) {
  return (
    <div className="rounded-xl border border-border bg-background px-3.5 py-3">
      <p className="text-[12px] text-muted-foreground">{titulo}</p>
      <p className={`text-[17px] font-semibold tabular-nums ${clase ?? "text-foreground"}`}>{valor}</p>
    </div>
  );
}

/** Barras con el monto de las últimas cargas (de la más vieja a la más nueva). Tocá una para ver el valor. */
function Grafico({ bills }: { bills: Bill[] }) {
  const ultimas = useMemo(() => bills.slice(0, MESES_GRAFICO).reverse(), [bills]);
  const [elegida, setElegida] = useState<string | null>(null);
  const max = Math.max(...ultimas.map((b) => b.monto), 1);
  const activa = ultimas.find((b) => b.id === elegida) ?? ultimas[ultimas.length - 1];

  return (
    <div className="rounded-xl border border-border bg-background px-3.5 pb-2.5 pt-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[12px] text-muted-foreground">
          Monto de las últimas {ultimas.length} veces
        </p>
        <p className="text-[13px] tabular-nums">
          <span className="text-muted-foreground">
            {capitalizar(format(activa.fechaVencimiento, "MMM yy", { locale: es }))}:{" "}
          </span>
          <span className="font-semibold">{formatMonto(activa.monto)}</span>
        </p>
      </div>
      <div className="mt-3 flex h-24 items-end gap-0.5 border-b border-border" role="list">
        {ultimas.map((bill) => {
          const esActiva = bill.id === activa.id;
          return (
            <button
              key={bill.id}
              type="button"
              role="listitem"
              onClick={() => setElegida(bill.id)}
              aria-label={`${format(bill.fechaVencimiento, "MMMM yyyy", { locale: es })}: ${formatMonto(bill.monto)}`}
              className="flex h-full flex-1 items-end justify-center"
            >
              <span
                className={`block w-full max-w-6 rounded-t-[4px] transition-colors ${
                  esActiva ? "bg-primary" : "bg-primary/35"
                }`}
                style={{ height: `${Math.max((bill.monto / max) * 100, 2)}%` }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex gap-0.5">
        {ultimas.map((bill) => (
          <span key={bill.id} className="flex-1 text-center text-[10px] uppercase text-muted-foreground">
            {format(bill.fechaVencimiento, "MMMMM", { locale: es })}
          </span>
        ))}
      </div>
    </div>
  );
}
