import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/http.ts";
import { errorContrasena, pasoCuenta, primerNombre, TOKEN_ACCESO, type CuentaExistente } from "../_shared/acceso.ts";
import { pagoCobradoReciente, SESION_CHECKOUT } from "../_shared/stripe.ts";

// T15.1 · Crear la contraseña del área del cliente con su enlace personal (pública: aún no tiene sesión).
// La administradora crea el enlace en la ficha (accesos_cliente: 7 días, solo con el plan pagado). `info` saluda y
// enseña su usuario (el email del perfil); `activar` crea su cuenta de Auth con la contraseña que elige, o le pone
// una nueva si ya la tenía ("he olvidado mi contraseña"). El enlace se gasta al activar, no al abrirlo, para que los
// antivirus del correo no lo invaliden. No se registran emails ni contraseñas en los logs.
// T15.3 · `info_pago` / `activar_pago`: lo mismo justo después de pagar con Stripe, con el session_id de la vuelta
// (/pago/ok) en vez del enlace. Solo si la sesión está cobrada, es de hace 7 días como mucho, es de un pago nuestro
// y el perfil aún no tiene cuenta (vale una vez); después, la contraseña se cambia con el enlace de la ficha.

const NO_VALIDO = "Este enlace no es válido, ya se ha usado o ha caducado. Pide uno nuevo a tu psicóloga.";
const NO_VALIDO_PAGO = "No encontramos un pago reciente con este enlace. Si ya has pagado, tu psicóloga te enviará el acceso.";
const SIN_AREA = "Tu plan no está activo. Habla con tu psicóloga para renovarlo.";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Perfil = { id: string; email: string | null; nombre_completo: string; user_id: string | null };
const PERFIL = "perfil:perfiles(id, email, nombre_completo, user_id)";

interface Acceso {
  id: string;
  caduca_at: string;
  usado_at: string | null;
  perfil: Perfil | null;
}

class ErrorCliente extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** Deja lista la cuenta del perfil con esa contraseña y devuelve su id. */
async function prepararCuenta(supabase: SupabaseClient, perfil: Perfil, email: string, contrasena: string) {
  let existente: CuentaExistente | null = null;
  if (!perfil.user_id) {
    const { data: id, error } = await supabase.rpc("usuario_por_email", { _email: email });
    if (error) throw error;
    if (id) {
      const [{ data: rol }, { data: otro }] = await Promise.all([
        supabase.from("user_roles").select("user_id").eq("user_id", id).eq("role", "admin").maybeSingle(),
        supabase.from("perfiles").select("id").eq("user_id", id).neq("id", perfil.id).maybeSingle(),
      ]);
      existente = { id: id as string, esAdmin: !!rol, otroPerfil: !!otro };
    }
  }

  const paso = pasoCuenta(perfil.user_id, existente);
  if (paso.paso === "error") throw new ErrorCliente(paso.mensaje, 409);

  let userId: string;
  if (paso.paso === "actualizar") {
    const { error } = await supabase.auth.admin.updateUserById(paso.userId, { email, password: contrasena, email_confirm: true });
    if (error) throw error;
    userId = paso.userId;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({ email, password: contrasena, email_confirm: true });
    if (error) throw error;
    userId = data.user.id;
  }

  if (perfil.user_id !== userId) {
    const { error } = await supabase.from("perfiles").update({ user_id: userId }).eq("id", perfil.id);
    if (error) {
      if (paso.paso === "crear") await supabase.auth.admin.deleteUser(userId);
      throw error;
    }
  }
  return userId;
}

/** Enlace de la ficha (T15.1): el acceso sin usar ni caducar. */
async function porEnlace(supabase: SupabaseClient, token: unknown) {
  if (typeof token !== "string" || !TOKEN_ACCESO.test(token)) throw new ErrorCliente(NO_VALIDO, 404);
  const { data, error } = await supabase
    .from("accesos_cliente").select(`id, caduca_at, usado_at, ${PERFIL}`).eq("token", token).maybeSingle();
  if (error) throw error;
  const acceso = data as unknown as Acceso | null;
  if (!acceso?.perfil || acceso.usado_at || new Date(acceso.caduca_at) <= new Date()) throw new ErrorCliente(NO_VALIDO, 404);
  return acceso as Acceso & { perfil: Perfil };
}

/**
 * Vuelta de Stripe (T15.3): el perfil de una Checkout Session cobrada y reciente de un pago nuestro. Si el aviso de
 * Stripe aún no ha llegado, confirma el pago igual que él (confirmar_pago_stripe es idempotente), para que el plan
 * ya esté activo al entrar.
 */
