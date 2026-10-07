// Sin dependencias de Deno: la usa procesar-cola-matching y Vitest la prueba en src/lib/__tests__.
import { matchProfiles, type MatchSuggestion, type OpcionesMatching, type PerfilForMatching } from "./profileMatching.ts";
import type { EstadoSugerencia } from "./sugerencias.ts";

// T5.4 · Un perfil nuevo (o reactivado) contra todos los clientes activos con plan, solo por reglas.

/**
 * Clientes para los que el perfil nuevo es candidato muy compatible (score ≥ umbral), de mayor a menor.
 * Cada cliente con sus propios pesos/ajustes y los filtros duros de siempre (el nuevo es el candidato).
 */
export function detectarCompatibles(
  nuevo: PerfilForMatching,
  clientes: PerfilForMatching[],
  umbral: number,
  opcionesDe: (clienteId: string) => OpcionesMatching = () => ({}),
): MatchSuggestion[] {
  return clientes
    .filter((c) => c.id !== nuevo.id)
    .map((c) => matchProfiles(c, nuevo, opcionesDe(c.id)))
    .filter((m) => !m.excluded && m.score >= umbral)
    .sort((a, b) => b.score - a.score);
}

/**
 * Qué escribir en match_sugerencias para cada detección, según el estado del par (cliente → nuevo):
 * sin fila → insertar; pendiente o caducada → actualizar; aceptada o rechazada → no se toca.
 */
export function planificarDeteccion(estados: Map<string, EstadoSugerencia>, detecciones: MatchSuggestion[]) {
  const cliente = (m: MatchSuggestion) => m.perfilA.id;
  return {
    nuevas: detecciones.filter((m) => !estados.has(cliente(m))),
    actualizar: detecciones.filter((m) => ["pendiente", "caducada"].includes(estados.get(cliente(m)) ?? "")),
  };
}
