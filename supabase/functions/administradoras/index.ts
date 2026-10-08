import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import type { SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/http.ts";
import { exigirAdmin } from "../_shared/auth.ts";

// T9.2 · Administradoras del backoffice: listar, invitar, dar un enlace de acceso y quitar el acceso. Solo admin.
// No se envían emails: Hotmail/Outlook abren los enlaces del correo para analizarlos y gastaban el de un solo uso.
// La función devuelve el token del enlace y el CRM lo convierte en <origen>/admin/acceso, una página con un botón
// "Entrar" (solo el botón lo gasta); la administradora lo envía por el canal que quiera.
// Quitar el acceso borra el rol, no la cuenta: la auditoría y las notas siguen apuntando a ella.
// No se registran emails en los logs.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ponytail: una página de 1.000 usuarios; en auth.users solo hay cuentas del backoffice.
async function buscarPorEmail(supabase: SupabaseClient, email: string): Promise<User | undefined> {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email);
}

/** Enlace para una cuenta que ya existe (no ha llegado a entrar u olvidó la contraseña): elegirá una nueva. */
async function enlaceDeRecuperacion(supabase: SupabaseClient, usuario: User) {
  const { data, error } = await supabase.auth.admin.generateLink({ type: "recovery", email: usuario.email! });
  if (error) throw error;
  return data.properties;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = await exigirAdmin(req);
    if (admin instanceof Response) return admin;
    const { supabase, userId } = admin;
    const { accion, email: emailRecibido, user_id } = await req.json();

    if (accion === "listar") {
      const { data: roles, error } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (error) throw error;
      const administradoras = await Promise.all((roles ?? []).map(async ({ user_id }) => {
        const { data } = await supabase.auth.admin.getUserById(user_id);
        return {
          user_id,
          email: data.user?.email ?? null,
          ultimo_acceso: data.user?.last_sign_in_at ?? null,
          // Invitada que aún no ha elegido contraseña (ElegirContrasena la quita).
          pendiente: data.user?.user_metadata?.debe_elegir_contrasena === true,
          yo: user_id === userId,
        };
      }));
      return json({ administradoras });
    }

    if (accion === "invitar") {
      const email = String(emailRecibido ?? "").trim().toLowerCase();
      if (!EMAIL.test(email)) return json({ error: "El email no es válido" }, 400);

      // Si ya tiene cuenta (se le quitó el acceso antes, o no llegó a entrar), recupera el rol y recibe un enlace nuevo.
      let usuario = await buscarPorEmail(supabase, email);
      const nueva = !usuario;
      let enlace;
      if (usuario) {
        enlace = await enlaceDeRecuperacion(supabase, usuario);
      } else {
        const { data, error } = await supabase.auth.admin.generateLink({
          type: "invite",
          email,
          options: { data: { debe_elegir_contrasena: true } }, // si cierra sin elegirla, AdminLayout se la pide
        });
        if (error) return json({ error: `No se pudo crear la cuenta: ${error.message}` }, 502);
        usuario = data.user;
        enlace = data.properties;
      }

      const { error } = await supabase
        .from("user_roles").upsert({ user_id: usuario.id, role: "admin" }, { onConflict: "user_id,role", ignoreDuplicates: true });
      if (error) throw error;
      await supabase.from("auditoria").insert({ user_id: userId, accion: "invitar_admin", entidad: "user_roles", entidad_id: usuario.id });
      return json({ nueva, token_hash: enlace.hashed_token, tipo: enlace.verification_type });
    }

    if (accion === "enlace") {
      if (typeof user_id !== "string") return json({ error: "Falta user_id" }, 400);
      const { data: rol } = await supabase.from("user_roles").select("user_id").eq("user_id", user_id).eq("role", "admin").maybeSingle();
      if (!rol) return json({ error: "No es administradora" }, 404);
      const { data, error } = await supabase.auth.admin.getUserById(user_id);
      if (error || !data.user?.email) return json({ error: "No existe la cuenta" }, 404);
      const enlace = await enlaceDeRecuperacion(supabase, data.user);
      await supabase.from("auditoria").insert({ user_id: userId, accion: "enlace_acceso_admin", entidad: "user_roles", entidad_id: user_id });
      return json({ token_hash: enlace.hashed_token, tipo: enlace.verification_type });
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
