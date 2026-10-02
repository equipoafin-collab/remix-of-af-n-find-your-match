import type { Enums, Tables } from "@/integrations/supabase/types";

export type Perfil = Tables<"perfiles">;
export type Pago = Tables<"pagos">;
export type DiscResult = Tables<"disc_results">;
export type PlanTipo = Enums<"plan_tipo">;
export type EstadoCliente = Enums<"estado_cliente">;
