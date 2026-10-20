import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
