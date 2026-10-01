import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Nº de tests DISC completados (leads del embudo). */
export function useConteoDisc() {
  return useQuery({
    queryKey: ["disc_results", "conteo"],
    queryFn: async () => {
      const { count, error } = await supabase.from("disc_results").select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });
}
