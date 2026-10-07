import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json } from "../_shared/http.ts";
import { exigirAdmin } from "../_shared/auth.ts";
import { calcularAjustes, SYSTEM_APRENDIZAJE, validarPreferencias, type Decision, type Preferencias } from "../_shared/aprendizaje.ts";
import { construirContextoCliente } from "../_shared/contextoCliente.ts";
import { pedirJSON } from "../_shared/ia.ts";

// T5.3 · Aprende de las decisiones y sesiones de un cliente. La ficha la llama en segundo plano tras cada
// aceptar/rechazar y tras guardar un resumen revisado. Si la IA falla, guarda igualmente los ajustes de pesos.

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = await exigirAdmin(req);
    if (admin instanceof Response) return admin;
    const { supabase, userId } = admin;

    const { perfil_id } = await req.json();
    if (!perfil_id) return json({ error: "Falta perfil_id" }, 400);

    const [decisiones, actual] = await Promise.all([
      supabase.from("match_sugerencias").select("estado, desglose, motivo_decision")
        .eq("perfil_id", perfil_id).in("estado", ["aceptada", "rechazada"]),
      supabase.from("perfil_aprendizaje").select("preferencias").eq("perfil_id", perfil_id).maybeSingle(),
    ]);
    if (decisiones.error) throw decisiones.error;
    if (actual.error) throw actual.error;

    // 1. Ajustes de pesos por regla (sección 3.2): desde 3 decisiones, ±30 % como mucho.
    const filas = (decisiones.data ?? []) as unknown as { estado: string; desglose: Decision["desglose"]; motivo_decision: string | null }[];
    const ajustes = calcularAjustes(filas.map((f) => ({ estado: f.estado, desglose: f.desglose, motivo: f.motivo_decision })));

    // 2. Preferencias destiladas por la IA (parte de las actuales, que pueden llevar correcciones de la psicóloga).
    let preferencias = validarPreferencias((actual.data as unknown as { preferencias: unknown } | null)?.preferencias);
    let ia = false;
    try {
      const contexto = await construirContextoCliente(supabase, perfil_id);
      // Resúmenes y notas (datos de salud) camino del proveedor de IA: queda constancia (RGPD).
      await supabase.from("auditoria").insert({ user_id: userId, accion: "actualizar_aprendizaje_ia", entidad: "perfiles", entidad_id: perfil_id });
      const nuevas = validarPreferencias(await pedirJSON(SYSTEM_APRENDIZAJE, contexto));
      if (nuevas) {
        preferencias = nuevas;
        ia = true;
      }
    } catch (e) {
      console.error("actualizar-aprendizaje: IA no disponible, solo ajustes:", e instanceof Error ? e.message : e);
    }

    const ahora = new Date().toISOString();
    const { error: guardarError } = await supabase.from("perfil_aprendizaje").upsert({
      perfil_id,
      preferencias: preferencias ?? ({ valora: [], evita: [], notas: "" } satisfies Preferencias),
      ajustes_pesos: ajustes,
      actualizado_at: ahora,
    }, { onConflict: "perfil_id" });
    if (guardarError) throw guardarError;

    // 3. Las pendientes quedan obsoletas: sugerencias-calcular las recalculará al abrir la ficha (no espera las 24 h).
    const { error: obsoletasError } = await supabase.from("match_sugerencias")
      .update({ calculado_at: "1970-01-01T00:00:00Z" }).eq("perfil_id", perfil_id).eq("estado", "pendiente");
    if (obsoletasError) throw obsoletasError;

    return json({ ia, ajustes, preferencias });
  } catch (e) {
    console.error("actualizar-aprendizaje error:", e instanceof Error ? e.message : e);
    return json({ error: e instanceof Error ? e.message : "Error desconocido" }, 500);
  }
});
