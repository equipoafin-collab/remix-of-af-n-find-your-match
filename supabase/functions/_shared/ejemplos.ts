// T19.5 · Rondas con perfiles de ejemplo: 4 personas inventadas por la IA que encajan con lo que busca el cliente en
// todo menos en una cosa, distinta en cada una. Lo que elige dice qué le importa menos; lo que descarta, qué más.
// Sin dependencias de Deno: lo usan ronda-ejemplo, el aprendizaje y la app, y Vitest lo prueba.
import { WEIGHTS, type Dimension } from "./profileMatching.ts";

/** Lo que cambia en cada perfil y la dimensión del matching que mueve (null: no hay una, lo recoge la IA en preferencias). */
export const DIMENSIONES_EJEMPLO = {
  edad: { etiqueta: "Edad", matching: null },
  estilo_de_vida: { etiqueta: "Estilo de vida", matching: "estiloVida" },
  valores: { etiqueta: "Valores", matching: "valores" },
  ambicion: { etiqueta: "Ambición", matching: null },
} as const satisfies Record<string, { etiqueta: string; matching: Dimension | null }>;

export type DimensionEjemplo = keyof typeof DIMENSIONES_EJEMPLO;

// Los mismos límites repite el trigger propuestas_rondas_validar.
export const MAX_NOMBRE = 40;
export const MAX_ZONA = 60;
export const MAX_AFICIONES = 200;
export const MAX_RASGO = 160;
export const MAX_CAMBIO = 160;

/**
 * Un perfil de ejemplo. El cliente ve nombre, edad, zona, aficiones, rasgo y frase (que escribe la psicóloga);
 * dimension y cambio son solo para ella y para el aprendizaje.
 */
export interface PerfilEjemplo {
  id?: string; // lo pone el trigger al enviar la ronda
  dimension: DimensionEjemplo;
  nombre: string;
  edad: number;
  zona: string;
  aficiones: string;
  rasgo: string;
  cambio: string;
  frase?: string;
}

/**
 * Lo que busca el cliente, sin nombre ni contacto. Sus respuestas sobre religión y política no van, pero lo aprendido
 * (preferencias, T5.3) puede mencionarlas: la IA ya lo recibe para el matching con su consentimiento (T9.3).
 */
export interface DatosEjemplos {
  genero: string | null;
  busca_genero: string | null;
  edad: number;
  edad_min_busca: number | null;
  edad_max_busca: number | null;
  ciudad: string;
  zona: string | null;
  acepta_otras_zonas: boolean;
  tipo_relacion: string;
  hijos: string;
  valores_importantes: string[];
  hobbies: string | null;
  fin_de_semana: string | null;
  estilo_vida_activo: number;
  ambicion_profesional: number;
  preferencias: { valora?: string[]; evita?: string[] } | null;
}

export const COLUMNAS_EJEMPLOS =
  "genero, busca_genero, edad, edad_min_busca, edad_max_busca, ciudad, zona, acepta_otras_zonas, tipo_relacion, hijos, " +
  "valores_importantes, hobbies, fin_de_semana, estilo_vida_activo, ambicion_profesional";

export const SYSTEM_EJEMPLOS = `Eres la asistente de una psicóloga de Afín, un servicio de matchmaking profesional. Vas a inventar 4 perfiles de ejemplo, de personas que NO existen, para que el cliente diga con cuál se ve más y así entender mejor qué busca.

Los 4 perfiles encajan con lo que busca el cliente en todo salvo en UNA cosa, distinta en cada uno:
- "edad": fuera de su rango de edad, unos 5-8 años por arriba o por abajo.
- "estilo_de_vida": mucho más o mucho menos activo que él, con otra forma de pasar el fin de semana.
- "valores": con valores importantes distintos de los suyos.
- "ambicion": con otra relación con el trabajo (muy volcado en su carrera, o muy tranquilo).

REGLAS:
- Del género que busca el cliente. Nombres de pila españoles corrientes, inventados, sin apellidos.
- "zona": la del cliente o cercana ("Chamberí, Madrid" o "Madrid").
- "aficiones": 3 aficiones separadas por comas.
- "rasgo": una frase, de 140 caracteres como mucho, que describa a la persona y deje ver lo que cambia. En tercera persona, cálida y sin juicios. No la compares con el cliente.
- "cambio": para la psicóloga, qué se ha cambiado respecto a lo que busca el cliente (120 caracteres como mucho).
- Nada de religión, política, salud, origen, aspecto físico ni datos de contacto.
- Escribe en español.

Responde EXCLUSIVAMENTE con un JSON válido (sin markdown, sin backticks) con esta estructura:
{
  "perfiles": [
    { "dimension": "edad" | "estilo_de_vida" | "valores" | "ambicion", "nombre": "<nombre>", "edad": <número>, "zona": "<zona>", "aficiones": "<a, b, c>", "rasgo": "<frase>", "cambio": "<para la psicóloga>" }
  ]
}`;

