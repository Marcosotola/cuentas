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
import type { Bill, BillUpdateInput, NewBillInput } from "@/types/bill";

const COLLECTION = "cuentas";

function toBill(id: string, data: Record<string, unknown>): Bill {
  return {
    id,
    descripcion: data.descripcion as string,
    categoria: data.categoria as Bill["categoria"],
    monto: data.monto as number,
    fechaVencimiento: (data.fechaVencimiento as Timestamp).toDate(),
    pagada: Boolean(data.pagada),
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
export async function setPagada(bill: Bill, pagada: boolean): Promise<void> {
  await updateDoc(doc(getDb(), COLLECTION, bill.id), {
    pagada,
    fechaPago: pagada ? Timestamp.fromDate(new Date()) : null,
  });

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
