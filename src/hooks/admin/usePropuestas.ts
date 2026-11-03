import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { PerfilEjemplo } from "@/lib/propuestas";
import { mensajeDeFuncion } from "./mensajeDeFuncion";

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
 * Envía una ronda: con 4 personas reales, o con 4 perfiles de ejemplo (T19.5). El trigger comprueba las personas,
 * sus permisos, los perfiles y que no haya otra abierta.
 */
export function useEnviarRonda() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (r: { perfilId: string } & ({ candidatos: string[]; frases: Record<string, string> } | { ejemplos: PerfilEjemplo[] })) => {
      const fila = "ejemplos" in r
        ? { perfil_id: r.perfilId, de_ejemplo: true, candidatos: [], ejemplos: r.ejemplos as unknown as Json }
        : { perfil_id: r.perfilId, candidatos: r.candidatos, frases: r.frases };
      const { error } = await supabase.from("propuestas_rondas").insert(fila);
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

/** T19.5 · Cuatro perfiles de ejemplo para el cliente (ronda-ejemplo). Solo los genera: se envían con useEnviarRonda. */
export function useGenerarEjemplos() {
  return useMutation({
    mutationFn: async (perfilId: string): Promise<PerfilEjemplo[]> => {
      const { data, error } = await supabase.functions.invoke("ronda-ejemplo", { body: { perfil_id: perfilId } });
      if (error) throw new Error(await mensajeDeFuncion(error, "No se pudieron generar los perfiles"));
      return data.ejemplos;
    },
  });
}
