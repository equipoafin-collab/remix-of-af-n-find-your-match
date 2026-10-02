import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { json } from "./http.ts";

/**
 * Comprueba que quien llama es admin. Devuelve el cliente service role (salta la RLS: úsalo solo
 * después de esta comprobación) o la respuesta de error lista para devolver.
 */
export async function exigirAdmin(req: Request): Promise<{ supabase: SupabaseClient; userId: string } | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const anonClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);

  const userId = claimsData.claims.sub as string;
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!roleData) return json({ error: "Forbidden" }, 403);

  return { supabase, userId };
}
