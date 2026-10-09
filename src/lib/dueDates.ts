import { format, isToday, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { isVencida } from "@/lib/dates";
import type { Bill } from "@/types/bill";

export interface DueDateGroup {
  /** Día de vencimiento como "yyyy-MM-dd"; sirve de key y de ancla para el scroll. */
  key: string;
  fecha: Date;
  bills: Bill[];
  /** Lo que falta pagar ese día (descontando pagos parciales). */
  pendiente: number;
  vencida: boolean;
}

export function dueDateKey(fecha: Date): string {
  return format(fecha, "yyyy-MM-dd");
}

function pendienteDe(bill: Bill): number {
  return bill.pagada ? 0 : Math.max(bill.monto - bill.montoPagado, 0);
}

/** Agrupa las cuentas por día de vencimiento, ordenadas de la fecha más vieja a la más nueva. */
export function groupByDueDate(bills: Bill[]): DueDateGroup[] {
  const groups = new Map<string, DueDateGroup>();

  for (const bill of bills) {
    const key = dueDateKey(bill.fechaVencimiento);
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        fecha: startOfDay(bill.fechaVencimiento),
        bills: [],
        pendiente: 0,
        vencida: isVencida(bill.fechaVencimiento),
      };
      groups.set(key, group);
    }
    group.bills.push(bill);
    group.pendiente += pendienteDe(bill);
  }

  return [...groups.values()].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
}

export interface DueDateChip {
  /** Grupo de la lista al que lleva el chip (para "Vencidas", el primero con deuda). */
  targetKey: string;
  label: string;
  pendiente: number;
  tipo: "vencidas" | "hoy" | "proxima";
}

/**
 * Resumen de lo que falta pagar por fecha: las fechas ya pagadas se ocultan
 * y todas las vencidas se juntan en un único chip.
 */
export function buildDueDateChips(groups: DueDateGroup[]): DueDateChip[] {
  const conDeuda = groups.filter((g) => g.pendiente > 0);
  const vencidas = conDeuda.filter((g) => g.vencida);
  const chips: DueDateChip[] = [];

  if (vencidas.length > 0) {
    chips.push({
      targetKey: vencidas[0].key,
      label: "Vencidas",
      pendiente: vencidas.reduce((sum, g) => sum + g.pendiente, 0),
      tipo: "vencidas",
    });
  }

  for (const g of conDeuda) {
    if (g.vencida) continue;
    const hoy = isToday(g.fecha);
    chips.push({
      targetKey: g.key,
      label: hoy ? "Hoy" : format(g.fecha, "d MMM", { locale: es }),
      pendiente: g.pendiente,
      tipo: hoy ? "hoy" : "proxima",
    });
  }

  return chips;
}
