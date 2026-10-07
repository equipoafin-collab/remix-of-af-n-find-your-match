import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { mensajeDeFuncion } from "./mensajeDeFuncion";
import { useActualizarAprendizaje } from "./useAprendizaje";

/** Respuesta de la Edge Function sugerencias-calcular (T4.4): contadores si recalcula, motivo si no. */
export interface ResultadoCalculo {
  recalculado: boolean;
  /** false si la IA no respondió y se guardaron solo las de reglas (T5.2). */
  ia?: boolean;
  pendientes?: number;
  nuevas?: number;
  caducadas?: number;
  motivo?: string;
}

async function calcular(perfilId: string, forzar: boolean): Promise<ResultadoCalculo> {
  const { data, error } = await supabase.functions.invoke("sugerencias-calcular", { body: { perfil_id: perfilId, forzar } });
  if (error) throw new Error(await mensajeDeFuncion(error, "No se pudieron calcular las sugerencias"));
  return data;
}

// Las guardadas se leen al instante; las caducadas no se muestran.
export function useSugerencias(perfilId: string) {
  return useQuery({
    queryKey: ["sugerencias", perfilId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_sugerencias")
        .select("*, candidato:perfiles!match_sugerencias_candidato_id_fkey(id, nombre_completo, edad, zona, ciudad, plan, foto_url)")
        .eq("perfil_id", perfilId)
        .neq("estado", "caducada")
        .order("score", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
export type Sugerencia = NonNullable<ReturnType<typeof useSugerencias>["data"]>[number];

// Las sugerencias cambian el contador de v_clientes (cuelga de ["perfiles"]).
function useInvalidarSugerencias() {
  const queryClient = useQueryClient();
  return (perfilId: string) => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["sugerencias", perfilId] }),
    queryClient.invalidateQueries({ queryKey: ["perfiles"] }),
  ]);
}

/**
 * Recalcula en segundo plano al abrir la ficha, una vez por visita. La función no hace nada si hay
 * sugerencias de menos de 24 h o el cliente no está activo, así que llamarla siempre es barato.
 */
export function useCalculoAutomatico(perfilId: string | undefined) {
  const invalidar = useInvalidarSugerencias();
  return useQuery({
    queryKey: ["sugerencias-calculo", perfilId],
    queryFn: async () => {
      const resultado = await calcular(perfilId as string, false);
      if (resultado.recalculado) await invalidar(perfilId as string);
      return resultado;
    },
    enabled: !!perfilId,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

/** Botón "Recalcular": ignora la vigencia de 24 h. */
export function useRecalcularSugerencias() {
  const invalidar = useInvalidarSugerencias();
  return useMutation({
    mutationFn: (perfilId: string) => calcular(perfilId, true),
    onSuccess: (resultado, perfilId) => {
      toast(resultado.recalculado
        ? {
          title: resultado.ia ? "Sugerencias recalculadas con IA" : "Sugerencias recalculadas solo por reglas",
          description: `${resultado.pendientes} pendientes · ${resultado.nuevas} nuevas · ${resultado.caducadas} caducadas${resultado.pendientes && !resultado.ia ? " · la IA no respondió" : ""}`,
        }
        : { title: "No se han recalculado", description: resultado.motivo });
      return invalidar(perfilId);
    },
    onError: (error) => toast({ title: "No se pudieron recalcular", description: error.message, variant: "destructive" }),
  });
}

/** Aceptar o rechazar. Solo una pendiente: si caducó mientras tanto, avisa en vez de decidir. Después, aprende (T5.3). */
export function useDecidirSugerencia() {
  const invalidar = useInvalidarSugerencias();
  const aprender = useActualizarAprendizaje();
  return useMutation({
    mutationFn: async ({ id, estado, motivo }: { id: string; perfilId: string; estado: "aceptada" | "rechazada"; motivo: string | null }) => {
      const { data, error } = await supabase
        .from("match_sugerencias")
        .update({ estado, motivo_decision: motivo, decidido_at: new Date().toISOString() })
        .eq("id", id).eq("estado", "pendiente")
        .select("id");
      if (error) throw error;
      if (!data.length) throw new Error("Esta sugerencia ya no está pendiente. Recarga la lista.");
    },
    onSuccess: (_, { perfilId }) => {
      aprender.mutate(perfilId);
      return invalidar(perfilId);
    },
    onError: (error) => toast({ title: "No se pudo guardar la decisión", description: error.message, variant: "destructive" }),
  });
}
