import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { ResumenSesion } from "../../../supabase/functions/_shared/resumen";

export type { ResumenSesion };

/** Mensaje que devuelve la Edge Function ({ error }) en vez del genérico de supabase-js. */
async function mensajeDeFuncion(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const cuerpo = await error.context.json();
      if (typeof cuerpo?.error === "string") return cuerpo.error;
    } catch {
      // respuesta sin JSON: mensaje genérico
    }
  }
  return error instanceof Error ? error.message : "No se pudo generar el resumen";
}

/** Llama a resumen-sesion (T3.2): guarda el borrador en sesiones.resumen_ia y lo devuelve. */
export function useGenerarResumen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sesionId: string): Promise<ResumenSesion> => {
      const { data, error } = await supabase.functions.invoke("resumen-sesion", { body: { sesion_id: sesionId } });
      if (error) throw new Error(await mensajeDeFuncion(error));
      return data.resumen;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sesiones"] }),
    onError: (error) => toast({ title: "No se pudo generar el resumen", description: error.message, variant: "destructive" }),
  });
}
