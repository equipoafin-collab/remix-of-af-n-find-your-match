import { FunctionsHttpError } from "@supabase/supabase-js";

/** Mensaje que devuelve una Edge Function ({ error }) en vez del genérico de supabase-js. */
export async function mensajeDeFuncion(error: unknown, porDefecto: string): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const cuerpo = await error.context.json();
      if (typeof cuerpo?.error === "string") return cuerpo.error;
    } catch {
      // respuesta sin JSON: mensaje genérico
    }
  }
  return error instanceof Error ? error.message : porDefecto;
}
