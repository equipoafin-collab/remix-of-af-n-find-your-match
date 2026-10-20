// T15.2 · Área del cliente: lo que devuelve mi_area() y cómo se cuentan las fechas.
import type { PlanTipo } from "@/types/admin";

/** Sin área (plan vencido, finalizado o baja): ningún dato más. */
export interface MiAreaCerrada {
  con_area: false;
  plan_fin: string | null;
  renovacion_pedida: boolean;
}

export interface MiAreaAbierta {
  con_area: true;
  plan_fin: string | null;
  renovacion_pedida: boolean;
  nombre: string;
  plan: PlanTipo;
  sesiones_contratadas: number;
  sesiones_realizadas: number;
  sesiones_pendientes: number;
  proxima_sesion: { fecha_hora: string; duracion_min: number; tipo: "primera" | "seguimiento" } | null;
}

export type MiArea = MiAreaCerrada | MiAreaAbierta;

/** Lo que ClienteLayout pasa a cada sección (Outlet context): el área y la cuenta, para la caché. */
export interface ContextoArea {
  area: MiAreaAbierta;
  userId: string;
}

/** El aviso "tu plan termina" sale estos días antes de plan_fin. */
export const DIAS_AVISO_FIN_PLAN = 15;

// plan_fin es una fecha (YYYY-MM-DD): se lee como día local para que no cambie por la zona horaria.
const dia = (fecha: string) => new Date(`${fecha}T00:00`);
const soloDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const diasHastaFin = (planFin: string, hoy = new Date()) =>
  Math.round((dia(planFin).getTime() - soloDia(hoy).getTime()) / 86_400_000);

export function avisarFinPlan(planFin: string | null, hoy = new Date()) {
  if (!planFin) return false;
  const dias = diasHastaFin(planFin, hoy);
  return dias >= 0 && dias <= DIAS_AVISO_FIN_PLAN;
}

/** "15 de enero" (con el año si no es el actual). */
export function fechaLarga(fecha: string, hoy = new Date()) {
  const d = dia(fecha);
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", ...(d.getFullYear() !== hoy.getFullYear() && { year: "numeric" }) });
}

/** "hoy a las 18:00", "mañana a las 18:00" o "el viernes 23 de octubre a las 18:00". */
export function cuandoCita(iso: string, ahora = new Date()) {
  const d = new Date(iso);
  const hora = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  const dias = Math.round((soloDia(d).getTime() - soloDia(ahora).getTime()) / 86_400_000);
  if (dias === 0) return `hoy a las ${hora}`;
  if (dias === 1) return `mañana a las ${hora}`;
  // Intl pone coma tras el día de la semana ("viernes, 23 de octubre").
  return `el ${d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }).replace(",", "")} a las ${hora}`;
}
