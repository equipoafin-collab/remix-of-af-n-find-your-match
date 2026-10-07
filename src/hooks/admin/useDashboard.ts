import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { rangoDeHoy } from "@/lib/dashboard";

/** Respuesta de dashboard_resumen() (T8.1). */
export interface DashboardResumen {
  clientes_activos: number;
  sesiones_hoy: number;
  citas_hoy: number;
  nuevos_clientes: number;
  premium: number;
  pendientes_matching: number;
  informes_pendientes: number;
  feedbacks_pendientes: number;
  pocas_sesiones: number;
  pausados: number;
  bajas: number;
  nuevos_compatibles: number;
  alertas_urgentes: number;
  umbral_pocas_sesiones: number;
}

// Todo cuelga de ["perfiles"]: sesiones, matches, tareas y alertas ya lo invalidan al cambiar.
export function useDashboardResumen() {
  return useQuery({
    queryKey: ["perfiles", "dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("dashboard_resumen");
      if (error) throw error;
      return data as unknown as DashboardResumen;
    },
  });
}

export function useSinRevisar() {
  return useQuery({
    queryKey: ["perfiles", "sin-revisar"],
    queryFn: async () => {
      const { count, error } = await supabase.from("perfiles").select("id", { count: "exact", head: true }).eq("revisado", false);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

/** Agenda de hoy: sesiones no canceladas y citas de matches (agendadas o ya hechas), por hora. */
export function useAgendaHoy() {
  return useQuery({
    queryKey: ["perfiles", "agenda-hoy"],
    queryFn: async () => {
      const { desde, hasta } = rangoDeHoy();
      const [sesiones, citas] = await Promise.all([
        supabase.from("sesiones")
          .select("id, fecha_hora, tipo, estado, perfil:perfiles!sesiones_perfil_id_fkey(id, nombre_completo)")
          .gte("fecha_hora", desde).lt("fecha_hora", hasta).neq("estado", "cancelada"),
        supabase.from("matches")
          .select("id, fecha_cita, lugar, estado, a:perfiles!matches_perfil_a_fkey(id, nombre_completo), b:perfiles!matches_perfil_b_fkey(id, nombre_completo)")
          .gte("fecha_cita", desde).lt("fecha_cita", hasta).in("estado", ["cita_agendada", "cita_realizada"]),
      ]);
      if (sesiones.error) throw sesiones.error;
      if (citas.error) throw citas.error;
      return [
        ...sesiones.data.map((s) => ({
          id: s.id, hora: s.fecha_hora, estado: s.estado as string, cita: false,
          detalle: s.tipo === "primera" ? "Primera sesión" : "Sesión de seguimiento",
          personas: s.perfil ? [s.perfil] : [],
        })),
        ...citas.data.map((m) => ({
          id: m.id, hora: m.fecha_cita as string, estado: m.estado as string, cita: true,
          detalle: m.lugar ? `Cita · ${m.lugar}` : "Cita",
          personas: [m.a, m.b].filter((p) => !!p),
        })),
      ].sort((x, y) => Date.parse(x.hora) - Date.parse(y.hora));
    },
  });
}
export type EventoAgenda = NonNullable<ReturnType<typeof useAgendaHoy>["data"]>[number];
