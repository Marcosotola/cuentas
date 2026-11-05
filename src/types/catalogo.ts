export interface CategoriaItem {
  /** Id del documento; es lo que se guarda en `Bill.categoria`. */
  id: string;
  nombre: string;
  /** Clave del ícono en `ICONOS_CATEGORIA`. */
  icono: string;
  orden: number;
}

export interface CuentaGuardada {
  id: string;
  nombre: string;
  /** Id de la categoría que se elige automáticamente al usar esta cuenta. */
  categoriaId: string;
}

export type CategoriaInput = Pick<CategoriaItem, "nombre" | "icono">;
export type CuentaGuardadaInput = Pick<CuentaGuardada, "nombre" | "categoriaId">;
