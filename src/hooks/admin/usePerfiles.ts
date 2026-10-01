import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";

// ["perfiles"] es el prefijo común: invalidarlo refresca listado y fichas.
export function usePerfiles() {
  return useQuery({
    queryKey: ["perfiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("perfiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function usePerfil(id: string | undefined) {
  return useQuery({
    queryKey: ["perfiles", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("perfiles").select("*").eq("id", id as string).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useUpdatePerfil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, cambios }: { id: string; cambios: TablesUpdate<"perfiles"> }) => {
      const { error } = await supabase.from("perfiles").update(cambios).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["perfiles"] }),
  });
}
