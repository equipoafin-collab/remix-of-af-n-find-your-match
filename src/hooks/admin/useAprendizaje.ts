import { useEffect, useRef } from "react";
import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { mensajeDeFuncion } from "./mensajeDeFuncion";
import type { Pesos } from "@/lib/profileMatching";
import { validarPreferencias, type Preferencias } from "../../../supabase/functions/_shared/aprendizaje";

export type { Preferencias };

/** perfil_aprendizaje del cliente, ya validado; null si todavía no hay aprendizaje. */
export function useAprendizaje(perfilId: string) {
  return useQuery({
    queryKey: ["aprendizaje", perfilId],
    enabled: !!perfilId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perfil_aprendizaje").select("preferencias, ajustes_pesos, actualizado_at").eq("perfil_id", perfilId).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        preferencias: validarPreferencias(data.preferencias) ?? { valora: [], evita: [], notas: "" },
        ajustes: (data.ajustes_pesos ?? {}) as Partial<Pesos>,
        actualizadoAt: data.actualizado_at,
      };
    },
  });
}

const CLAVE_ACTUALIZAR = ["actualizar-aprendizaje"];

/** true mientras actualizar-aprendizaje trabaja para este cliente (la lanza otra parte de la ficha). */
export const useActualizandoAprendizaje = (perfilId: string) =>
  useIsMutating({ mutationKey: CLAVE_ACTUALIZAR, predicate: (m) => m.state.variables === perfilId }) > 0;

/**
 * Llama a actualizar-aprendizaje (T5.3) en segundo plano tras aceptar/rechazar o guardar un resumen revisado.
 * Deja las sugerencias pendientes obsoletas: se recalculan al volver a abrir la ficha o con "Recalcular".
 */
export function useActualizarAprendizaje() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: CLAVE_ACTUALIZAR,
    mutationFn: async (perfilId: string) => {
      const { error } = await supabase.functions.invoke("actualizar-aprendizaje", { body: { perfil_id: perfilId } });
      if (error) throw new Error(await mensajeDeFuncion(error, "No se pudo actualizar el aprendizaje"));
    },
    onSuccess: (_, perfilId) => queryClient.invalidateQueries({ queryKey: ["aprendizaje", perfilId] }),
    onError: (error) => toast({ title: "No se pudo actualizar lo aprendido", description: error.message, variant: "destructive" }),
  });
}

/**
 * T19.4 / T19.7 · Lo que el cliente hace en su área (responder una ronda, dejar su feedback) no puede lanzar el
 * aprendizaje, que es solo de administradoras: si es posterior a lo aprendido, se aprende al abrir su ficha.
 * Un intento por novedad (si falla, no se reintenta en bucle).
 */
export function useAprenderDelArea(perfilId: string | undefined) {
  const novedad = useQuery({
    queryKey: ["novedad-area", perfilId],
    enabled: !!perfilId,
    queryFn: async () => {
      const [rondas, matches] = await Promise.all([
        supabase.from("propuestas_rondas").select("respondida_at").eq("perfil_id", perfilId as string)
          .not("respondida_at", "is", null).order("respondida_at", { ascending: false }).limit(1),
        supabase.from("matches").select("feedback_at")
          .or(`and(perfil_a.eq.${perfilId},feedback_a_cliente.is.true),and(perfil_b.eq.${perfilId},feedback_b_cliente.is.true)`)
          .not("feedback_at", "is", null).order("feedback_at", { ascending: false }).limit(1),
      ]);
      if (rondas.error) throw rondas.error;
      if (matches.error) throw matches.error;
      return [rondas.data[0]?.respondida_at, matches.data[0]?.feedback_at]
        .reduce<string | null>((max, f) => (f && (!max || new Date(f) > new Date(max)) ? f : max), null);
    },
  });
  const aprendizaje = useAprendizaje(perfilId ?? "");
  const actualizando = useActualizandoAprendizaje(perfilId ?? "");
  const { mutate: aprender } = useActualizarAprendizaje();
  const intentada = useRef<string | null>(null);
  const ultima = novedad.data ?? null;
  const pendiente = !!ultima && aprendizaje.isSuccess &&
    (!aprendizaje.data || new Date(aprendizaje.data.actualizadoAt) < new Date(ultima));

  useEffect(() => {
    if (!perfilId || !pendiente || actualizando || intentada.current === ultima) return;
    intentada.current = ultima;
    aprender(perfilId);
  }, [perfilId, pendiente, actualizando, ultima, aprender]);
}

/** La psicóloga corrige las preferencias a mano; los ajustes de pesos los recalcula la función. */
export function useGuardarPreferencias() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ perfilId, preferencias }: { perfilId: string; preferencias: Preferencias }) => {
      const limpias = validarPreferencias(preferencias);
      const { error } = await supabase.from("perfil_aprendizaje").upsert(
        { perfil_id: perfilId, preferencias: limpias, actualizado_at: new Date().toISOString() },
        { onConflict: "perfil_id" },
      );
      if (error) throw error;
    },
    onSuccess: (_, { perfilId }) => {
      toast({ title: "Preferencias guardadas", description: "Pulsa Recalcular para ver ya las sugerencias con ellas." });
      return queryClient.invalidateQueries({ queryKey: ["aprendizaje", perfilId] });
    },
    onError: (error) => toast({ title: "No se pudieron guardar", description: error.message, variant: "destructive" }),
  });
}
