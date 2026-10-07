import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { formatearContexto, type CandidatoResumido, type CuestionarioContexto } from "./contexto.ts";
import { validarResumen, type ResumenSesion } from "./resumen.ts";

// Las de CuestionarioContexto (sin nombre, email ni teléfono) y el vínculo al test DISC.
const COLUMNAS_CLIENTE = [
  "tipo_relacion", "hijos", "edad_min_busca", "edad_max_busca", "zona", "ciudad", "acepta_otras_zonas", "valores_importantes",
  "edad", "genero", "busca_genero", "desea_casarse", "religion", "importa_religion", "religion_pareja", "ideologia",
  "importa_politica", "politica_pareja", "tabaco", "alcohol", "deseo_familia", "ambicion_profesional", "nivel_social",
  "estilo_vida_activo", "necesidad_independencia", "conflicto", "sentirse_querido", "relacion_sana", "vida_en_10_anios",
  "aprendizaje_ultima_relacion", "fin_de_semana", "hobbies", "disc_perfil", "disc_result_id",
].join(", ");
const COLUMNAS_CANDIDATO = "edad, genero, zona, ciudad, tipo_relacion, hijos, valores_importantes, disc_perfil";
const COLUMNAS_DISC =
  "primary_style, secondary_style, strength_1, strength_2, strength_3, weakness_1, weakness_2, weakness_3";

const sinDatos = Promise.resolve({ data: null, error: null });

/**
 * T5.1 · Todo lo que la IA necesita saber del cliente, como texto acotado a ~maxTokens: preguntas clave,
 * cuestionario, DISC, preferencias aprendidas, 5 últimos resúmenes revisados, 10 últimas notas (no automáticas)
 * y 20 últimas decisiones. Incluye datos de salud: usar solo con el cliente service role tras exigirAdmin.
 * Con `alcance: "cuestionario"` se queda en lo que el cliente rellenó (preguntas clave, cuestionario y DISC):
 * es lo que usa el informe de compatibilidad (T6.3), que leen los clientes.
 */
export async function construirContextoCliente(
  supabase: SupabaseClient,
  perfilId: string,
  { maxTokens, alcance = "completo" }: { maxTokens?: number; alcance?: "completo" | "cuestionario" } = {},
): Promise<string> {
  const completo = alcance === "completo";
  const [perfil, aprendizaje, sesiones, notas, decisiones] = await Promise.all([
    supabase.from("perfiles").select(COLUMNAS_CLIENTE).eq("id", perfilId).single(),
    completo ? supabase.from("perfil_aprendizaje").select("preferencias").eq("perfil_id", perfilId).maybeSingle() : sinDatos,
    completo
      ? supabase.from("sesiones").select("fecha_hora, resumen_ia")
        .eq("perfil_id", perfilId).eq("resumen_estado", "revisado").order("fecha_hora", { ascending: false }).limit(5)
      : sinDatos,
    completo
      ? supabase.from("notas_privadas").select("created_at, contenido")
        .eq("perfil_id", perfilId).eq("automatica", false).order("created_at", { ascending: false }).limit(10)
      : sinDatos,
    completo
      ? supabase.from("match_sugerencias")
        .select(`decidido_at, estado, motivo_decision, score, candidato:perfiles!match_sugerencias_candidato_id_fkey(${COLUMNAS_CANDIDATO})`)
        .eq("perfil_id", perfilId).in("estado", ["aceptada", "rechazada"]).order("decidido_at", { ascending: false }).limit(20)
      : sinDatos,
  ]);
  for (const r of [perfil, aprendizaje, sesiones, notas, decisiones]) if (r.error) throw r.error;

  const cliente = perfil.data as unknown as CuestionarioContexto & { disc_result_id: string | null };
  let disc = null;
  if (cliente.disc_result_id) {
    const { data, error } = await supabase.from("disc_results").select(COLUMNAS_DISC).eq("id", cliente.disc_result_id).maybeSingle();
    if (error) throw error;
    const d = data as unknown as Record<string, string | null> | null;
    if (d) {
      disc = {
        principal: d.primary_style ?? "",
        secundario: d.secondary_style ?? "",
        fortalezas: [d.strength_1, d.strength_2, d.strength_3].filter((x): x is string => !!x),
        a_mejorar: [d.weakness_1, d.weakness_2, d.weakness_3].filter((x): x is string => !!x),
      };
    }
  }

  const filasSesion = (sesiones.data ?? []) as unknown as { fecha_hora: string; resumen_ia: unknown }[];
  const filasNota = (notas.data ?? []) as unknown as { created_at: string; contenido: string }[];
  const filasDecision = (decisiones.data ?? []) as unknown as {
    decidido_at: string | null; estado: string; motivo_decision: string | null; score: number; candidato: CandidatoResumido | null;
  }[];

  return formatearContexto({
    perfil: cliente,
    disc,
    preferencias: (aprendizaje.data as unknown as { preferencias: { valora?: string[]; evita?: string[]; notas?: string } } | null)?.preferencias ?? null,
    resumenes: filasSesion
      .map((s) => ({ fecha: s.fecha_hora, resumen: validarResumen(s.resumen_ia) }))
      .filter((s): s is { fecha: string; resumen: ResumenSesion } => s.resumen !== null),
    notas: filasNota.map((n) => ({ fecha: n.created_at, contenido: n.contenido })),
    decisiones: filasDecision.map((x) => ({
      fecha: x.decidido_at ?? "", estado: x.estado, motivo: x.motivo_decision, score: x.score, candidato: x.candidato,
    })),
  }, maxTokens);
}
