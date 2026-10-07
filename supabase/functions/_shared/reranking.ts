// Sin dependencias de Deno: sugerencias-calcular lo usa y Vitest lo prueba en src/lib/__tests__.
import type { MatchSuggestion, PerfilForMatching } from "./profileMatching.ts";
import { soloReglas, type SugerenciaCalculada } from "./sugerencias.ts";

// T5.2 · Re-ranking con IA del top por reglas.

export const SYSTEM_RERANKING = `Eres la asistente de una psicóloga de Afín, un servicio de matchmaking profesional. Recibes el contexto de un cliente (preguntas clave, cuestionario, resúmenes de sus sesiones, notas de la psicóloga, preferencias aprendidas y decisiones anteriores sobre candidatos con su motivo) y una lista de candidatos que ya han pasado los filtros excluyentes, con su puntuación por reglas.

Para cada candidato, puntúa de 0 a 100 cómo de bien encaja con este cliente. Da más peso a lo que la psicóloga ha observado en sesiones y notas y a lo que ha aceptado o rechazado antes (y por qué) que a la puntuación por reglas.

REGLAS:
- Escribe en español, con frases breves y concretas para esta pareja. Nada genérico ("buena compatibilidad", "valores compartidos" sin decir cuáles).
- "motivos": hasta 4 razones por las que podrían encajar. "riesgos": hasta 3 posibles fricciones. Pueden ir vacíos.
- En motivos y riesgos no escribas los ids (C1, C2…): son internos. Habla de "el cliente" y de "él", "ella" o "esta persona".
- Un riesgo es una diferencia real o un dato que falta y que le importa al cliente. Si los datos coinciden con lo que el cliente busca, es un motivo, no un riesgo.
- Usa solo los datos recibidos. No inventes ni diagnostiques.
- Devuelve una entrada por cada candidato, con su id tal cual (C1, C2…).

Responde EXCLUSIVAMENTE con un JSON válido (sin markdown, sin backticks) con esta estructura:
{
  "candidatos": [
    { "id": "C1", "score_ia": <0-100>, "motivos": ["<motivo>", ...], "riesgos": ["<riesgo>", ...] }
  ]
}`;

const MAX_MOTIVOS = 4;
const MAX_RIESGOS = 3;
const MAX_TEXTO_LIBRE = 200;

// Pocos datos y sin nombre ni contacto: la IA solo necesita saber cómo es el candidato.
type CandidatoIA = PerfilForMatching & { hobbies?: string | null };

const lista = (xs: string[] | null | undefined) => (xs ?? []).filter(Boolean).join(", ");

export function describirCandidato(m: MatchSuggestion, i: number): string {
  const c = m.perfilB as CandidatoIA;
  const b = m.breakdown;
  const texto = (s: string | null | undefined) => s?.trim() && `"${s.trim().slice(0, MAX_TEXTO_LIBRE)}"`;
  return [
    `C${i + 1}: ${c.genero ?? "persona"} de ${c.edad} años, ${c.zona ?? c.ciudad}${c.acepta_otras_zonas ? " (abierto/a a otras zonas)" : ""}.`,
    `Busca: ${c.tipo_relacion}${c.edad_min_busca && c.edad_max_busca ? `, de ${c.edad_min_busca} a ${c.edad_max_busca} años` : ""}. Hijos: ${c.hijos}.${c.desea_casarse ? ` Casarse: ${c.desea_casarse}.` : ""}`,
    `Valores: ${lista(c.valores_importantes) || "—"}. Religión: ${c.religion ?? "—"}. Ideología: ${c.ideologia ?? "—"}. Tabaco: ${c.tabaco}. Alcohol: ${c.alcohol ?? "—"}.`,
    `Escalas 1-5: familia ${c.deseo_familia}, ambición ${c.ambicion_profesional}, vida social ${c.nivel_social}, vida activa ${c.estilo_vida_activo}, independencia ${c.necesidad_independencia}. DISC: ${c.disc_perfil ?? "—"}.`,
    [
      lista(c.conflicto) && `En un conflicto: ${lista(c.conflicto)}.`,
      lista(c.sentirse_querido) && `Para sentirse querido/a: ${lista(c.sentirse_querido)}.`,
      texto(c.fin_de_semana) && `Fin de semana: ${texto(c.fin_de_semana)}.`,
      texto(c.hobbies) && `Hobbies: ${texto(c.hobbies)}.`,
    ].filter(Boolean).join(" "),
    `Reglas: ${m.score}/100 (objetivos ${b.objetivos}, valores ${b.valores}, estilo de vida ${b.estiloVida}, personalidad ${b.personalidad}, geografía ${b.geografia}, preferencias ${b.preferencias}).` +
      `${m.warnings.length ? ` Avisos: ${m.warnings.join("; ")}.` : ""}`,
  ].filter(Boolean).join("\n");
}

export const promptReranking = (contexto: string, top: MatchSuggestion[]) =>
  `CONTEXTO DEL CLIENTE\n${contexto}\n\nCANDIDATOS (${top.length})\n\n${top.map(describirCandidato).join("\n\n")}`;

export interface ValoracionIA {
  score_ia: number;
  motivos: string[];
  riesgos: string[];
}

const textos = (v: unknown, max: number) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean).slice(0, max) : [];

/**
 * Valida la respuesta de la IA: índice del candidato (0 = C1) → valoración. Se ignoran las entradas
 * mal formadas, repetidas o de candidatos que no se enviaron; el score se redondea y se limita a 0-100.
 */
export function validarReranking(raw: unknown, enviados: number): Map<number, ValoracionIA> {
  const valoraciones = new Map<number, ValoracionIA>();
  const candidatos = (raw as { candidatos?: unknown } | null)?.candidatos;
  if (!Array.isArray(candidatos)) return valoraciones;
  for (const c of candidatos) {
    const indice = Number(/^C(\d+)$/i.exec(String((c as { id?: unknown })?.id ?? "").trim())?.[1]) - 1;
    const score = Number((c as { score_ia?: unknown }).score_ia);
    if (!(indice >= 0 && indice < enviados) || valoraciones.has(indice) || !Number.isFinite(score)) continue;
    valoraciones.set(indice, {
      score_ia: Math.min(100, Math.max(0, Math.round(score))),
      motivos: textos((c as { motivos?: unknown }).motivos, MAX_MOTIVOS),
      riesgos: textos((c as { riesgos?: unknown }).riesgos, MAX_RIESGOS),
    });
  }
  return valoraciones;
}

/**
 * Score final = (1 − pesoIA)·reglas + pesoIA·IA, ordenado de mayor a menor. Los motivos y riesgos de la IA
 * sustituyen a los de reglas (si la IA deja una lista vacía, se quedan los de reglas). Sin valoración → solo reglas.
 */
export function combinarConIA(top: MatchSuggestion[], ia: Map<number, ValoracionIA>, pesoIA: number): SugerenciaCalculada[] {
  const peso = Math.min(1, Math.max(0, pesoIA));
  return top
    .map((m, i): SugerenciaCalculada => {
      const v = ia.get(i);
      if (!v) return soloReglas(m);
      return {
        match: m,
        score: Math.round((1 - peso) * m.score + peso * v.score_ia),
        score_ia: v.score_ia,
        motivos: v.motivos.length ? v.motivos : m.highlights,
        riesgos: v.riesgos.length ? v.riesgos : m.warnings,
      };
    })
    .sort((a, b) => b.score - a.score);
}
