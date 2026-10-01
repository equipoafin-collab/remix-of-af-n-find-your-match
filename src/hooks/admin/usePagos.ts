import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";

export function usePagos() {
  return useQuery({
    queryKey: ["pagos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("paid_users").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCrearPago() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pago: TablesInsert<"paid_users">) => {
      const { error } = await supabase.from("paid_users").insert(pago);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pagos"] }),
  });
}

export function useEliminarPago() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("paid_users").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pagos"] }),
  });
}
