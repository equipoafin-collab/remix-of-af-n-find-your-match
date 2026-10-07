import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { ResumenSesion } from "../../../supabase/functions/_shared/resumen";
import { mensajeDeFuncion } from "./mensajeDeFuncion";
import { useActualizarAprendizaje } from "./useAprendizaje";

export type { ResumenSesion };

/** Llama a resumen-sesion (T3.2): guarda el borrador en sesiones.resumen_ia y lo devuelve. */
export function useGenerarResumen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sesionId: string): Promise<ResumenSesion> => {
      const { data, error } = await supabase.functions.invoke("resumen-sesion", { body: { sesion_id: sesionId } });
      if (error) throw new Error(await mensajeDeFuncion(error, "No se pudo generar el resumen"));
      return data.resumen;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sesiones"] }),
    onError: (error) => toast({ title: "No se pudo generar el resumen", description: error.message, variant: "destructive" }),
  });
}

/**
 * "Guardar como revisado" (T3.3): el resumen editado pasa a revisado y cuenta como seguimiento.
 * ponytail: dos updates sin transacción; si falla el segundo solo se pierde el sello de seguimiento.
 */
export function useGuardarResumen() {
  const queryClient = useQueryClient();
  const aprender = useActualizarAprendizaje(); // el resumen revisado alimenta el aprendizaje (T5.3)
  return useMutation({
    mutationFn: async ({ sesionId, perfilId, resumen, notas }: { sesionId: string; perfilId: string; resumen: ResumenSesion; notas: string }) => {
      const ahora = new Date().toISOString();
      const { error } = await supabase
        .from("sesiones")
        .update({ resumen_ia: resumen, resumen_estado: "revisado", resumen_revisado_at: ahora, notas_brutas: notas })
        .eq("id", sesionId);
      if (error) throw error;
      const { error: errorPerfil } = await supabase.from("perfiles").update({ ultimo_seguimiento_at: ahora }).eq("id", perfilId);
      if (errorPerfil) throw errorPerfil;
    },
    onSuccess: (_, { perfilId }) => {
      aprender.mutate(perfilId);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sesiones"] }),
        queryClient.invalidateQueries({ queryKey: ["perfiles"] }),
        queryClient.invalidateQueries({ queryKey: ["alertas"] }),
        queryClient.invalidateQueries({ queryKey: ["tareas"] }),
      ]);
    },
    onError: (error) => toast({ title: "No se pudo guardar el resumen", description: error.message, variant: "destructive" }),
  });
}
