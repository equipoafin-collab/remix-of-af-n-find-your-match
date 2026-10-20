// T15.2 · Área del cliente: lo que devuelve mi_area() y cómo se cuentan las fechas.
import type { MatchEstado, PlanTipo } from "@/types/admin";
import type { InformeCompatibilidad } from "../../supabase/functions/_shared/informe";

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
  en_pausa: boolean;
  /** Solicitudes pendientes a la psicóloga (T16.3). */
  solicitudes: TipoSolicitud[];
}

export type MiArea = MiAreaCerrada | MiAreaAbierta;

/** Lo que ClienteLayout pasa a cada sección (Outlet context): el área y la cuenta, para la caché. */
export interface ContextoArea {
  area: MiAreaAbierta;
  userId: string;
}

/** T16.3 · Lo que el cliente puede pedir a su psicóloga (los mismos tipos que pedir_a_psicologa; lo comprueba un test). */
export const SOLICITUDES = {
  pausa: { boton: "Pausar mi búsqueda", enviada: "Has pedido pausar tu búsqueda" },
  reanudar: { boton: "Reanudar mi búsqueda", enviada: "Has pedido reanudar tu búsqueda" },
  datos: { boton: "Copia de mis datos", enviada: "Has pedido una copia de tus datos" },
  baja: { boton: "Darme de baja", enviada: "Has pedido la baja" },
} as const;

export type TipoSolicitud = keyof typeof SOLICITUDES;

/** Pausar o reanudar según esté, la copia de datos y la baja. */
export const solicitudesDisponibles = (enPausa: boolean): TipoSolicitud[] => [enPausa ? "reanudar" : "pausa", "datos", "baja"];

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

/** T17.1 · Una cita de mis_citas(): sus sesiones con la psicóloga y (T18.2) las citas con sus matches presentados. */
export interface Cita {
  id: string;
  fecha_hora: string;
  /** Las de un match no tienen duración. */
  duracion_min: number | null;
  tipo: "primera" | "seguimiento" | "match";
  estado: "programada" | "realizada" | "cancelada" | "no_asistio";
  /** Solo en las de un match: el nombre de pila de la otra persona y el lugar. */
  con?: string;
  lugar?: string | null;
}

/** Próximas (programadas desde ahora, la más cercana primero) y pasadas (la más reciente primero). */
export function separarCitas(citas: Cita[], ahora = new Date()) {
  const proxima = (c: Cita) => c.estado === "programada" && new Date(c.fecha_hora) >= ahora;
  return {
    proximas: citas.filter(proxima).sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora)),
    pasadas: citas.filter((c) => !proxima(c)).sort((a, b) => b.fecha_hora.localeCompare(a.fecha_hora)),
  };
}

/** T18.2 · Un match presentado, de mis_matches(): de la otra persona, solo lo que puede ver. */
export interface MiMatch {
  id: string;
  estado: MatchEstado;
  presentado_at: string;
  fecha_cita: string | null;
  lugar: string | null;
  motivos: string[];
  otra: { nombre: string; edad: number; zona: string | null; aficiones: string | null; foto_url: string | null };
  /** Solo si es Premium y la psicóloga ya lo envió. */
  informe: InformeCompatibilidad | null;
}

/** El estado del match en palabras del cliente y en qué paso va (1 presentado, 2 cita, 3 tras la cita). */
export const ESTADO_MATCH_CLIENTE: Record<MatchEstado, { texto: string; paso: 1 | 2 | 3 }> = {
  propuesto: { texto: "Presentado", paso: 1 },
  informe_enviado: { texto: "Presentado", paso: 1 },
  cita_agendada: { texto: "Cita agendada", paso: 2 },
  cita_realizada: { texto: "Cita realizada", paso: 3 },
  feedback_registrado: { texto: "Cita realizada", paso: 3 },
  continuan: { texto: "Seguís conociéndoos", paso: 3 },
  cerrado: { texto: "Cerrado", paso: 3 },
};
