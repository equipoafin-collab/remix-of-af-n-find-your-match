import type { AlertaSeveridad, AlertaTipo } from "@/types/admin";

export const TIPO_ALERTA: Record<AlertaTipo, string> = {
  informe_pendiente: "Informe pendiente",
  feedback_pendiente: "Feedback pendiente",
  pocas_sesiones: "Pocas sesiones",
  plan_terminado: "Plan terminado",
  nuevo_compatible: "Perfil muy compatible",
  sin_seguimiento: "Sin seguimiento",
  otra: "Otra",
};

export const SEVERIDAD_ALERTA: Record<AlertaSeveridad, { label: string; color: string }> = {
  urgente: { label: "Urgente", color: "bg-rose-50 text-rose-700 border-rose-200" },
  aviso: { label: "Aviso", color: "bg-amber-50 text-amber-700 border-amber-200" },
  info: { label: "Info", color: "bg-blue-50 text-blue-700 border-blue-200" },
};
