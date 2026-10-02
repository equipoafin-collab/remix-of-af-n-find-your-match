import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { findMatchesFor, type MatchSuggestion } from "@/lib/profileMatching";
import { usePerfiles } from "@/hooks/admin/usePerfiles";
import FotoPerfil from "@/components/admin/FotoPerfil";
import type { Perfil } from "@/types/admin";

// Ranking por reglas calculado en el navegador; T4.5 lo sustituye por las sugerencias guardadas.
const SugerenciasTab = ({ perfil }: { perfil: Perfil }) => {
  const { data: pool = [] } = usePerfiles();
  const [calculado, setCalculado] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [matches, setMatches] = useState<MatchSuggestion[]>([]);

  const buscarPareja = () => {
    setCalculating(true);
    setCalculado(true);
    setTimeout(() => {
      setMatches(findMatchesFor(perfil, pool, 20));
      setCalculating(false);
    }, 50);
  };

  return (
    <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-gold" /> Top candidatos compatibles
        </h2>
        <button
          onClick={buscarPareja}
          className="bg-gold text-accent-foreground hover:bg-gold/90 transition-colors px-5 py-2.5 rounded-xl font-body text-sm font-semibold inline-flex items-center gap-2 shadow-sm"
        >
          <Sparkles className="w-4 h-4" /> Buscar Pareja Compatible
        </button>
      </div>
      {!calculado ? null : calculating ? (
        <p className="font-body text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Calculando compatibilidad…</p>
      ) : matches.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground">No hay candidatos compatibles. Todos los demás perfiles entran en conflicto con los filtros excluyentes (género, edad, hijos, religión o política).</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {matches.map((m) => {
            const other = m.perfilB;
            const color = m.score >= 80 ? "text-emerald-600 border-emerald-200 bg-emerald-50" : m.score >= 60 ? "text-amber-700 border-amber-200 bg-amber-50" : "text-rose-700 border-rose-200 bg-rose-50";
            return (
              <Link key={other.id} to={`/admin/perfiles/${other.id}`} className="block bg-background border border-border rounded-xl p-4 hover:border-gold transition-colors">
                <div className="flex items-center gap-3">
                  <FotoPerfil path={other.foto_url} nombre={other.nombre_completo} className="w-12 h-12 rounded-full text-sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-semibold text-foreground truncate">{other.nombre_completo}</p>
                    <p className="font-body text-xs text-muted-foreground">{other.edad} años · {other.ciudad}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-sm font-display font-bold border ${color}`}>{m.score}%</span>
                </div>
                {m.highlights.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {m.highlights.slice(0, 3).map((h, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-[11px] font-body bg-emerald-50 text-emerald-700 border border-emerald-200">✓ {h}</span>
                    ))}
                  </div>
                )}
                {m.warnings.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {m.warnings.slice(0, 2).map((w, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-[11px] font-body bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" /> {w}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default SugerenciasTab;
