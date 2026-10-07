import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mensajeDeFuncion } from "./mensajeDeFuncion";

/** Jobs de pg_cron con su última ejecución (T7.3). */
export function useEstadoAutomatizaciones() {
  return useQuery({
    queryKey: ["automatizaciones"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("estado_automatizaciones");
      if (error) throw error;
      return data;
    },
    refetchInterval: 60_000,
  });
}

export interface ResultadoEjecucion {
  automatizaciones: { alertas_creadas: number; alertas_resueltas: number; tareas_creadas: number; tareas_completadas: number };
  cola: { procesados: number; detecciones: unknown[] };
}

/** "Ejecutar ahora": lo mismo que hacen los dos jobs, sin esperar a la próxima vuelta. */
export function useEjecutarAutomatizaciones() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<ResultadoEjecucion> => {
      const { data: automatizaciones, error } = await supabase.rpc("evaluar_automatizaciones");
      if (error) throw error;
      const { data: cola, error: errorCola } = await supabase.functions.invoke("procesar-cola-matching", { body: {} });
      if (errorCola) throw new Error(await mensajeDeFuncion(errorCola, "No se pudo procesar la cola de matching"));
      return { automatizaciones: automatizaciones as unknown as ResultadoEjecucion["automatizaciones"], cola };
    },
    onSuccess: () =>
      Promise.all(["alertas", "tareas", "perfiles", "sugerencias", "automatizaciones"].map((k) => queryClient.invalidateQueries({ queryKey: [k] }))),
  });
}
