/** Id de un documento de la colección `categorias`. */
export type Categoria = string;

export interface Pago {
  importe: number;
  fecha: Date;
}

export interface Bill {
  id: string;
  descripcion: string;
  categoria: Categoria;
  monto: number;
  /**
   * Suma de los pagos registrados. Cuando la cuenta está pagada es al menos
   * `monto`, y puede ser más si se pagó de más (recargos, intereses).
   */
  montoPagado: number;
  /** Historial de pagos parciales, en el orden en que se registraron. */
  pagos: Pago[];
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
