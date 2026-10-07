// Sin dependencias de Deno: la usa sugerencias-calcular y Vitest la prueba en src/lib/__tests__.
import type { MatchSuggestion } from "./profileMatching.ts";

export type EstadoSugerencia = "pendiente" | "aceptada" | "rechazada" | "caducada";
export interface SugerenciaExistente {
  candidato_id: string;
  estado: EstadoSugerencia;
}

/** Un candidato del top con su puntuación final: solo reglas (score_ia null) o combinada con la IA (T5.2). */
export interface SugerenciaCalculada {
  match: MatchSuggestion;
  score: number;
  score_ia: number | null;
  motivos: string[];
  riesgos: string[];
}

export const soloReglas = (m: MatchSuggestion): SugerenciaCalculada => ({
  match: m, score: m.score, score_ia: null, motivos: m.highlights, riesgos: m.warnings,
});

/** Candidatos ya decididos: no se vuelven a proponer ni se tocan (el aprendizaje los usa, T5.3). */
export const candidatosDecididos = (existentes: SugerenciaExistente[]) =>
  existentes.filter((e) => e.estado === "aceptada" || e.estado === "rechazada").map((e) => e.candidato_id);

/**
 * Qué hacer con el nuevo top: insertar los candidatos que no tenían fila, actualizar los
 * pendientes o caducados que vuelven a entrar y caducar los pendientes que ya no entran.
 * Las decididas nunca aparecen en ninguna lista.
 */
export function planificarSugerencias(existentes: SugerenciaExistente[], top: SugerenciaCalculada[]) {
  const estados = new Map(existentes.map((e) => [e.candidato_id, e.estado]));
  const id = (s: SugerenciaCalculada) => s.match.perfilB.id;
  const enTop = new Set(top.map(id));
  return {
    nuevas: top.filter((s) => !estados.has(id(s))),
    actualizar: top.filter((s) => ["pendiente", "caducada"].includes(estados.get(id(s)) ?? "")),
    caducar: existentes.filter((e) => e.estado === "pendiente" && !enTop.has(e.candidato_id)).map((e) => e.candidato_id),
  };
}

/** Fila de match_sugerencias. Los motivos y riesgos por reglas se guardan en el desglose aunque la IA los sustituya. */
export const filaSugerencia = (perfilId: string, s: SugerenciaCalculada, version: string, ahora: string) => ({
  perfil_id: perfilId,
  candidato_id: s.match.perfilB.id,
  score: s.score,
  score_reglas: s.match.score,
  score_ia: s.score_ia,
  desglose: { ...s.match.breakdown, motivos_reglas: s.match.highlights, riesgos_reglas: s.match.warnings },
  motivos: s.motivos,
  riesgos: s.riesgos,
  estado: "pendiente" as const,
  version_algoritmo: version,
  calculado_at: ahora,
});
