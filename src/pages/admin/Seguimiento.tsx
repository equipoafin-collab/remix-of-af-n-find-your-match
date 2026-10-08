import { Link } from "react-router-dom";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";
import { PlanBadge } from "@/components/admin/Badges";
import { useMatches } from "@/hooks/admin/useMatches";
import { ESTADO_MATCH } from "@/lib/matches";

// Los cerrados no tienen columna: se consultan en Matches Aprobados.
const COLUMNAS = Constants.public.Enums.match_estado.filter((e) => e !== "cerrado");

const fecha = (iso: string, conHora = false) =>
  new Date(iso).toLocaleString("es-ES", { day: "numeric", month: "short", ...(conHora && { hour: "2-digit", minute: "2-digit" }) });

// T9.1 · Tablero de los matches abiertos por estado. Solo lectura: el estado se cambia en Matches Aprobados o en la ficha.
const Seguimiento = () => {
  const { data: matches = [], isLoading, error } = useMatches();
  const cerrados = matches.filter((m) => m.estado === "cerrado").length;
  const abiertos = matches.length - cerrados;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-2"><CheckCircle2 className="w-7 h-7 text-gold" /> Seguimiento</h1>
        <p className="font-body text-sm text-muted-foreground mt-1">
          {abiertos} match{abiertos === 1 ? "" : "es"} abierto{abiertos === 1 ? "" : "s"} · {cerrados} cerrado{cerrados === 1 ? "" : "s"} en{" "}
          <Link to="/admin/matches" className="text-gold-texto underline">Matches Aprobados</Link>
        </p>
      </div>

      {error ? (
        <p className="font-body text-sm text-rose-700">No se pudieron cargar los matches: {error.message}</p>
      ) : isLoading ? (
        <p className="font-body text-sm text-muted-foreground">Cargando matches…</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {COLUMNAS.map((estado) => {
            const enColumna = matches.filter((m) => m.estado === estado);
            return (
              <section key={estado} className="w-64 shrink-0 bg-card border border-border rounded-2xl flex flex-col max-h-[calc(100vh-11rem)]">
                <h2 className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-body font-medium border ${ESTADO_MATCH[estado].color}`}>{ESTADO_MATCH[estado].label}</span>
                  <span className="font-body text-xs text-muted-foreground tabular-nums">{enColumna.length}</span>
                </h2>
                <ul className="p-2 space-y-2 overflow-y-auto">
                  {enColumna.length === 0 && <li className="px-2 py-3 font-body text-xs text-muted-foreground">Sin matches</li>}
                  {enColumna.map((m) => (
                    <li key={m.id}>
                      <Link to={`/admin/perfiles/${m.perfil_a}?tab=matches`} className="block bg-background border border-border rounded-xl p-3 hover:border-gold/50 transition-colors">
                        {[m.a, m.b].map((p, i) => (
                          <p key={p?.id ?? i} className="font-body text-sm font-semibold text-foreground flex items-center justify-between gap-2">
                            <span className="truncate">{p?.nombre_completo}</span>
                            <PlanBadge plan={p?.plan ?? null} />
                          </p>
                        ))}
                        <p className="font-body text-xs text-muted-foreground mt-1.5">
                          {m.fecha_cita ? (
                            <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5 text-gold" /> {fecha(m.fecha_cita, true)}</span>
                          ) : (
                            `Propuesto el ${fecha(m.created_at)}`
                          )}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Seguimiento;
