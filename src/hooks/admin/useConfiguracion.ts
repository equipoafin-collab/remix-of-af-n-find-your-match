import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { construirConfiguracion, type Configuracion } from "@/lib/configuracion";

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

/**
 * T9.2 · Guarda las claves cambiadas. Las automatizaciones (SQL) y las Edge Functions leen la tabla en cada
 * ejecución: el cambio vale desde su siguiente vuelta. El Dashboard y el listado usan el umbral de pocas sesiones.
 */
export function useGuardarConfiguracion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cambios: Partial<Configuracion>) => {
      const filas = Object.entries(cambios).map(([clave, valor]) => ({ clave, valor }));
      const { error } = await supabase.from("configuracion").upsert(filas);
      if (error) throw error;
    },
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ["configuracion"] }),
      queryClient.invalidateQueries({ queryKey: ["perfiles"] }),
    ]),
  });
}
