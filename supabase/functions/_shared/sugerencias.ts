// Sin dependencias de Deno: la usa sugerencias-calcular y Vitest la prueba en src/lib/__tests__.
import type { MatchSuggestion } from "./profileMatching.ts";

export type EstadoSugerencia = "pendiente" | "aceptada" | "rechazada" | "caducada";
export interface SugerenciaExistente {
  candidato_id: string;
  estado: EstadoSugerencia;
}

/** Candidatos ya decididos: no se vuelven a proponer ni se tocan (el aprendizaje los usa, T5.3). */
export const candidatosDecididos = (existentes: SugerenciaExistente[]) =>
  existentes.filter((e) => e.estado === "aceptada" || e.estado === "rechazada").map((e) => e.candidato_id);

/**
 * Qué hacer con el nuevo top por reglas: insertar los candidatos que no tenían fila, actualizar los
 * pendientes o caducados que vuelven a entrar y caducar los pendientes que ya no entran.
 * Las decididas nunca aparecen en ninguna lista.
 */
export function planificarSugerencias(existentes: SugerenciaExistente[], top: MatchSuggestion[]) {
  const estados = new Map(existentes.map((e) => [e.candidato_id, e.estado]));
  const enTop = new Set(top.map((m) => m.perfilB.id));
  return {
    nuevas: top.filter((m) => !estados.has(m.perfilB.id)),
    actualizar: top.filter((m) => ["pendiente", "caducada"].includes(estados.get(m.perfilB.id) ?? "")),
    caducar: existentes.filter((e) => e.estado === "pendiente" && !enTop.has(e.candidato_id)).map((e) => e.candidato_id),
  };
}

/** Fila de match_sugerencias calculada solo por reglas (la IA rellena score_ia y ajusta score en T5.2). */
export const filaSugerencia = (perfilId: string, m: MatchSuggestion, version: string, ahora: string) => ({
  perfil_id: perfilId,
  candidato_id: m.perfilB.id,
  score: m.score,
  score_reglas: m.score,
  score_ia: null,
  desglose: m.breakdown,
  motivos: m.highlights,
  riesgos: m.warnings,
  estado: "pendiente" as const,
  version_algoritmo: version,
  calculado_at: ahora,
});
