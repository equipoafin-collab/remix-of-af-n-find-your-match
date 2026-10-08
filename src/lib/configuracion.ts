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

type ClaveEntera = "umbral_pocas_sesiones" | "dias_sin_seguimiento" | "dias_feedback" | "umbral_alta_compatibilidad" | "num_sugerencias" | "num_candidatos_ia";

/** T9.2 · Números enteros editables en Configuración, con sus límites. */
export const CAMPOS_ENTEROS: { clave: ClaveEntera; grupo: "avisos" | "matching"; label: string; ayuda: string; min: number; max: number }[] = [
  { clave: "umbral_pocas_sesiones", grupo: "avisos", label: "Pocas sesiones", ayuda: "Avisa cuando a un cliente activo le quedan estas sesiones o menos (0: sin aviso).", min: 0, max: 10 },
  { clave: "dias_sin_seguimiento", grupo: "avisos", label: "Días sin seguimiento", ayuda: "Avisa si un cliente activo lleva estos días sin nota, sesión ni feedback.", min: 1, max: 365 },
  { clave: "dias_feedback", grupo: "avisos", label: "Plazo del feedback (días)", ayuda: "Días tras la cita para registrar el feedback de cada cliente.", min: 1, max: 60 },
  { clave: "umbral_alta_compatibilidad", grupo: "matching", label: "Alta compatibilidad (%)", ayuda: "A partir de este score, un perfil nuevo genera sugerencia y aviso.", min: 50, max: 100 },
  { clave: "num_sugerencias", grupo: "matching", label: "Sugerencias por cliente", ayuda: "Candidatos pendientes que se guardan en cada cálculo.", min: 1, max: 30 },
  { clave: "num_candidatos_ia", grupo: "matching", label: "Candidatos que valora la IA", ayuda: "Los mejores por reglas que pasan por la IA antes de elegir.", min: 1, max: 30 },
];

const MAX_SESIONES_MES = 8;
const entero = (v: number, min: number, max: number) => Number.isInteger(v) && v >= min && v <= max;

/** Errores de la configuración antes de guardarla; vacío si todo es válido. Los pesos deben sumar 100 %. */
export function validarConfiguracion(c: Configuracion): string[] {
  const errores = CAMPOS_ENTEROS
    .filter((f) => !entero(c[f.clave], f.min, f.max))
    .map((f) => `${f.label}: un número entero entre ${f.min} y ${f.max}.`);
  for (const [plan, n] of Object.entries(c.sesiones_por_plan)) {
    if (!entero(n, 0, MAX_SESIONES_MES)) errores.push(`Sesiones al mes (${plan}): un número entero entre 0 y ${MAX_SESIONES_MES}.`);
  }
  if (!(c.peso_ia >= 0 && c.peso_ia <= 1)) errores.push("Peso de la IA: entre 0 y 100 %.");
  const pesos = Object.values(c.pesos_algoritmo);
  if (pesos.some((p) => !(p >= 0))) errores.push("Pesos del algoritmo: ninguno puede ser negativo.");
  else if (Math.abs(pesos.reduce((a, b) => a + b, 0) - 1) > 0.001) errores.push("Pesos del algoritmo: deben sumar 100 %.");
  return errores;
}
