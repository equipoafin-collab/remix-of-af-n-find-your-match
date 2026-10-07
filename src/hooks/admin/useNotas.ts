import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export function useNotas(perfilId: string) {
  return useQuery({
    queryKey: ["notas", perfilId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notas_privadas").select("*").eq("perfil_id", perfilId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// Crear una nota actualiza ultimo_seguimiento_at del perfil (trigger): se refrescan ambos.
function useInvalidarNotas() {
  const queryClient = useQueryClient();
  return () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["notas"] }),
    queryClient.invalidateQueries({ queryKey: ["perfiles"] }),
    queryClient.invalidateQueries({ queryKey: ["alertas"] }),
    queryClient.invalidateQueries({ queryKey: ["tareas"] }),
  ]);
}

export function useCrearNota() {
  const invalidar = useInvalidarNotas();
  return useMutation({
    mutationFn: async (nota: TablesInsert<"notas_privadas">) => {
      const { error } = await supabase.from("notas_privadas").insert(nota);
      if (error) throw error;
    },
    onSuccess: invalidar,
  });
}

export function useActualizarNota() {
  const invalidar = useInvalidarNotas();
  return useMutation({
    mutationFn: async ({ id, cambios }: { id: string; cambios: TablesUpdate<"notas_privadas"> }) => {
      const { error } = await supabase.from("notas_privadas").update(cambios).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidar,
  });
}

export function useBorrarNota() {
  const invalidar = useInvalidarNotas();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notas_privadas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidar,
  });
}
