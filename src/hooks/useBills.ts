"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { endOfMonth, endOfYear, isSameMonth, startOfMonth, startOfYear } from "date-fns";
import { isVencida } from "@/lib/dates";
import { ensureAnonymousAuth } from "@/lib/firebase";
import {
  addBill,
  deleteBill,
  duplicateBillNextMonth,
  setPagada,
  subscribeToBills,
  subscribeToBillsForCurrentMonth,
  updateBill,
} from "@/lib/bills";
import type { Bill, BillUpdateInput, NewBillInput } from "@/types/bill";

export type RangeMode =
  | { type: "mes"; date: Date }
  | { type: "anio"; date: Date }
  | { type: "rango"; start: Date; end: Date }
  | { type: "todas" };

function resolveRange(mode: RangeMode): { start: Date; end: Date } | null {
  switch (mode.type) {
    case "mes":
      return { start: startOfMonth(mode.date), end: endOfMonth(mode.date) };
    case "anio":
      return { start: startOfYear(mode.date), end: endOfYear(mode.date) };
    case "rango":
      return { start: mode.start, end: mode.end };
    case "todas":
      return null;
  }
}

export interface BillsSummary {
  total: number;
  pagadoTotal: number;
  pendienteTotal: number;
  vencidasCount: number;
  cantidadTotal: number;
  cantidadPagadas: number;
}

export function useBills(mode: RangeMode) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => resolveRange(mode), [mode]);
  const rangeKey = range ? `${range.start.getTime()}-${range.end.getTime()}` : "todas";
  const isCurrentMonth = mode.type === "mes" && isSameMonth(mode.date, new Date());

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset before (re)subscribing to a new range
    setLoading(true);
    setError(null);

    ensureAnonymousAuth()
      .then(() => {
        if (cancelled) return;
        const onData = (data: Bill[]) => {
          setBills(data);
          setLoading(false);
        };
        const onErr = (err: Error) => {
          setError(err.message);
          setLoading(false);
        };
        unsubscribe =
          isCurrentMonth && range
            ? subscribeToBillsForCurrentMonth(range, onData, onErr)
            : subscribeToBills(range, onData, onErr);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey, isCurrentMonth]);

  const summary: BillsSummary = useMemo(() => {
    let pagadoTotal = 0;
    let pendienteTotal = 0;
    let vencidasCount = 0;
    let cantidadPagadas = 0;
    let gastoTotalMes = 0;

    for (const bill of bills) {
      if (!bill.esArrastre) gastoTotalMes += bill.monto;

      if (bill.pagada) {
        pagadoTotal += bill.monto;
        cantidadPagadas += 1;
      } else {
        pendienteTotal += bill.monto;
        if (isVencida(bill.fechaVencimiento)) vencidasCount += 1;
      }
    }

    return {
      total: gastoTotalMes,
      pagadoTotal,
      pendienteTotal,
      vencidasCount,
      cantidadTotal: bills.length,
      cantidadPagadas,
    };
  }, [bills]);

  const create = useCallback(async (input: NewBillInput) => {
    await ensureAnonymousAuth();
    await addBill(input);
  }, []);

  const update = useCallback(async (id: string, input: BillUpdateInput) => {
    await ensureAnonymousAuth();
    await updateBill(id, input);
  }, []);

  const togglePagada = useCallback(async (bill: Bill, pagada: boolean) => {
    await ensureAnonymousAuth();
    await setPagada(bill, pagada);
  }, []);

  const remove = useCallback(async (id: string) => {
    await ensureAnonymousAuth();
    await deleteBill(id);
  }, []);

  const duplicate = useCallback(async (bill: Bill) => {
    await ensureAnonymousAuth();
    await duplicateBillNextMonth(bill);
  }, []);

  return {
    bills,
    loading,
    error,
    summary,
    create,
    update,
    togglePagada,
    remove,
    duplicate,
  };
}
