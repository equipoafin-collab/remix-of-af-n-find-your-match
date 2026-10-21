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

/** El problema de la ronda, o null si se puede enviar. */
export function errorRonda(elegidos: string[], frases: Record<string, string>) {
  if (new Set(elegidos).size !== PERSONAS_POR_RONDA) return `Elige ${PERSONAS_POR_RONDA} personas distintas.`;
  if (elegidos.some((id) => (frases[id] ?? "").trim().length > MAX_FRASE)) return `Cada frase, de hasta ${MAX_FRASE} caracteres.`;
  return null;
}

// T19.3 · Lo que ve el cliente en su área.

/** Una persona de su ronda abierta: lo mismo que de un match (T18.2), más la frase. */
export interface PersonaPropuesta {
  id: string;
  nombre: string;
  edad: number;
  zona: string | null;
  aficiones: string | null;
  foto_url: string | null;
  frase: string | null;
}

export type MiRonda =
  | { id: string; estado: "abierta"; caduca_at: string; personas: PersonaPropuesta[] }
  | { id: string; estado: "respondida"; respondida_at: string; ninguno: boolean; elegido: string | null };

/** Los chips de T5.3 para el cliente: "Intuición profesional" es de la psicóloga; él tiene "Otro". */
export const MOTIVOS_NINGUNA = ["Edad", "Distancia", "Valores", "Físico", "Otro"];

/** Motivo en el formato de T5.3 ("Distancia, Edad — texto libre"), para que el aprendizaje (T19.4) lo lea igual. */
export function motivoNinguna(chips: string[], texto: string) {
  const libre = texto.trim();
  return [chips.join(", "), libre].filter(Boolean).join(" — ");
}

export const diasParaCaducar = (caducaAt: string, ahora = new Date()) => Math.max(Math.ceil((new Date(caducaAt).getTime() - ahora.getTime()) / 86_400_000), 0);
