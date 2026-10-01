import type { Tables } from "@/integrations/supabase/types";

export type Perfil = Tables<"perfiles">;
export type PaidUser = Tables<"paid_users">;
export type DiscResult = Tables<"disc_results">;
export type PlanTipo = "esencial" | "premium";
