import type { Enums, Tables } from "@/integrations/supabase/types";

export type Perfil = Tables<"perfiles">;
export type Pago = Tables<"pagos">;
export type DiscResult = Tables<"disc_results">;
export type Nota = Tables<"notas_privadas">;
export type Sesion = Tables<"sesiones">;
export type Match = Tables<"matches">;
export type MatchEstado = Enums<"match_estado">;
export type Tarea = Tables<"tareas">;
export type TareaTipo = Enums<"tarea_tipo">;
export type Alerta = Tables<"alertas">;
export type AlertaTipo = Enums<"alerta_tipo">;
export type AlertaSeveridad = Enums<"alerta_severidad">;
export type PlanTipo = Enums<"plan_tipo">;
export type EstadoCliente = Enums<"estado_cliente">;

/** Fila de v_clientes. Supabase tipa como anulables todas las columnas de una vista;
 * las que vienen de perfiles conservan su NOT NULL y los contadores nunca son null. */
export type Cliente = Perfil & {
  sesiones_realizadas: number;
  sesiones_pendientes: number;
  proxima_cita: string | null;
  sugerencias_pendientes: number;
  tareas_pendientes: number;
  alertas_abiertas: number;
};