async function porPago(supabase: SupabaseClient, sessionId: unknown): Promise<Perfil> {
  if (typeof sessionId !== "string" || !SESION_CHECKOUT.test(sessionId)) throw new ErrorCliente(NO_VALIDO_PAGO, 404);
  const claveStripe = Deno.env.get("STRIPE_SECRET_KEY");
  if (!claveStripe) throw new Error("Falta STRIPE_SECRET_KEY");
  const respuesta = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, { headers: { Authorization: `Bearer ${claveStripe}` } });
  if (respuesta.status === 404) throw new ErrorCliente(NO_VALIDO_PAGO, 404);
  if (!respuesta.ok) throw new Error(`Stripe respondió ${respuesta.status}`);
  const sesion = await respuesta.json();
  if (!pagoCobradoReciente(sesion)) throw new ErrorCliente(NO_VALIDO_PAGO, 404);

  const { data, error } = await supabase.from("pagos").select(`estado, ${PERFIL}`).eq("stripe_checkout_id", sesion.id).maybeSingle();
  if (error) throw error;
  const pago = data as unknown as { estado: string; perfil: Perfil | null } | null;
  if (!pago?.perfil || pago.perfil.id !== sesion.client_reference_id) throw new ErrorCliente(NO_VALIDO_PAGO, 404);
  if (pago.estado === "pendiente") {
    const { error: errorConfirmar } = await supabase.rpc("confirmar_pago_stripe", { _checkout_id: sesion.id, _payment_intent: sesion.payment_intent });
    if (errorConfirmar) throw errorConfirmar;
  }
  return pago.perfil;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token, session_id, accion, contrasena } = await req.json();
    const conPago = accion === "info_pago" || accion === "activar_pago";
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const acceso = conPago ? null : await porEnlace(supabase, token);
    const perfil = acceso ? acceso.perfil : await porPago(supabase, session_id);

    const { data: conArea, error: errorArea } = await supabase.rpc("perfil_tiene_area", { _perfil_id: perfil.id });
    if (errorArea) throw errorArea;
    if (!conArea) return json({ error: SIN_AREA }, 403);
    const email = (perfil.email ?? "").trim().toLowerCase();
    if (!EMAIL.test(email)) return json({ error: "Tu perfil no tiene un email válido. Habla con tu psicóloga." }, 409);

    if (accion === "info" || accion === "info_pago") {
      return json({ nombre: primerNombre(perfil.nombre_completo), email, cuenta: !!perfil.user_id });
    }
    if (accion !== "activar" && accion !== "activar_pago") return json({ error: "Acción no válida" }, 400);

    const problema = typeof contrasena === "string" ? errorContrasena(contrasena) : "Falta la contraseña.";
    if (problema) return json({ error: problema }, 400);

    let userId: string;
    if (acceso) {
      // Se gasta antes de tocar la cuenta, así dos envíos a la vez no activan dos veces. Si algo falla, se devuelve.
      const { data: gastado, error: errorGasto } = await supabase
        .from("accesos_cliente").update({ usado_at: new Date().toISOString() }).eq("id", acceso.id).is("usado_at", null).select("id").maybeSingle();
      if (errorGasto) throw errorGasto;
      if (!gastado) return json({ error: NO_VALIDO }, 404);
      try {
        userId = await prepararCuenta(supabase, perfil, email, contrasena);
      } catch (e) {
        await supabase.from("accesos_cliente").update({ usado_at: null }).eq("id", acceso.id);
        throw e;
      }
    } else {
      // Con el pago solo se crea la cuenta una vez: después, la contraseña se cambia con el enlace de la ficha.
      if (perfil.user_id) return json({ error: "Ya tienes tu área: entra con tu email y tu contraseña." }, 409);
      userId = await prepararCuenta(supabase, perfil, email, contrasena);
    }

    await supabase.from("auditoria").insert({
      user_id: userId, accion: "activar_acceso_cliente", entidad: "perfiles", entidad_id: perfil.id, detalle: { via: acceso ? "enlace" : "pago" },
    });
    return json({ email });
  } catch (e) {
    if (e instanceof ErrorCliente) return json({ error: e.message }, e.status);
    console.error("acceso-cliente error:", e instanceof Error ? e.message : e);
    return json({ error: "No se pudo crear tu acceso. Inténtalo de nuevo en unos minutos." }, 500);
  }
});
