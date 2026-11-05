"use client";

import { useEffect, useMemo, useState } from "react";
import { ensureAnonymousAuth } from "@/lib/firebase";
import { subscribeToHistorial } from "@/lib/bills";
import type { Bill } from "@/types/bill";

export interface HistorialResumen {
  cantidad: number;
  totalPagado: number;
  pendiente: number;
  promedio: number;
}

/** Historial en vivo de una cuenta (por su descripción). Con `null` no escucha nada. */
export function useHistorial(descripcion: string | null) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!descripcion) return;
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;
    /* eslint-disable react-hooks/set-state-in-effect -- limpiar antes de escuchar otra cuenta */
    setBills([]);
    setLoading(true);
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */

    ensureAnonymousAuth()
      .then(() => {
        if (cancelled) return;
        unsubscribe = subscribeToHistorial(
          descripcion,
          (data) => {
            setBills(data);
            setLoading(false);
          },
          (err) => {
            setError(err.message);
            setLoading(false);
          },
        );
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [descripcion]);

  const resumen: HistorialResumen = useMemo(() => {
    let totalPagado = 0;
    let pendiente = 0;
    let suma = 0;
    for (const bill of bills) {
      suma += bill.monto;
      totalPagado += bill.pagada ? bill.monto : bill.montoPagado;
      if (!bill.pagada) pendiente += bill.monto - bill.montoPagado;
    }
    return {
      cantidad: bills.length,
      totalPagado,
      pendiente,
      promedio: bills.length ? suma / bills.length : 0,
    };
  }, [bills]);

  return { bills, loading, error, resumen };
}
