import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { construirConfiguracion } from "@/lib/configuracion";

export function useConfiguracion() {
  return useQuery({
    queryKey: ["configuracion"],
    queryFn: async () => {
      const { data, error } = await supabase.from("configuracion").select("clave, valor");
      if (error) throw error;
      return construirConfiguracion(data);
    },
  });
}
