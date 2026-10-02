/**
 * Filtro `or` de PostgREST que busca `texto` con ilike en varias columnas.
 * El valor va entre comillas para que comas y paréntesis no rompan la sintaxis;
 * las comillas y barras invertidas se quitan. Devuelve null si no queda texto.
 */
export function filtroBusqueda(texto: string, columnas: string[]): string | null {
  const limpio = texto.replace(/["\\]/g, "").trim();
  if (!limpio) return null;
  return columnas.map((c) => `${c}.ilike."%${limpio}%"`).join(",");
}
