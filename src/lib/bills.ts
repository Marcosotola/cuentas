import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDb } from "./firebase";
import type { Bill, BillUpdateInput, NewBillInput, Pago } from "@/types/bill";

const COLLECTION = "cuentas";

function toPagos(raw: unknown): Pago[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p: { importe: number; fecha: Timestamp }) => ({
    importe: p.importe,
    fecha: p.fecha.toDate(),
  }));
}

function redondear(monto: number): number {
  return Math.round(monto * 100) / 100;
}

function sumarPagos(pagos: Pago[]): number {
  return redondear(pagos.reduce((total, p) => total + p.importe, 0));
}

function fromPagos(pagos: Pago[]) {
  return pagos.map((p) => ({ importe: p.importe, fecha: Timestamp.fromDate(p.fecha) }));
}

function toBill(id: string, data: Record<string, unknown>): Bill {
  const monto = data.monto as number;
  const pagada = Boolean(data.pagada);
  return {
    id,
    descripcion: data.descripcion as string,
    categoria: data.categoria as Bill["categoria"],
    monto,
    // Las cuentas guardadas antes de los pagos parciales no tienen el campo.
    montoPagado: pagada ? monto : typeof data.montoPagado === "number" ? data.montoPagado : 0,
    pagos: toPagos(data.pagos),
    fechaVencimiento: (data.fechaVencimiento as Timestamp).toDate(),
    pagada,
    fechaPago: data.fechaPago ? (data.fechaPago as Timestamp).toDate() : null,
    recurrente: Boolean(data.recurrente),
    observaciones: (data.observaciones as string) ?? "",
    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : null,
  };
}

export function subscribeToBills(
  range: { start: Date; end: Date } | null,
  onChange: (bills: Bill[]) => void,
  onError: (error: Error) => void,
): () => void {
  const col = collection(getDb(), COLLECTION);
  const constraints = range
    ? [
        where("fechaVencimiento", ">=", Timestamp.fromDate(range.start)),
        where("fechaVencimiento", "<=", Timestamp.fromDate(range.end)),
        orderBy("fechaVencimiento", "asc"),
      ]
    : [orderBy("fechaVencimiento", "asc")];

  const q = query(col, ...constraints);
  return onSnapshot(
    q,
    (snapshot) => {
      onChange(snapshot.docs.map((d) => toBill(d.id, d.data())));
    },
    onError,
  );
}

/**
 * Igual que subscribeToBills, pero además suma las cuentas pendientes de
 * meses anteriores (sin pagar) para que no se pierdan de vista al pasar de
 * mes. Usa dos listeners simples (sin índice compuesto): uno para el rango
 * del mes y otro solo por "pagada == false", filtrando el arrastre en el
 * cliente.
 */
export function subscribeToBillsForCurrentMonth(
  range: { start: Date; end: Date },
  onChange: (bills: Bill[]) => void,
  onError: (error: Error) => void,
): () => void {
  const col = collection(getDb(), COLLECTION);
  let monthBills: Bill[] = [];
  let carryoverBills: Bill[] = [];

  function emit() {
    const byId = new Map<string, Bill>();
    for (const bill of [...carryoverBills, ...monthBills]) byId.set(bill.id, bill);
    const merged = [...byId.values()].sort(
      (a, b) => a.fechaVencimiento.getTime() - b.fechaVencimiento.getTime(),
    );
    onChange(merged);
  }

  const unsubMonth = onSnapshot(
    query(
      col,
      where("fechaVencimiento", ">=", Timestamp.fromDate(range.start)),
      where("fechaVencimiento", "<=", Timestamp.fromDate(range.end)),
      orderBy("fechaVencimiento", "asc"),
    ),
    (snapshot) => {
      monthBills = snapshot.docs.map((d) => ({ ...toBill(d.id, d.data()), esArrastre: false }));
      emit();
    },
    onError,
  );

  const unsubUnpaid = onSnapshot(
    query(col, where("pagada", "==", false)),
    (snapshot) => {
      carryoverBills = snapshot.docs
        .map((d) => toBill(d.id, d.data()))
        .filter((bill) => bill.fechaVencimiento < range.start)
        .map((bill) => ({ ...bill, esArrastre: true }));
      emit();
    },
    onError,
  );

  return () => {
    unsubMonth();
    unsubUnpaid();
  };
}

export async function addBill(input: NewBillInput): Promise<void> {
  await addDoc(collection(getDb(), COLLECTION), {
    descripcion: input.descripcion,
    categoria: input.categoria,
    monto: input.monto,
    fechaVencimiento: Timestamp.fromDate(input.fechaVencimiento),
    recurrente: input.recurrente,
    observaciones: input.observaciones,
    pagada: false,
    montoPagado: 0,
    pagos: [],
    fechaPago: null,
    createdAt: serverTimestamp(),
  });
}

