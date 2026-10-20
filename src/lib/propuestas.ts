// T19.2 · Rondas de propuestas: la psicóloga elige 4 personas de las sugerencias de un cliente para que diga con quién
// se ve más (T19.3). Las reglas las repite el trigger propuestas_rondas_validar.

export const PERSONAS_POR_RONDA = 4;
export const MAX_FRASE = 160;
export const DIAS_RONDA = 7;

interface Candidata {
  candidato_id: string;
  score: number;
  motivos: string[];
  candidato: { mostrar_en_propuestas: boolean } | null;
}

/** Solo quien ha aceptado aparecer en propuestas (T19.1). */
export const puedeProponerse = (s: Candidata) => !!s.candidato?.mostrar_en_propuestas;

/** Las 4 mejores con permiso, por puntuación. */
export const preseleccionar = (sugerencias: Candidata[]) =>
  [...sugerencias].filter(puedeProponerse).sort((a, b) => b.score - a.score).slice(0, PERSONAS_POR_RONDA).map((s) => s.candidato_id);

/** La frase "por qué te lo proponemos" empieza con su primer motivo (la psicóloga la revisa: la leerá el cliente). */
export const frasePorDefecto = (motivos: string[]) => (motivos[0] ?? "").trim().slice(0, MAX_FRASE);

/** El problema de la ronda, o null si se puede enviar. */
export function errorRonda(elegidos: string[], frases: Record<string, string>) {
  if (new Set(elegidos).size !== PERSONAS_POR_RONDA) return `Elige ${PERSONAS_POR_RONDA} personas distintas.`;
  if (elegidos.some((id) => (frases[id] ?? "").trim().length > MAX_FRASE)) return `Cada frase, de hasta ${MAX_FRASE} caracteres.`;
  return null;
}
