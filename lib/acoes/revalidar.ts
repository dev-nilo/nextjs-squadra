import "server-only";
import { revalidatePath } from "next/cache";
import type { Resultado } from "./executar";

/**
 * After a write in a Grupo, every page under /g/<slug> renders again with the
 * new data. One rule for every action, so no screen refreshes by hand. Only
 * called once the action succeeded, so `slug` has already been checked.
 */
export function revalidandoOGrupo<T>(slug: string, resultado: Resultado<T>): Resultado<T> {
  if (resultado.ok) revalidatePath(`/g/${slug}`, "layout");
  return resultado;
}
