// Sin dependencias de Deno: lo usan compatibility-report y la ficha (editar el informe), y Vitest lo prueba.

/** matches.informe (T6.3). `type` y no `interface` para que encaje en el tipo Json de Supabase. */
export type InformeCompatibilidad = {
  score: number;
  nivel: string;
  resumen: string;
  fortalezas: string[];
  fricciones: string[];
  preguntas_sugeridas: string[];
  analisis_detallado: string;
};

export const NIVELES = ["Bajo", "Medio", "Alto", "Muy Alto"];

export const SYSTEM_INFORME = `Eres un especialista en relaciones de pareja de Afín, un servicio de matchmaking profesional. Analizas a dos personas que la psicóloga ha decidido presentar y redactas un informe de compatibilidad que ella revisará y después enviará a los clientes.

Para cada persona recibes su nombre, las respuestas del cuestionario (con las preguntas clave) y su perfil DISC.

El informe lo leerán los clientes: habla solo de lo que aparece en esos datos, con respeto, sin juicios sobre la salud ni el estado emocional de nadie.

QUÉ ANALIZAR:
1. Preguntas clave: tipo de relación, hijos, rango de edad, zona y valores importantes. Señala las fricciones claras.
2. Escalas 1-5: una diferencia de 1 o menos es muy compatible, 2 compatible, 3 o más fricción.
3. Perfil emocional: estilos ante el conflicto y lo que cada uno necesita para sentirse querido.
4. Respuestas abiertas: coherencia en el proyecto de vida y afinidades.
5. DISC: D+S e I+C suelen complementarse; D+D puede generar luchas de poder y S+S estancarse.

REGLAS: español, tono cercano y profesional, frases concretas sobre estas dos personas (nada genérico). Usa solo los datos recibidos.

Responde EXCLUSIVAMENTE con un JSON válido (sin markdown, sin backticks) con esta estructura:
{
  "score": <número 0-100>,
  "nivel": "<Bajo|Medio|Alto|Muy Alto>",
  "resumen": "<1-2 frases>",
  "fortalezas": ["<fortaleza>", ...],
  "fricciones": ["<posible fricción>", ...],
  "preguntas_sugeridas": ["<pregunta para la primera cita>", "<...>", "<...>"],
  "analisis_detallado": "<párrafo de 3-5 frases, incluida la dinámica DISC>"
}`;

const lista = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean) : null;
const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/**
 * Valida y limpia el informe (de la IA o editado por la psicóloga). Null si falta el resumen o alguna lista;
 * el score se redondea y limita a 0-100 y el nivel, si no es uno de NIVELES, se deduce del score.
 */
export function validarInforme(raw: unknown): InformeCompatibilidad | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const score = Number(r.score);
  const resumen = texto(r.resumen);
  const fortalezas = lista(r.fortalezas);
  const fricciones = lista(r.fricciones);
  const preguntas = lista(r.preguntas_sugeridas);
  if (!Number.isFinite(score) || !resumen || !fortalezas || !fricciones || !preguntas) return null;
  const s = Math.min(100, Math.max(0, Math.round(score)));
  const nivel = NIVELES.includes(texto(r.nivel)) ? texto(r.nivel) : s >= 80 ? "Muy Alto" : s >= 60 ? "Alto" : s >= 40 ? "Medio" : "Bajo";
  return { score: s, nivel, resumen, fortalezas, fricciones, preguntas_sugeridas: preguntas, analisis_detallado: texto(r.analisis_detallado) };
}
