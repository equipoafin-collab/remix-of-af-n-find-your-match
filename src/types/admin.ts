import type { Enums, Tables } from "@/integrations/supabase/types";

export type Perfil = Tables<"perfiles">;
export type PaidUser = Tables<"paid_users">;
export type DiscResult = Tables<"disc_results">;
export type PlanTipo = Enums<"plan_tipo">;
export type EstadoCliente = Enums<"estado_cliente">;
