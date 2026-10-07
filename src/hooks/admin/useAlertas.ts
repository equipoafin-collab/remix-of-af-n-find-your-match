import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AlertaSeveridad, AlertaTipo } from "@/types/admin";

export interface FiltrosAlertas {
  perfilId?: string;
  /** "pendientes" = sin resolver (abiertas o vistas). */
  estado?: "pendientes" | "resuelta";
  severidad?: AlertaSeveridad;
  tipo?: AlertaTipo;
  limite?: number;
}

const ORDEN_SEVERIDAD: Record<AlertaSeveridad, number> = { urgente: 0, aviso: 1, info: 2 };

// Urgentes primero y, dentro de cada severidad, las más recientes.
export function useAlertas(filtros: FiltrosAlertas = {}) {
  return useQuery({
    queryKey: ["alertas", filtros],
    queryFn: async () => {
      let q = supabase.from("alertas").select("*, perfil:perfiles!alertas_perfil_id_fkey(id, nombre_completo)");
      if (filtros.perfilId) q = q.eq("perfil_id", filtros.perfilId);
      if (filtros.estado === "pendientes") q = q.neq("estado", "resuelta");
      if (filtros.estado === "resuelta") q = q.eq("estado", "resuelta");
      if (filtros.severidad) q = q.eq("severidad", filtros.severidad);
      if (filtros.tipo) q = q.eq("tipo", filtros.tipo);
      // ponytail: tope de 1.000 filas de PostgREST; filtrar por fecha o paginar si se acumulan muchas resueltas.
      const { data, error } = await q.order("created_at", { ascending: false }).limit(filtros.limite ?? 1000);
      if (error) throw error;
      return [...data].sort((a, b) => ORDEN_SEVERIDAD[a.severidad] - ORDEN_SEVERIDAD[b.severidad]);
    },
  });
}
export type AlertaConPerfil = NonNullable<ReturnType<typeof useAlertas>["data"]>[number];

/** Alertas sin ver (estado "abierta") para el contador de la campana. */
export function useAlertasSinVer() {
  return useQuery({
    queryKey: ["alertas", "sin-ver"],
    queryFn: async () => {
      const { count, error } = await supabase.from("alertas").select("id", { count: "exact", head: true }).eq("estado", "abierta");
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60_000, // las crean también las automatizaciones (T7.2/T7.3)
  });
}

/** Marcar vista o resolver (resuelta_at lo sella un trigger). Cambian el contador de v_clientes (["perfiles"]). */
export function useActualizarAlerta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: "vista" | "resuelta" }) => {
      const { error } = await supabase.from("alertas").update({ estado }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ["alertas"] }),
      queryClient.invalidateQueries({ queryKey: ["perfiles"] }),
    ]),
  });
}