const escala = (n: number) => `${n}/5`;

/** El mensaje para la IA: lo que busca el cliente y lo aprendido de él. */
export function promptEjemplos(d: DatosEjemplos) {
  const rango = d.edad_min_busca || d.edad_max_busca ? `${d.edad_min_busca ?? "?"}-${d.edad_max_busca ?? "?"} años` : "sin rango indicado";
  return [
    "LO QUE BUSCA EL CLIENTE",
    `- Cliente: ${d.genero ?? "persona"} de ${d.edad} años, en ${d.zona ? `${d.zona}, ` : ""}${d.ciudad}${d.acepta_otras_zonas ? " (abierto a otras zonas)" : ""}.`,
    `- Busca: ${d.busca_genero ?? "sin preferencia de género"}, de ${rango}, para ${d.tipo_relacion}. Hijos: ${d.hijos}.`,
    `- Valores importantes: ${d.valores_importantes.length ? d.valores_importantes.join(", ") : "no indicados"}.`,
    `- Aficiones: ${d.hobbies?.trim() || "no indicadas"}. Fin de semana: ${d.fin_de_semana?.trim() || "no indicado"}.`,
    `- Estilo de vida activo: ${escala(d.estilo_vida_activo)}. Ambición profesional: ${escala(d.ambicion_profesional)}.`,
    d.preferencias?.valora?.length ? `- Valora (aprendido): ${d.preferencias.valora.join("; ")}.` : "",
    d.preferencias?.evita?.length ? `- Evita (aprendido): ${d.preferencias.evita.join("; ")}.` : "",
  ].filter(Boolean).join("\n");
}

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Los 4 perfiles de la IA, uno por cada dimensión, o null si falta alguno o alguno está incompleto. */
export function validarEjemplos(raw: unknown): PerfilEjemplo[] | null {
  const perfiles = (raw as { perfiles?: unknown } | null)?.perfiles;
  if (!Array.isArray(perfiles) || perfiles.length !== 4) return null;
  const limpios = perfiles.map((p): PerfilEjemplo | null => {
    const r = (p ?? {}) as Record<string, unknown>;
    const edad = Math.round(Number(r.edad));
    const perfil = {
      dimension: r.dimension as DimensionEjemplo,
      nombre: texto(r.nombre, MAX_NOMBRE),
      edad,
      zona: texto(r.zona, MAX_ZONA),
      aficiones: texto(r.aficiones, MAX_AFICIONES),
      rasgo: texto(r.rasgo, MAX_RASGO),
      cambio: texto(r.cambio, MAX_CAMBIO),
    };
    const valido = perfil.dimension in DIMENSIONES_EJEMPLO && perfil.nombre && perfil.rasgo && edad >= 18 && edad <= 99;
    return valido ? perfil : null;
  });
  if (limpios.some((p) => !p)) return null;
  const ok = limpios as PerfilEjemplo[];
  return new Set(ok.map((p) => p.dimension)).size === 4 ? ok : null;
}

const CON = 80; // encaja con lo que busca
const SIN = 40; // lo que cambia

/**
 * El desglose con el que cuenta un perfil de ejemplo como decisión (T19.4): encaja en todo menos en lo que cambia.
 * Elegirlo resta peso a esa dimensión y descartarlo se lo suma. Edad y ambición no tienen dimensión: null.
 */
export function desgloseEjemplo(dimension: DimensionEjemplo): Partial<Record<Dimension, number>> | null {
  const cambia = DIMENSIONES_EJEMPLO[dimension]?.matching;
  if (!cambia) return null;
  return Object.fromEntries((Object.keys(WEIGHTS) as Dimension[]).map((d) => [d, d === cambia ? SIN : CON]));
}

/** Cómo lee la IA un perfil de ejemplo en el contexto del cliente. */
export const describirEjemplo = (e: Pick<PerfilEjemplo, "dimension" | "edad" | "zona" | "cambio" | "rasgo">) =>
  `perfil de ejemplo inventado, ${e.edad} años${e.zona ? `, ${e.zona}` : ""}, distinto en ${(DIMENSIONES_EJEMPLO[e.dimension]?.etiqueta ?? e.dimension).toLowerCase()}: ${e.cambio || e.rasgo}`;
