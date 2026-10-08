import { useState } from "react";
import { Heart } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";
import { FilaMatch } from "@/components/admin/ficha/MatchesTab";
import { useMatches } from "@/hooks/admin/useMatches";
import { ESTADO_MATCH, embudoMatches } from "@/lib/matches";
import type { MatchEstado } from "@/types/admin";

const selector = "px-3 py-2 rounded-lg border border-border bg-background font-body text-sm";
const pct = (parte: number, total: number) => (total ? `${Math.round((parte / total) * 100)} %` : "–");

// T9.1 · Todos los matches, con el mismo control que la pestaña Matches de la ficha, filtros y embudo.
const MatchesAprobados = () => {
  const { data: matches = [], isLoading, error } = useMatches();
  const [estado, setEstado] = useState<MatchEstado | "abiertos" | "">("abiertos");
  const [texto, setTexto] = useState("");

  const embudo = embudoMatches(matches);
  const pasos = [
    { label: "Propuestos", valor: embudo.propuestos, detalle: "Sugerencias aceptadas" },
    { label: "Con cita", valor: embudo.conCita, detalle: `${pct(embudo.conCita, embudo.propuestos)} de los propuestos` },
    { label: "Continúan", valor: embudo.continuan, detalle: `${pct(embudo.continuan, embudo.conCita)} de los que tuvieron cita` },
  ];
  const abiertos = matches.filter((m) => m.estado !== "cerrado").length;
  const busqueda = texto.trim().toLowerCase();
  const visibles = matches.filter((m) =>
    (estado === "" || (estado === "abiertos" ? m.estado !== "cerrado" : m.estado === estado)) &&
    (!busqueda || [m.a?.nombre_completo, m.b?.nombre_completo].some((n) => n?.toLowerCase().includes(busqueda))),
  );

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-2"><Heart className="w-7 h-7 text-gold" /> Matches Aprobados</h1>
        <p className="font-body text-sm text-muted-foreground mt-1">
          {matches.length} match{matches.length === 1 ? "" : "es"} · {abiertos} abierto{abiertos === 1 ? "" : "s"}
        </p>
      </div>

      <section className="grid sm:grid-cols-3 gap-3">
        {pasos.map((p, i) => (
          <div key={p.label} className="bg-card border border-border rounded-2xl p-5">
            <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">{i + 1}. {p.label}</p>
            <p className="font-display text-3xl font-bold text-foreground mt-1 tabular-nums">{p.valor}</p>
            <p className="font-body text-xs text-muted-foreground mt-1">{p.detalle}</p>
          </div>
        ))}
      </section>

      <section className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-5 flex gap-3 flex-wrap">
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por nombre…" className={`${selector} flex-1 min-w-48`} />
          <select value={estado} onChange={(e) => setEstado(e.target.value as MatchEstado | "abiertos" | "")} className={selector}>
            <option value="abiertos">Abiertos</option>
            {Constants.public.Enums.match_estado.map((e) => <option key={e} value={e}>{ESTADO_MATCH[e].label}</option>)}
            <option value="">Todos</option>
          </select>
        </div>
        {error ? (
          <p className="px-5 py-4 border-t border-border font-body text-sm text-rose-700">No se pudieron cargar los matches: {error.message}</p>
        ) : isLoading ? (
          <p className="px-5 py-4 border-t border-border font-body text-sm text-muted-foreground">Cargando matches…</p>
        ) : visibles.length === 0 ? (
          <p className="px-5 py-4 border-t border-border font-body text-sm text-muted-foreground">
            {matches.length ? "No hay matches con estos filtros." : "Aún no hay matches. Se crean al aceptar una sugerencia."}
          </p>
        ) : (
          <ul>{visibles.map((m) => <FilaMatch key={m.id} match={m} />)}</ul>
        )}
      </section>
    </div>
  );
};

export default MatchesAprobados;
