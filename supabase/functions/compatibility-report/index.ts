import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json } from "../_shared/http.ts";
import { exigirAdmin } from "../_shared/auth.ts";
import { construirContextoCliente } from "../_shared/contextoCliente.ts";
import { ErrorIA, pedirJSON } from "../_shared/ia.ts";
import { SYSTEM_INFORME, validarInforme } from "../_shared/informe.ts";

// T6.3 · Informe de compatibilidad de un match. Lo guarda en matches.informe; la psicóloga lo revisa,
// lo edita si hace falta, lo exporta a PDF y lo marca como enviado desde la pestaña Matches.

const TOKENS_POR_PERSONA = 3000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = await exigirAdmin(req);
    if (admin instanceof Response) return admin;
    const { supabase, userId } = admin;

    const { match_id } = await req.json();
    if (!match_id) return json({ error: "Falta match_id" }, 400);

    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id, perfil_a, perfil_b, a:perfiles!matches_perfil_a_fkey(nombre_completo), b:perfiles!matches_perfil_b_fkey(nombre_completo)")
      .eq("id", match_id).maybeSingle();
    if (matchError) throw matchError;
    if (!match) return json({ error: "No existe el match" }, 404);
    const m = match as unknown as {
      id: string; perfil_a: string; perfil_b: string; a: { nombre_completo: string } | null; b: { nombre_completo: string } | null;
    };

    // Solo lo que cada uno rellenó (preguntas clave, cuestionario y DISC): el informe lo leen los clientes, y con
    // sesiones o notas en el prompt la IA las acababa citando aunque se le prohibiera (visto en producción).
    const [contextoA, contextoB] = await Promise.all([
      construirContextoCliente(supabase, m.perfil_a, { maxTokens: TOKENS_POR_PERSONA, alcance: "cuestionario" }),
      construirContextoCliente(supabase, m.perfil_b, { maxTokens: TOKENS_POR_PERSONA, alcance: "cuestionario" }),
    ]);
    const userPrompt =
      `PERSONA A · ${m.a?.nombre_completo}\n${contextoA}\n\nPERSONA B · ${m.b?.nombre_completo}\n${contextoB}\n\nGenera el informe de compatibilidad.`;

    // Datos personales del cuestionario camino del proveedor de IA: queda constancia (RGPD).
    await supabase.from("auditoria").insert({ user_id: userId, accion: "generar_informe_ia", entidad: "matches", entidad_id: m.id });
    const informe = validarInforme(await pedirJSON(SYSTEM_INFORME, userPrompt));
    if (!informe) return json({ error: "La IA devolvió un informe incompleto. Prueba a regenerarlo." }, 502);

    const { error: guardarError } = await supabase.from("matches").update({ informe }).eq("id", m.id);
    if (guardarError) throw guardarError;

    return json({ informe });
  } catch (e) {
    if (e instanceof ErrorIA) return json({ error: e.message }, e.status);
    console.error("compatibility-report error:", e instanceof Error ? e.message : e);
    return json({ error: e instanceof Error ? e.message : "Error desconocido" }, 500);
  }
});
