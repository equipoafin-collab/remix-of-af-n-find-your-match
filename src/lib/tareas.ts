import type { TareaTipo } from "@/types/admin";

export const TIPO_TAREA: Record<TareaTipo, string> = {
  enviar_informe: "Enviar informe",
  registrar_feedback: "Registrar feedback",
  revisar_resumen: "Revisar resumen",
  seguimiento: "Seguimiento",
  renovacion_plan: "Renovación de plan",
  manual: "Manual",
};

/** Cómo va una tarea pendiente respecto a su fecha: vencida (en rojo), vence hoy, en los próximos 7 días o más adelante / sin fecha. */
export type Vencimiento = "vencida" | "hoy" | "semana" | "despues";

const DIA_MS = 86_400_000;

export function vencimiento(venceAt: string | null, ahora = new Date()): Vencimiento {
  if (!venceAt) return "despues";
  const vence = new Date(venceAt);
  if (vence < ahora) return "vencida";
  const finDeHoy = new Date(ahora);
  finDeHoy.setHours(23, 59, 59, 999);
  if (vence <= finDeHoy) return "hoy";
  return vence.getTime() - finDeHoy.getTime() <= 7 * DIA_MS ? "semana" : "despues";
}

/** Orden de las listas: pendientes primero, por vencimiento (sin fecha al final); luego las cerradas, la más reciente arriba. */
export function ordenarTareas<T extends { estado: string; vence_at: string | null; created_at: string }>(tareas: T[]): T[] {
  const clave = (t: T) => (t.vence_at ? Date.parse(t.vence_at) : Number.POSITIVE_INFINITY);
  return [...tareas].sort((a, b) => {
    const pa = a.estado === "pendiente", pb = b.estado === "pendiente";
    if (pa !== pb) return pa ? -1 : 1;
    if (pa) return clave(a) - clave(b);
    return b.created_at.localeCompare(a.created_at);
  });
}
