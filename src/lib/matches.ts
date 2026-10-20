import type { MatchEstado } from "@/types/admin";

// En el orden del flujo (sección 3.1). El informe es opcional: con plan Esencial se pasa de propuesto a la cita.
export const ESTADO_MATCH: Record<MatchEstado, { label: string; color: string }> = {
  propuesto: { label: "Propuesto", color: "bg-slate-50 text-slate-700 border-slate-200" },
  informe_enviado: { label: "Informe enviado", color: "bg-blue-50 text-blue-700 border-blue-200" },
  cita_agendada: { label: "Cita agendada", color: "bg-amber-50 text-amber-700 border-amber-200" },
  cita_realizada: { label: "Cita realizada", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  feedback_registrado: { label: "Feedback registrado", color: "bg-violet-50 text-violet-700 border-violet-200" },
  continuan: { label: "Continúan", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cerrado: { label: "Cerrado", color: "bg-muted text-muted-foreground border-border" },
};

// Estados a los que solo se llega con la cita agendada.
const CON_CITA: MatchEstado[] = ["cita_agendada", "cita_realizada", "feedback_registrado", "continuan"];

/**
 * T9.1 · Embudo de Matches Aprobados: todos empiezan propuestos; "con cita" los que llegaron a agendarla
 * (también los cerrados después, que conservan la fecha); "continúan" los que siguen viéndose.
 */
export function embudoMatches(matches: { estado: MatchEstado; fecha_cita: string | null }[]) {
  return {
    propuestos: matches.length,
    conCita: matches.filter((m) => m.fecha_cita || CON_CITA.includes(m.estado)).length,
    continuan: matches.filter((m) => m.estado === "continuan").length,
  };
}

/** T18.1 · Motivos que leen los dos clientes al presentarles el match (CHECK en la base de datos). */
export const MAX_MOTIVOS_CLIENTE = 5;
export const MAX_LARGO_MOTIVO = 160;

/** Un motivo por línea: sin vacíos ni repetidos, recortados y como mucho MAX_MOTIVOS_CLIENTE. */
export function limpiarMotivos(texto: string) {
  const motivos = texto.split("\n").map((m) => m.trim().slice(0, MAX_LARGO_MOTIVO)).filter(Boolean);
  return [...new Set(motivos)].slice(0, MAX_MOTIVOS_CLIENTE);
}
