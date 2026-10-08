import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import type { SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/http.ts";
import { exigirAdmin } from "../_shared/auth.ts";

// T9.2 · Administradoras del backoffice: listar, invitar por email y quitar el acceso. Solo admin.
// Quitar el acceso borra el rol, no la cuenta: la auditoría y las notas siguen apuntando a ella.
// No se registran emails en los logs.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ponytail: una página de 1.000 usuarios; en auth.users solo hay cuentas del backoffice.
async function buscarPorEmail(supabase: SupabaseClient, email: string): Promise<User | undefined> {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = await exigirAdmin(req);
    if (admin instanceof Response) return admin;
    const { supabase, userId } = admin;
    const { accion, email: emailRecibido, user_id, redirect_to } = await req.json();

    if (accion === "listar") {
      const { data: roles, error } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (error) throw error;
      const administradoras = await Promise.all((roles ?? []).map(async ({ user_id }) => {
        const { data } = await supabase.auth.admin.getUserById(user_id);
        return {
          user_id,
          email: data.user?.email ?? null,
          ultimo_acceso: data.user?.last_sign_in_at ?? null,
          invitada_at: data.user?.invited_at ?? null,
          yo: user_id === userId,
        };
      }));
      return json({ administradoras });
    }

    if (accion === "invitar") {
      const email = String(emailRecibido ?? "").trim().toLowerCase();
      if (!EMAIL.test(email)) return json({ error: "El email no es válido" }, 400);

      // Si ya tiene cuenta (p. ej., se le quitó el acceso antes), solo recupera el rol y entra con su contraseña.
      let usuario = await buscarPorEmail(supabase, email);
      const invitada = !usuario;
      if (!usuario) {
        const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
          redirectTo: typeof redirect_to === "string" ? redirect_to : undefined,
          data: { debe_elegir_contrasena: true }, // AdminLayout le pide la contraseña al entrar por el enlace
        });
        if (error) return json({ error: `No se pudo enviar la invitación: ${error.message}` }, 502);
        usuario = data.user;
      }

      const { error } = await supabase
        .from("user_roles").upsert({ user_id: usuario.id, role: "admin" }, { onConflict: "user_id,role", ignoreDuplicates: true });
      if (error) throw error;
      await supabase.from("auditoria").insert({ user_id: userId, accion: "invitar_admin", entidad: "user_roles", entidad_id: usuario.id });
      return json({ invitada });
    }

    if (accion === "quitar") {
      if (typeof user_id !== "string") return json({ error: "Falta user_id" }, 400);
      // También garantiza que siempre quede al menos una administradora.
      if (user_id === userId) return json({ error: "No puedes quitarte el acceso a ti misma" }, 400);
      const { error } = await supabase.from("user_roles").delete().eq("user_id", user_id).eq("role", "admin");
      if (error) throw error;
      await supabase.from("auditoria").insert({ user_id: userId, accion: "quitar_admin", entidad: "user_roles", entidad_id: user_id });
      return json({ ok: true });
    }

    return json({ error: "Acción no válida" }, 400);
  } catch (e) {
    console.error("administradoras error:", e instanceof Error ? e.message : e);
    return json({ error: e instanceof Error ? e.message : "Error desconocido" }, 500);
  }
});
