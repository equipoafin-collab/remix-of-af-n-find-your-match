import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";

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

// La cita de un match cuenta como próxima cita de los dos en v_clientes (cuelga de ["perfiles"]).
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
    ]),
  });
}
