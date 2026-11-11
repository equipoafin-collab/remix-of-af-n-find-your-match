import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { conFicha } from "@/lib/disc";

/** T10.5 · Quien ha hecho el test DISC, del más reciente al más antiguo, con su ficha si la tiene. */
export function useLeadsDisc() {
  return useQuery({
    queryKey: ["disc_results", "leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("disc_results")
        .select("id, created_at, name, email, telefono, primary_style, secondary_style, perfiles(id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return conFicha(data);
    },
  });
}
