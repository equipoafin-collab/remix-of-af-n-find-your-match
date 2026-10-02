// Sin dependencias de Deno: el frontend importa el tipo y Vitest prueba la validación.

/** sesiones.resumen_ia (sección 3.1 del plan). */
export interface ResumenSesion {
  estado_emocional: string;
  temas_tratados: string[];
  avances: string[];
  objetivos: string[];
  proximos_pasos: string[];
  preferencias_detectadas: string[];
}

const LISTAS_OBLIGATORIAS = ["temas_tratados", "avances", "objetivos", "proximos_pasos"] as const;

const lista = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean) : null;

/**
 * Valida y limpia el resumen que devuelve la IA. Null si falta el estado emocional o alguna de las
 * cuatro listas principales; preferencias_detectadas puede faltar (no siempre aparecen).
 */
export function validarResumen(raw: unknown): ResumenSesion | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const estado = typeof r.estado_emocional === "string" ? r.estado_emocional.trim() : "";
  if (!estado) return null;

  const listas: Partial<Record<keyof ResumenSesion, string[]>> = {};
  for (const clave of LISTAS_OBLIGATORIAS) {
    const valores = lista(r[clave]);
    if (valores === null) return null;
    listas[clave] = valores;
  }
  return {
    estado_emocional: estado,
    temas_tratados: listas.temas_tratados!,
    avances: listas.avances!,
    objetivos: listas.objetivos!,
    proximos_pasos: listas.proximos_pasos!,
    preferencias_detectadas: lista(r.preferencias_detectadas) ?? [],
  };
}
