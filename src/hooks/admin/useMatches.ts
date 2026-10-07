import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import { mensajeDeFuncion } from "./mensajeDeFuncion";
import { useActualizarAprendizaje } from "./useAprendizaje";

const PERSONA = "id, nombre_completo, edad, zona, ciudad, plan, foto_url";

// Los del cliente en cualquier lado de la pareja (A aceptó la sugerencia, B era el candidato).
export function useMatches(perfilId: string) {
  return useQuery({
    queryKey: ["matches", perfilId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(`*, a:perfiles!matches_perfil_a_fkey(${PERSONA}), b:perfiles!matches_perfil_b_fkey(${PERSONA})`)
        .or(`perfil_a.eq.${perfilId},perfil_b.eq.${perfilId}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
export type MatchConPersonas = NonNullable<ReturnType<typeof useMatches>["data"]>[number];

// La cita de un match cuenta como próxima cita de los dos en v_clientes (cuelga de ["perfiles"]) y los cambios
// de estado crean o completan tareas automáticas (T6.4).
export function useActualizarMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, cambios }: { id: string; cambios: TablesUpdate<"matches"> }) => {
      const { error } = await supabase.from("matches").update(cambios).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ["matches"] }),
      queryClient.invalidateQueries({ queryKey: ["perfiles"] }),
      queryClient.invalidateQueries({ queryKey: ["tareas"] }),
      queryClient.invalidateQueries({ queryKey: ["alertas"] }),
    ]),
  });
}

/** compatibility-report (T6.3): genera el informe del match con IA y lo guarda en matches.informe. */
export function useGenerarInforme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase.functions.invoke("compatibility-report", { body: { match_id: matchId } });
      if (error) throw new Error(await mensajeDeFuncion(error, "No se pudo generar el informe"));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["matches"] }),
    onError: (error) => toast({ title: "No se pudo generar el informe", description: error.message, variant: "destructive" }),
  });
}

export interface Feedback {
  feedback_a: string | null;
  feedback_b: string | null;
  valoracion_a: number | null;
  valoracion_b: number | null;
  quiere_repetir_a: boolean | null;
  quiere_repetir_b: boolean | null;
}

/**
 * T6.5 · Feedback de los dos tras la cita. Con el de ambos, el match pasa a "feedback registrado"; cada texto
 * completa la tarea de su lado y cuenta como seguimiento (triggers). Después aprende de los dos (T5.3).
 */
export function useGuardarFeedback() {
  const queryClient = useQueryClient();
  const aprender = useActualizarAprendizaje();
  return useMutation({
    mutationFn: async ({ match, feedback }: { match: MatchConPersonas; feedback: Feedback }) => {
      const ambos = !!feedback.feedback_a?.trim() && !!feedback.feedback_b?.trim();
      const { error } = await supabase.from("matches").update({
        ...feedback,
        feedback_at: new Date().toISOString(),
        ...(ambos && match.estado === "cita_realizada" && { estado: "feedback_registrado" as const }),
      }).eq("id", match.id);
      if (error) throw error;
    },
    onSuccess: (_, { match }) => {
      aprender.mutate(match.perfil_a);
      aprender.mutate(match.perfil_b);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ["matches"] }),
        queryClient.invalidateQueries({ queryKey: ["tareas"] }),
        queryClient.invalidateQueries({ queryKey: ["perfiles"] }),
        queryClient.invalidateQueries({ queryKey: ["alertas"] }),
      ]);
    },
    onError: (error) => toast({ title: "No se pudo guardar el feedback", description: error.message, variant: "destructive" }),
  });
}
