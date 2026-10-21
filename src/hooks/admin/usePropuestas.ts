import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActualizandoAprendizaje, useActualizarAprendizaje, useAprendizaje } from "./useAprendizaje";

/** T19.2 · Rondas de propuestas del cliente, la más reciente primero. */
export function useRondas(perfilId: string) {
  return useQuery({
    queryKey: ["rondas", perfilId],
    queryFn: async () => {
      const { data, error } = await supabase.from("propuestas_rondas").select("*").eq("perfil_id", perfilId).order("enviada_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

/**
 * T19.4 · El cliente responde desde su área, sin poder lanzar el aprendizaje: si su última respuesta es posterior a lo
 * aprendido, se aprende al abrir sus sugerencias. Un intento por respuesta (si falla, no se reintenta en bucle).
 */
export function useAprenderDeRondas(perfilId: string) {
  const { data: rondas } = useRondas(perfilId);
  const aprendizaje = useAprendizaje(perfilId);
  const actualizando = useActualizandoAprendizaje(perfilId);
  const { mutate: aprender } = useActualizarAprendizaje();
  const intentada = useRef<string>();
  const respondida = rondas?.find((r) => r.respondida_at)?.respondida_at;
  const pendiente = !!respondida && aprendizaje.isSuccess &&
    (!aprendizaje.data || new Date(aprendizaje.data.actualizadoAt) < new Date(respondida));

  useEffect(() => {
    if (!pendiente || actualizando || intentada.current === respondida) return;
    intentada.current = respondida;
    aprender(perfilId);
  }, [pendiente, actualizando, respondida, aprender, perfilId]);
}

/** Envía una ronda: el trigger comprueba las 4 personas, sus permisos y que no haya otra abierta. */
export function useEnviarRonda() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (r: { perfilId: string; candidatos: string[]; frases: Record<string, string> }) => {
      const { error } = await supabase.from("propuestas_rondas").insert({ perfil_id: r.perfilId, candidatos: r.candidatos, frases: r.frases });
      if (error) throw error;
    },
    onSuccess: (_d, r) => queryClient.invalidateQueries({ queryKey: ["rondas", r.perfilId] }),
  });
}

export function useCancelarRonda() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (r: { id: string; perfilId: string }) => {
      const { error } = await supabase.from("propuestas_rondas").update({ estado: "cancelada" }).eq("id", r.id).eq("estado", "abierta");
      if (error) throw error;
    },
    onSuccess: (_d, r) => queryClient.invalidateQueries({ queryKey: ["rondas", r.perfilId] }),
  });
}
