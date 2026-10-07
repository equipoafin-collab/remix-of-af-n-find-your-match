import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { mensajeDeFuncion } from "./mensajeDeFuncion";
import type { Pesos } from "@/lib/profileMatching";
import { validarPreferencias, type Preferencias } from "../../../supabase/functions/_shared/aprendizaje";

export type { Preferencias };

/** perfil_aprendizaje del cliente, ya validado; null si todavía no hay aprendizaje. */
export function useAprendizaje(perfilId: string) {
  return useQuery({
    queryKey: ["aprendizaje", perfilId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perfil_aprendizaje").select("preferencias, ajustes_pesos, actualizado_at").eq("perfil_id", perfilId).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        preferencias: validarPreferencias(data.preferencias) ?? { valora: [], evita: [], notas: "" },
        ajustes: (data.ajustes_pesos ?? {}) as Partial<Pesos>,
        actualizadoAt: data.actualizado_at,
      };
    },
  });
}

const CLAVE_ACTUALIZAR = ["actualizar-aprendizaje"];

/** true mientras actualizar-aprendizaje trabaja para este cliente (la lanza otra parte de la ficha). */
export const useActualizandoAprendizaje = (perfilId: string) =>
  useIsMutating({ mutationKey: CLAVE_ACTUALIZAR, predicate: (m) => m.state.variables === perfilId }) > 0;

/**
 * Llama a actualizar-aprendizaje (T5.3) en segundo plano tras aceptar/rechazar o guardar un resumen revisado.
 * Deja las sugerencias pendientes obsoletas: se recalculan al volver a abrir la ficha o con "Recalcular".
 */
export function useActualizarAprendizaje() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: CLAVE_ACTUALIZAR,
    mutationFn: async (perfilId: string) => {
      const { error } = await supabase.functions.invoke("actualizar-aprendizaje", { body: { perfil_id: perfilId } });
      if (error) throw new Error(await mensajeDeFuncion(error, "No se pudo actualizar el aprendizaje"));
    },
    onSuccess: (_, perfilId) => queryClient.invalidateQueries({ queryKey: ["aprendizaje", perfilId] }),
    onError: (error) => toast({ title: "No se pudo actualizar lo aprendido", description: error.message, variant: "destructive" }),
  });
}

/** La psicóloga corrige las preferencias a mano; los ajustes de pesos los recalcula la función. */
export function useGuardarPreferencias() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ perfilId, preferencias }: { perfilId: string; preferencias: Preferencias }) => {
      const limpias = validarPreferencias(preferencias);
      const { error } = await supabase.from("perfil_aprendizaje").upsert(
        { perfil_id: perfilId, preferencias: limpias, actualizado_at: new Date().toISOString() },
        { onConflict: "perfil_id" },
      );
      if (error) throw error;
    },
    onSuccess: (_, { perfilId }) => {
      toast({ title: "Preferencias guardadas", description: "Pulsa Recalcular para ver ya las sugerencias con ellas." });
      return queryClient.invalidateQueries({ queryKey: ["aprendizaje", perfilId] });
    },
    onError: (error) => toast({ title: "No se pudieron guardar", description: error.message, variant: "destructive" }),
  });
}
