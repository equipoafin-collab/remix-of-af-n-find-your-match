// Sin dependencias de Deno: lo usan actualizar-aprendizaje y la ficha (motivos de rechazo), y Vitest lo prueba.
import { WEIGHTS, type Dimension, type Pesos } from "./profileMatching.ts";

// T5.3 · Aprender de las decisiones de la psicóloga, sin entrenar modelos (sección 3.2 del plan).

/** Chips de "Rechazar" y la dimensión del matching a la que apuntan (null: no hay una, lo recoge la IA en preferencias). */
export const MOTIVOS_RECHAZO: Record<string, Dimension | null> = {
  "Edad": null, // la edad es un filtro, no una dimensión con peso
  "Distancia": "geografia",
  "Valores": "valores",
  "Físico": "preferencias",
  "Intuición profesional": null,
};

/** motivo_decision se guarda como "Distancia, Edad — texto libre": los chips van antes de " — ". */
export const chipsDelMotivo = (motivo: string | null) =>
  (motivo ?? "").split(" — ")[0].split(", ").filter((c) => c in MOTIVOS_RECHAZO);

export const MIN_DECISIONES = 3;
export const LIMITE_AJUSTE = 0.3;

export interface Decision {
  estado: string;
  desglose: Partial<Record<Dimension, number>> | null;
  motivo: string | null;
}

const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const DIMENSIONES = Object.keys(WEIGHTS) as Dimension[];

/** Cuánto destaca cada dimensión en un grupo de decisiones respecto a la media de sus dimensiones (en tanto por uno). */
function destaque(grupo: Decision[]): Partial<Record<Dimension, number>> {
  if (!grupo.length) return {};
  const medias = DIMENSIONES.map((d) => media(grupo.map((x) => x.desglose?.[d] ?? 0)));
  const general = media(medias);
  return Object.fromEntries(DIMENSIONES.map((d, i) => [d, (medias[i] - general) / 100]));
}

/**
 * Multiplicadores por dimensión para el matching del cliente (perfil_aprendizaje.ajustes_pesos), entre 0,7 y 1,3.
 * - Lo que destacaba en los aceptados gana peso; lo que destacaba en los rechazados lo pierde (y lo que flojeaba, lo gana:
 *   si los rechazados puntuaban poco en geografía, la distancia importaba).
 * - Cada chip de rechazo suma hasta +30 % a su dimensión, según la parte de los rechazos que lo citan.
 * Con menos de MIN_DECISIONES no se ajusta nada.
 */
export function calcularAjustes(decisiones: Decision[]): Partial<Pesos> {
  if (decisiones.length < MIN_DECISIONES) return {};
  const aceptadas = decisiones.filter((x) => x.estado === "aceptada");
  const rechazadas = decisiones.filter((x) => x.estado === "rechazada");
  const enAceptadas = destaque(aceptadas);
  const enRechazadas = destaque(rechazadas);
  const citas = rechazadas.flatMap((x) => chipsDelMotivo(x.motivo)).map((c) => MOTIVOS_RECHAZO[c]);

  return Object.fromEntries(DIMENSIONES.map((d) => {
    const porChips = rechazadas.length ? (LIMITE_AJUSTE * citas.filter((c) => c === d).length) / rechazadas.length : 0;
    const delta = (enAceptadas[d] ?? 0) - (enRechazadas[d] ?? 0) + porChips;
    const factor = Math.min(1 + LIMITE_AJUSTE, Math.max(1 - LIMITE_AJUSTE, 1 + delta));
    return [d, Math.round(factor * 100) / 100];
  }));
}

export type Preferencias = { valora: string[]; evita: string[]; notas: string };

export const SYSTEM_APRENDIZAJE = `Eres la asistente de una psicóloga de Afín, un servicio de matchmaking profesional. Recibes el contexto de un cliente (preguntas clave, cuestionario, resúmenes de sus sesiones, notas de la psicóloga, preferencias aprendidas hasta ahora y decisiones de la psicóloga sobre candidatos, con su motivo).

Resume qué valora y qué evita este cliente en una pareja, sobre todo a partir de lo que ha contado en sesión, las notas de la psicóloga y los candidatos que ella ha aceptado o rechazado (y por qué). Servirá para afinar las próximas sugerencias.

REGLAS:
- Escribe en español, en puntos breves y concretos ("Prefiere a alguien de Madrid o alrededores", no "valora la cercanía").
- Si hay "Preferencias aprendidas", parte de ellas: pueden incluir correcciones de la psicóloga. Consérvalas salvo que los datos nuevos las contradigan.
- No copies las respuestas del cuestionario: aporta lo que se deduce de sesiones, notas y decisiones.
- Usa solo los datos recibidos. No inventes ni diagnostiques. Si no hay nada que aprender, deja las listas vacías.

Responde EXCLUSIVAMENTE con un JSON válido (sin markdown, sin backticks) con esta estructura:
{
  "valora": ["<preferencia>", ...],
  "evita": ["<lo que no quiere>", ...],
  "notas": "<1-3 frases con lo más útil para elegir candidatos, o vacío>"
}`;

const MAX_PUNTOS = 8;
const MAX_NOTAS = 600;
const puntos = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean).slice(0, MAX_PUNTOS) : null;

/** Valida las preferencias de la IA o las que edita la psicóloga. Null si no tienen la forma { valora, evita, notas }. */
export function validarPreferencias(raw: unknown): Preferencias | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const valora = puntos(r.valora);
  const evita = puntos(r.evita);
  if (!valora || !evita) return null;
  return { valora, evita, notas: typeof r.notas === "string" ? r.notas.trim().slice(0, MAX_NOTAS) : "" };
}
