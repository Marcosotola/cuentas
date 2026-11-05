import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getDb } from "./firebase";
import { CATEGORIAS_INICIALES, ICONO_POR_DEFECTO } from "./categoryMeta";
import { CUENTAS_INICIALES } from "./cuentasFrecuentes";
import type {
  CategoriaInput,
  CategoriaItem,
  CuentaGuardada,
  CuentaGuardadaInput,
} from "@/types/catalogo";

const CATEGORIAS = "categorias";
/** "cuentas" ya la usan las cuentas a pagar de cada mes. */
const CUENTAS_GUARDADAS = "cuentas_guardadas";
const BILLS = "cuentas";
/** Marca que la carga inicial ya se hizo, para no volver a crear lo que el usuario borró. */
const MARCA = ["configuracion", "catalogo"] as const;

/** Categoría a la que pasan las cuentas cuando se borra la suya. No se puede borrar. */
export const CATEGORIA_COMODIN = "otro";

function slug(texto: string): string {
  return (
    texto
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "cuenta"
  );
}

/** Crea las categorías y cuentas que venían en la app. Usa ids fijos, así correrla dos veces no duplica nada. */
async function sembrar(): Promise<void> {
  const db = getDb();
  const batch = writeBatch(db);
  for (const c of CATEGORIAS_INICIALES) {
    batch.set(doc(db, CATEGORIAS, c.id), {
      nombre: c.nombre,
      icono: c.icono,
      orden: c.orden,
      createdAt: serverTimestamp(),
    });
  }
  for (const c of CUENTAS_INICIALES) {
    batch.set(doc(db, CUENTAS_GUARDADAS, slug(c.nombre)), {
      nombre: c.nombre,
      categoriaId: c.categoriaId,
      createdAt: serverTimestamp(),
    });
  }
  batch.set(doc(db, ...MARCA), { sembrado: true, createdAt: serverTimestamp() });
  await batch.commit();
}

const porNombre = (a: { nombre: string }, b: { nombre: string }) =>
  a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });

export function subscribeToCatalogo(
  onCategorias: (categorias: CategoriaItem[]) => void,
  onCuentas: (cuentas: CuentaGuardada[]) => void,
  onError: (error: Error) => void,
): () => void {
  const db = getDb();
  let sembrando = false;

  const unsubMarca = onSnapshot(
    doc(db, ...MARCA),
    { includeMetadataChanges: true },
    (snap) => {
      // Solo se decide con la respuesta del servidor: la caché vacía no significa que no exista.
      if (snap.metadata.fromCache || snap.exists() || sembrando) return;
      sembrando = true;
      sembrar().catch(onError);
    },
    onError,
  );

  const unsubCategorias = onSnapshot(
    collection(db, CATEGORIAS),
    (snap) => {
      onCategorias(
        snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              nombre: (data.nombre as string) ?? d.id,
              icono: (data.icono as string) ?? ICONO_POR_DEFECTO,
              orden: typeof data.orden === "number" ? data.orden : 999,
            };
          })
          .sort((a, b) => a.orden - b.orden || porNombre(a, b)),
      );
    },
    onError,
  );

  const unsubCuentas = onSnapshot(
    collection(db, CUENTAS_GUARDADAS),
    (snap) => {
      onCuentas(
        snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              nombre: data.nombre as string,
              categoriaId: (data.categoriaId as string) ?? CATEGORIA_COMODIN,
            };
          })
          .sort(porNombre),
      );
    },
    onError,
  );

  return () => {
    unsubMarca();
    unsubCategorias();
    unsubCuentas();
  };
}

export async function crearCategoria(input: CategoriaInput, orden: number): Promise<void> {
  await addDoc(collection(getDb(), CATEGORIAS), { ...input, orden, createdAt: serverTimestamp() });
}

export async function editarCategoria(id: string, input: CategoriaInput): Promise<void> {
  await updateDoc(doc(getDb(), CATEGORIAS, id), input);
}

/**
 * Borra la categoría y pasa a "Otro" tanto las cuentas guardadas como las
 * cuentas a pagar que la usaban, para que ninguna quede sin categoría.
 */
export async function borrarCategoria(id: string): Promise<void> {
  if (id === CATEGORIA_COMODIN) throw new Error("La categoría “Otro” no se puede borrar.");
  const db = getDb();
  const [guardadas, bills] = await Promise.all([
    getDocs(query(collection(db, CUENTAS_GUARDADAS), where("categoriaId", "==", id))),
    getDocs(query(collection(db, BILLS), where("categoria", "==", id))),
  ]);

  const refs = [
    ...guardadas.docs.map((d) => ({ ref: d.ref, campo: "categoriaId" })),
    ...bills.docs.map((d) => ({ ref: d.ref, campo: "categoria" })),
  ];
  // Un batch admite hasta 500 escrituras.
  for (let i = 0; i < refs.length; i += 450) {
    const batch = writeBatch(db);
    for (const { ref, campo } of refs.slice(i, i + 450)) {
      batch.update(ref, { [campo]: CATEGORIA_COMODIN });
    }
    await batch.commit();
  }
  await deleteDoc(doc(db, CATEGORIAS, id));
}

export async function crearCuentaGuardada(input: CuentaGuardadaInput): Promise<void> {
  await addDoc(collection(getDb(), CUENTAS_GUARDADAS), { ...input, createdAt: serverTimestamp() });
}

export async function editarCuentaGuardada(id: string, input: CuentaGuardadaInput): Promise<void> {
  await updateDoc(doc(getDb(), CUENTAS_GUARDADAS, id), input);
}

export async function borrarCuentaGuardada(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), CUENTAS_GUARDADAS, id));
}
