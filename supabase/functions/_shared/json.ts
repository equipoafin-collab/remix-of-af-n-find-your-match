// Sin dependencias de Deno: lo importan también los tests de Vitest (src/lib/__tests__).

/** Parsea la respuesta de la IA, aunque venga envuelta en ```json … ``` o con texto alrededor. Null si no hay JSON. */
export function parsearJSON(contenido: unknown): unknown | null {
  if (typeof contenido !== "string") return null;
  try {
    return JSON.parse(contenido);
  } catch {
    const match = contenido.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}
