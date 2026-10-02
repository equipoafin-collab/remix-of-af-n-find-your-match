import type { EstadoCliente } from "@/types/admin";

const COLOR: Record<EstadoCliente, string> = {
  activo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pausado: "bg-slate-50 text-slate-700 border-slate-200",
  baja: "bg-rose-50 text-rose-700 border-rose-200",
  finalizado: "bg-blue-50 text-blue-700 border-blue-200",
};

const badge = "px-2 py-0.5 rounded-full text-xs font-body font-medium border";

export const EstadoBadge = ({ estado }: { estado: EstadoCliente }) => (
  <span className={`${badge} capitalize ${COLOR[estado]}`}>{estado}</span>
);

export const SinRevisarBadge = () => (
  <span className={`${badge} bg-amber-50 text-amber-700 border-amber-200`}>Sin revisar</span>
);
