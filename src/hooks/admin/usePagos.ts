import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export function usePagos() {
  return useQuery({
    queryKey: ["pagos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pagos").select("*").order("fecha", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// Un trigger copia el plan del pago al perfil: hay que refrescar también los perfiles.
function useInvalidarPagos() {
  const queryClient = useQueryClient();
  return () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["pagos"] }),
    queryClient.invalidateQueries({ queryKey: ["perfiles"] }),
  ]);
}

export function useCrearPago() {
  const invalidar = useInvalidarPagos();
  return useMutation({
    mutationFn: async (pago: TablesInsert<"pagos">) => {
      const { error } = await supabase.from("pagos").insert(pago);
      if (error) throw error;
    },
    onSuccess: invalidar,
  });
}

export function useActualizarPago() {
  const invalidar = useInvalidarPagos();
  return useMutation({
    mutationFn: async ({ id, cambios }: { id: string; cambios: TablesUpdate<"pagos"> }) => {
      const { error } = await supabase.from("pagos").update(cambios).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidar,
  });
}

export function useEliminarPago() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pagos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pagos"] }),
  });
}
