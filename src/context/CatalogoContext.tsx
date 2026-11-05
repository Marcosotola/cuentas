"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ensureAnonymousAuth } from "@/lib/firebase";
import { CATEGORIAS_INICIALES, iconoDe } from "@/lib/categoryMeta";
import { CUENTAS_INICIALES } from "@/lib/cuentasFrecuentes";
import {
  borrarCategoria,
  borrarCuentaGuardada,
  crearCategoria,
  crearCuentaGuardada,
  editarCategoria,
  editarCuentaGuardada,
  subscribeToCatalogo,
} from "@/lib/catalogo";
import type {
  CategoriaInput,
  CategoriaItem,
  CuentaGuardada,
  CuentaGuardadaInput,
} from "@/types/catalogo";

interface Catalogo {
  categorias: CategoriaItem[];
  cuentas: CuentaGuardada[];
  error: string | null;
  /** Nombre e ícono de una categoría por id (con un valor de respaldo si ya no existe). */
  categoria: (id: string) => { nombre: string; icon: LucideIcon };
  crearCategoria: (input: CategoriaInput) => Promise<void>;
  editarCategoria: (id: string, input: CategoriaInput) => Promise<void>;
  borrarCategoria: (id: string) => Promise<void>;
  crearCuenta: (input: CuentaGuardadaInput) => Promise<void>;
  editarCuenta: (id: string, input: CuentaGuardadaInput, renombrarDesde?: string) => Promise<void>;
  borrarCuenta: (id: string) => Promise<void>;
}

const CatalogoContext = createContext<Catalogo | null>(null);

function conAuth<A extends unknown[]>(fn: (...args: A) => Promise<void>) {
  return async (...args: A) => {
    await ensureAnonymousAuth();
    await fn(...args);
  };
}

export function CatalogoProvider({ children }: { children: ReactNode }) {
  const [categoriasDb, setCategoriasDb] = useState<CategoriaItem[]>([]);
  const [cuentas, setCuentas] = useState<CuentaGuardada[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;
    ensureAnonymousAuth()
      .then(() => {
        if (cancelled) return;
        unsubscribe = subscribeToCatalogo(setCategoriasDb, setCuentas, (err) => setError(err.message));
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  // "Otro" no se puede borrar, así que la lista solo está vacía mientras carga
  // por primera vez (o sin conexión antes de la primera carga).
  const categorias = categoriasDb.length > 0 ? categoriasDb : CATEGORIAS_INICIALES;
  // Si no se pudo leer la base (por ejemplo, reglas de Firestore que no permiten
  // estas colecciones) se siguen ofreciendo las cuentas que venían en la app.
  const cuentasVisibles = useMemo(
    () =>
      error && cuentas.length === 0
        ? CUENTAS_INICIALES.map((c, i) => ({ id: `inicial-${i}`, ...c }))
        : cuentas,
    [error, cuentas],
  );

  const porId = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias]);
  const categoria = useCallback(
    (id: string) => {
      const c = porId.get(id);
      return { nombre: c?.nombre ?? "Sin categoría", icon: iconoDe(c?.icono) };
    },
    [porId],
  );

  const value = useMemo<Catalogo>(
    () => ({
      categorias,
      cuentas: cuentasVisibles,
      error,
      categoria,
      crearCategoria: conAuth((input: CategoriaInput) =>
        crearCategoria(input, Math.max(-1, ...categorias.map((c) => c.orden)) + 1),
      ),
      editarCategoria: conAuth(editarCategoria),
      borrarCategoria: conAuth(borrarCategoria),
      crearCuenta: conAuth(crearCuentaGuardada),
      editarCuenta: conAuth(editarCuentaGuardada),
      borrarCuenta: conAuth(borrarCuentaGuardada),
    }),
    [categorias, cuentasVisibles, error, categoria],
  );

  return <CatalogoContext.Provider value={value}>{children}</CatalogoContext.Provider>;
}

export function useCatalogo(): Catalogo {
  const ctx = useContext(CatalogoContext);
  if (!ctx) throw new Error("useCatalogo tiene que usarse dentro de <CatalogoProvider>.");
  return ctx;
}
