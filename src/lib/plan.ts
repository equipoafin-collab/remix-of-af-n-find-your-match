import type { PlanTipo } from "@/types/admin";

const DIA_MS = 86_400_000;
const DIAS_POR_MES = 30.44;

/** Meses que cubre un plan (fechas YYYY-MM-DD, ambas incluidas), redondeados y como mínimo 1. Null si faltan o están al revés. */
export function mesesDePlan(inicio: string, fin: string): number | null {
  const dias = (Date.parse(fin) - Date.parse(inicio)) / DIA_MS + 1;
  if (!Number.isFinite(dias) || dias < 1) return null;
  return Math.max(1, Math.round(dias / DIAS_POR_MES));
}

/** Sesiones a contratar según el plan y su duración (configuracion.sesiones_por_plan son sesiones al mes). */
export function sesionesSugeridas(
  plan: PlanTipo | null,
  inicio: string,
  fin: string,
  sesionesPorMes: Record<PlanTipo, number>,
): number | null {
  const meses = plan ? mesesDePlan(inicio, fin) : null;
  return plan && meses !== null ? meses * sesionesPorMes[plan] : null;
}
