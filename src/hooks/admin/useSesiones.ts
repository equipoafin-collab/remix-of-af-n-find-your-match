import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSesiones(perfilId: string) {
  return useQuery({
    queryKey: ["sesiones", perfilId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sesiones").select("*").eq("perfil_id", perfilId).order("fecha_hora", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
