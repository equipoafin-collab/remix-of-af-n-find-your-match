import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Lee la tabla configuracion (clave/valor) como objeto. Usar con el cliente service role.
// El tipo y los valores por defecto viven en src/lib/configuracion.ts: si cambian, actualizar también la migración.
export async function leerConfiguracion<T = Record<string, unknown>>(supabase: SupabaseClient): Promise<T> {
  const { data, error } = await supabase.from("configuracion").select("clave, valor");
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((fila) => [fila.clave, fila.valor])) as T;
}
