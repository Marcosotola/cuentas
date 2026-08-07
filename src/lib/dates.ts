import { isBefore, startOfDay } from "date-fns";

/** Vencida = el día de vencimiento ya pasó (una cuenta que vence hoy no cuenta como vencida). */
export function isVencida(fechaVencimiento: Date): boolean {
  return isBefore(fechaVencimiento, startOfDay(new Date()));
}
