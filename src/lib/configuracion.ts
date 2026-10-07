import type { Json } from "@/integrations/supabase/types";
import type { PlanTipo } from "@/types/admin";
import { WEIGHTS } from "@/lib/profileMatching";

export interface Configuracion {
  /** Sesiones al mes según el plan. */
  sesiones_por_plan: Record<PlanTipo, number>;
  umbral_pocas_sesiones: number;
  dias_sin_seguimiento: number;
  umbral_alta_compatibilidad: number;
  dias_feedback: number;
  num_sugerencias: number;
  /** Mejores por reglas que re-puntúa la IA (T5.2). */
  num_candidatos_ia: number;
  /** Peso de la IA en el score final (0-1); el de las reglas es 1 − peso_ia. */
  peso_ia: number;
  pesos_algoritmo: typeof WEIGHTS;
}

/** Mismos valores que inserta la migración T0.5; se usan si falta alguna fila. */
export const CONFIGURACION_POR_DEFECTO: Configuracion = {
  sesiones_por_plan: { esencial: 1, premium: 2 },
  umbral_pocas_sesiones: 1,
  dias_sin_seguimiento: 21,
  umbral_alta_compatibilidad: 80,
  dias_feedback: 3,
  num_sugerencias: 10,
  num_candidatos_ia: 15,
  peso_ia: 0.5,
  pesos_algoritmo: WEIGHTS,
};

/** Convierte las filas clave/valor de la tabla en un objeto, rellenando lo que falte con los valores por defecto. */
export const construirConfiguracion = (filas: { clave: string; valor: Json }[]): Configuracion => ({
  ...CONFIGURACION_POR_DEFECTO,
  ...Object.fromEntries(filas.filter((f) => f.clave in CONFIGURACION_POR_DEFECTO).map((f) => [f.clave, f.valor])),
});
