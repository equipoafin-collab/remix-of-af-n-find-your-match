import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json } from "../_shared/http.ts";
import { exigirAdmin } from "../_shared/auth.ts";
import { ErrorIA, pedirJSON } from "../_shared/ia.ts";
import { COLUMNAS_EJEMPLOS, promptEjemplos, SYSTEM_EJEMPLOS, validarEjemplos, type DatosEjemplos } from "../_shared/ejemplos.ts";

// T19.5 · Cuatro perfiles de ejemplo, inventados, para una ronda de propuestas sin personas reales. Solo los genera:
// la psicóloga los revisa, escribe las frases y envía la ronda desde la ficha (el trigger la valida al guardarla).

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = await exigirAdmin(req);
    if (admin instanceof Response) return admin;
    const { supabase, userId } = admin;

    const { perfil_id } = await req.json();
    if (!perfil_id) return json({ error: "Falta perfil_id" }, 400);

    const [perfil, aprendizaje] = await Promise.all([
      supabase.from("perfiles").select(COLUMNAS_EJEMPLOS).eq("id", perfil_id).maybeSingle(),
      supabase.from("perfil_aprendizaje").select("preferencias").eq("perfil_id", perfil_id).maybeSingle(),
    ]);
    if (perfil.error) throw perfil.error;
    if (aprendizaje.error) throw aprendizaje.error;
    if (!perfil.data) return json({ error: "Perfil no encontrado" }, 404);

    const datos = {
      ...(perfil.data as unknown as Omit<DatosEjemplos, "preferencias">),
      preferencias: (aprendizaje.data as unknown as { preferencias: DatosEjemplos["preferencias"] } | null)?.preferencias ?? null,
    };
    // Lo aprendido puede venir de sus sesiones: queda constancia de que va al proveedor de IA (RGPD).
    await supabase.from("auditoria").insert({ user_id: userId, accion: "ronda_ejemplo_ia", entidad: "perfiles", entidad_id: perfil_id });

    const ejemplos = validarEjemplos(await pedirJSON(SYSTEM_EJEMPLOS, promptEjemplos(datos)));
    if (!ejemplos) return json({ error: "La IA no ha devuelto 4 perfiles válidos. Vuelve a intentarlo." }, 502);
    return json({ ejemplos });
  } catch (e) {
    if (e instanceof ErrorIA) return json({ error: e.message }, e.status);
    console.error("ronda-ejemplo error:", e instanceof Error ? e.message : e);
    return json({ error: e instanceof Error ? e.message : "Error desconocido" }, 500);
  }
});
