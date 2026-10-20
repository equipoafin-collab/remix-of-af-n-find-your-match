import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { mensajeDeFuncion } from "@/hooks/admin/mensajeDeFuncion";

/** Edge Function pública acceso-cliente (T15.1 con el enlace de la ficha, T15.3 con la vuelta del pago). */
export async function llamarAccesoCliente<T>(body: Record<string, string>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("acceso-cliente", { body });
  if (error) {
    const sinConexion = !(error instanceof FunctionsHttpError);
    throw new Error(sinConexion ? "No se pudo conectar. Revisa tu conexión e inténtalo de nuevo." : await mensajeDeFuncion(error, "No se pudo crear tu acceso."));
  }
  return data as T;
}

export interface InfoAcceso {
  nombre: string;
  email: string;
  /** Ya tiene cuenta del área. */
  cuenta: boolean;
}
