import type { EstadoCliente, PlanTipo } from "@/types/admin";

const badge = "px-2 py-0.5 rounded-full text-xs font-body font-medium border";

const ESTADO_COLOR: Record<EstadoCliente, string> = {
  activo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pausado: "bg-slate-50 text-slate-700 border-slate-200",
  baja: "bg-rose-50 text-rose-700 border-rose-200",
  finalizado: "bg-blue-50 text-blue-700 border-blue-200",
};

const PLAN_COLOR: Record<PlanTipo, string> = {
  esencial: "bg-indigo-50 text-indigo-700 border-indigo-200",
  premium: "bg-gold/15 text-foreground border-gold/40",
};

export const EstadoBadge = ({ estado }: { estado: EstadoCliente }) => (
  <span className={`${badge} capitalize ${ESTADO_COLOR[estado]}`}>{estado}</span>
);

export const SinRevisarBadge = () => (
  <span className={`${badge} bg-amber-50 text-amber-700 border-amber-200`}>Sin revisar</span>
);

/** Sin plan = lead (rellenó el cuestionario pero no ha contratado). */
export const PlanBadge = ({ plan }: { plan: PlanTipo | null }) =>
  plan ? (
    <span className={`${badge} capitalize ${PLAN_COLOR[plan]}`}>{plan}</span>
  ) : (
    <span className={`${badge} bg-muted text-muted-foreground border-border`}>Lead</span>
  );
