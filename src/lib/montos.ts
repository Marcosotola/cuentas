import type { Bill } from "@/types/bill";

/**
 * Lo que la cuenta costó realmente: si está pagada, lo que se pagó (que puede
 * superar el monto por recargos o intereses); si no, su monto.
 */
export function costo(bill: Bill): number {
  return bill.pagada ? Math.max(bill.monto, bill.montoPagado) : bill.monto;
}

/** Lo que se pagó de más sobre el monto de la cuenta (0 si no hubo). */
export function pagadoDeMas(bill: Bill): number {
  return bill.pagada ? Math.max(0, Math.round((bill.montoPagado - bill.monto) * 100) / 100) : 0;
}
