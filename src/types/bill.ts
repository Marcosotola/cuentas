export type Categoria =
  | "luz"
  | "gas"
  | "agua"
  | "internet"
  | "tarjeta"
  | "alquiler"
  | "expensas"
  | "otro";

export interface Bill {
  id: string;
  descripcion: string;
  categoria: Categoria;
  monto: number;
  fechaVencimiento: Date;
  pagada: boolean;
  fechaPago: Date | null;
  recurrente: boolean;
  observaciones: string;
  createdAt: Date | null;
  /** true si es una cuenta sin pagar arrastrada de un mes anterior (solo en memoria, no se persiste). */
  esArrastre?: boolean;
}

export type NewBillInput = {
  descripcion: string;
  categoria: Categoria;
  monto: number;
  fechaVencimiento: Date;
  recurrente: boolean;
  observaciones: string;
};

export type BillUpdateInput = Partial<
  Pick<
    Bill,
    "descripcion" | "categoria" | "monto" | "fechaVencimiento" | "recurrente" | "observaciones"
  >
>;
