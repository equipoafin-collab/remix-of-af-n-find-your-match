import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { mensajeDeFuncion } from "@/hooks/admin/mensajeDeFuncion";

/** Edge Function del área del cliente, con su mensaje de error ({ error }) o uno de conexión. */
export async function llamarFuncion<T>(nombre: string, body: Record<string, string>, porDefecto: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke(nombre, { body });
  if (error) {
    const sinConexion = !(error instanceof FunctionsHttpError);
    throw new Error(sinConexion ? "No se pudo conectar. Revisa tu conexión e inténtalo de nuevo." : await mensajeDeFuncion(error, porDefecto));
  }
  return data as T;
}

/** Edge Function pública acceso-cliente (T15.1 con el enlace de la ficha, T15.3 con la vuelta del pago). */
export const llamarAccesoCliente = <T>(body: Record<string, string>) => llamarFuncion<T>("acceso-cliente", body, "No se pudo crear tu acceso.");

export interface InfoAcceso {
  nombre: string;
  email: string;
  /** Ya tiene cuenta del área. */
  cuenta: boolean;
}