export async function updateBill(
  id: string,
  input: BillUpdateInput,
): Promise<void> {
  const payload: Record<string, unknown> = { ...input };
  if (input.fechaVencimiento) {
    payload.fechaVencimiento = Timestamp.fromDate(input.fechaVencimiento);
  }
  await updateDoc(doc(getDb(), COLLECTION, id), payload);
}

export async function deleteBill(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), COLLECTION, id));
}

function addOneMonth(date: Date): Date {
  const next = new Date(date);
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + 1);
  const lastDayOfNextMonth = new Date(
    next.getFullYear(),
    next.getMonth() + 1,
    0,
  ).getDate();
  next.setDate(Math.min(day, lastDayOfNextMonth));
  return next;
}

/**
 * Marca una cuenta como pagada/pendiente. Si se marca como pagada y es
 * recurrente, genera automáticamente la copia del mes siguiente (sin
 * depender de Cloud Functions programadas).
 */
export async function setPagada(
  bill: Bill,
  pagada: boolean,
  fechaPago: Date = new Date(),
): Promise<void> {
  const ref = doc(getDb(), COLLECTION, bill.id);

  if (pagada) {
    await updateDoc(ref, {
      pagada: true,
      montoPagado: bill.monto,
      fechaPago: Timestamp.fromDate(fechaPago),
    });
  } else {
    // Al volver a pendiente se conservan los pagos parciales registrados. Si esos
    // pagos ya cubrían todo el monto (la cuenta se cerró con el último), se
    // deshacen los últimos hasta que vuelva a quedar saldo por pagar.
    const pagos = [...bill.pagos];
    let acumulado = sumarPagos(pagos);
    while (pagos.length > 0 && acumulado >= bill.monto) {
      acumulado = redondear(acumulado - pagos.pop()!.importe);
    }
    await updateDoc(ref, {
      pagada: false,
      montoPagado: acumulado,
      pagos: fromPagos(pagos),
      fechaPago: null,
    });
  }

  if (pagada && bill.recurrente) {
    await addBill({
      descripcion: bill.descripcion,
      categoria: bill.categoria,
      monto: bill.monto,
      fechaVencimiento: addOneMonth(bill.fechaVencimiento),
      recurrente: true,
      observaciones: bill.observaciones,
    });
  }
}

/**
 * Guarda el historial de pagos (ordenado por fecha) y el total pagado. Si el
 * total cubre el monto, la cuenta pasa a pagada con la fecha del último pago
 * (y, si es recurrente, se genera la del mes siguiente).
 */
async function guardarPagos(bill: Bill, pagos: Pago[], montoPagado: number): Promise<void> {
  const ordenados = [...pagos].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  const ref = doc(getDb(), COLLECTION, bill.id);

  if (montoPagado >= bill.monto) {
    // Se guarda el historial antes de cerrar la cuenta, así el último pago queda registrado.
    await updateDoc(ref, { pagos: fromPagos(ordenados) });
    await setPagada(bill, true, ordenados[ordenados.length - 1].fecha);
    return;
  }
  await updateDoc(ref, { montoPagado, pagos: fromPagos(ordenados) });
}

/** Suma un pago parcial (con la fecha en que se hizo) a la cuenta. */
export async function registrarPago(bill: Bill, importe: number, fecha: Date): Promise<void> {
  await guardarPagos(
    bill,
    [...bill.pagos, { importe, fecha }],
    redondear(bill.montoPagado + importe),
  );
}

/** Corrige el importe y/o la fecha de un pago parcial ya registrado (solo en cuentas pendientes). */
export async function editarPago(
  bill: Bill,
  index: number,
  importe: number,
  fecha: Date,
): Promise<void> {
  const anterior = bill.pagos[index];
  if (bill.pagada || !anterior) return;
  await guardarPagos(
    bill,
    bill.pagos.map((p, i) => (i === index ? { importe, fecha } : p)),
    redondear(bill.montoPagado - anterior.importe + importe),
  );
}

/** Borra un pago parcial cargado por error (solo en cuentas pendientes). */
export async function eliminarPago(bill: Bill, index: number): Promise<void> {
  const quitado = bill.pagos[index];
  if (bill.pagada || !quitado) return;
  await updateDoc(doc(getDb(), COLLECTION, bill.id), {
    pagos: fromPagos(bill.pagos.filter((_, i) => i !== index)),
    montoPagado: Math.max(0, redondear(bill.montoPagado - quitado.importe)),
  });
}

export async function duplicateBillNextMonth(bill: Bill): Promise<void> {
  await addBill({
    descripcion: bill.descripcion,
    categoria: bill.categoria,
    monto: bill.monto,
    fechaVencimiento: addOneMonth(bill.fechaVencimiento),
    recurrente: bill.recurrente,
    observaciones: bill.observaciones,
  });
}
