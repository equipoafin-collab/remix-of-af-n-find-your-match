import type { Enums, Tables } from "@/integrations/supabase/types";

export type Perfil = Tables<"perfiles">;
export type Pago = Tables<"pagos">;
export type DiscResult = Tables<"disc_results">;
export type PlanTipo = Enums<"plan_tipo">;
export type EstadoCliente = Enums<"estado_cliente">;

/** Fila de v_clientes. Supabase tipa como anulables todas las columnas de una vista;
 * las que vienen de perfiles conservan su NOT NULL y los contadores nunca son null. */
export type Cliente = Perfil & {
  sesiones_realizadas: number;
  sesiones_pendientes: number;
  proxima_cita: string | null;
};
