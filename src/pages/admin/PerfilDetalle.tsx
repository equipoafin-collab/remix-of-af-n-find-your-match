import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, MapPin, Cake, User, Heart, Cigarette, Wine, Briefcase, Sparkles,
  ShieldAlert, Save, Loader2, Trophy, AlertTriangle, type LucideIcon,
} from "lucide-react";
import { findMatchesFor, type MatchSuggestion } from "@/lib/profileMatching";
import { toast } from "@/hooks/use-toast";
import { usePerfil, usePerfiles, useUpdatePerfil } from "@/hooks/admin/usePerfiles";

import type { EstadoCliente, Perfil } from "@/types/admin";
import FotoPerfil from "@/components/admin/FotoPerfil";
import { EstadoBadge, PlanBadge, SinRevisarBadge } from "@/components/admin/Badges";
import { Constants } from "@/integrations/supabase/types";

const Field = ({ label, value }: { label: string; value: ReactNode }) => (
  <div>
    <p className="font-body text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="font-body text-sm text-foreground mt-0.5">{value || <span className="text-muted-foreground/60">—</span>}</p>
  </div>
);

const Section = ({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) => (
  <section className="bg-card border border-border rounded-2xl p-5">
    <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-gold" /> {title}
    </h3>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
  </section>
);

const Scale = ({ label, value }: { label: string; value: number | null }) => (
  <div>
    <p className="font-body text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-gold" style={{ width: `${((value || 0) / 5) * 100}%` }} />
      </div>
      <span className="font-body text-xs text-muted-foreground tabular-nums">{value ?? 0}/5</span>
    </div>
  </div>
);

// Se monta con key={perfil.id}: el formulario arranca con los valores guardados
// y no se pisa si React Query refresca el perfil mientras se edita.
const EstadoYNotas = ({ perfil }: { perfil: Perfil }) => {
  const [estado, setEstado] = useState(perfil.estado_cliente);
  const [revisado, setRevisado] = useState(perfil.revisado);
  const [notas, setNotas] = useState(perfil.notas_admin || "");
  const updatePerfil = useUpdatePerfil();

  const guardar = () =>
    updatePerfil.mutate(
      { id: perfil.id, cambios: { estado_cliente: estado, revisado, notas_admin: notas } },
      {
        onSuccess: () => toast({ title: "Guardado", description: "Cambios aplicados." }),
        onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
      },
    );

  return (
    <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <h3 className="font-display text-sm font-semibold text-foreground">Estado y notas internas</h3>
      <div className="grid sm:grid-cols-[200px_1fr] gap-4 items-start">
        <div>
          <label className="font-body text-xs text-muted-foreground uppercase tracking-wider">Estado del perfil</label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoCliente)}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm capitalize"
          >
            {Constants.public.Enums.estado_cliente.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <label className="mt-3 flex items-center gap-2 font-body text-sm text-foreground">
            <input type="checkbox" checked={revisado} onChange={(e) => setRevisado(e.target.checked)} className="accent-gold" />
            Perfil revisado
          </label>
        </div>
        <div>
          <label className="font-body text-xs text-muted-foreground uppercase tracking-wider">Notas privadas (solo admin)</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={4}
            placeholder="Ej: Muy implicado, busca matrimonio pronto, excelente candidato…"
            className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm resize-y"
          />
        </div>
      </div>
      <button
        onClick={guardar}
        disabled={updatePerfil.isPending}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background font-body text-sm font-semibold hover:opacity-90 disabled:opacity-50"
      >
        {updatePerfil.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar cambios
      </button>
    </section>
  );
};

const PerfilDetalle = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: perfil, isLoading: loading } = usePerfil(id);
  const { data: pool = [] } = usePerfiles();
  const [showMatches, setShowMatches] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [matches, setMatches] = useState<MatchSuggestion[]>([]);

  const buscarPareja = () => {
    if (!perfil) return;
    setCalculating(true);
    setShowMatches(true);
    setTimeout(() => {
      const results = findMatchesFor(perfil, pool, 20);
      setMatches(results);
      setCalculating(false);
    }, 50);
  };

  const calidad = useMemo(() => {
    if (!perfil) return null;
    const p = perfil;
    let score = 0;
    if (p.foto_url) score += 15;
    if (p.hobbies) score += 10;
    if (p.relacion_sana) score += 10;
    if (p.vida_en_10_anios) score += 10;
    if (p.aprendizaje_ultima_relacion) score += 5;
    if (p.religion) score += 10;
    if (p.ideologia) score += 5;
    if (p.alcohol) score += 5;
    if (p.desea_casarse) score += 10;
    if (p.disc_perfil) score += 10;
    if (p.telefono) score += 10;
    if (score >= 80) return { label: "Excelente", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" };
    if (score >= 60) return { label: "Alto potencial", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" };
    if (score >= 40) return { label: "Medio", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" };
    return { label: "Bajo", color: "text-rose-600", bg: "bg-rose-50 border-rose-200" };
  }, [perfil]);

  if (loading) return <div className="p-8 font-body text-muted-foreground">Cargando perfil…</div>;
  if (!perfil) return <div className="p-8 font-body text-muted-foreground">Perfil no encontrado.</div>;

  const p = perfil;

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      <button onClick={() => navigate("/admin/perfiles")} className="inline-flex items-center gap-1 text-sm font-body text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Volver a perfiles
      </button>

      {/* Header */}
      <div className="bg-card border border-border rounded-2xl p-6 flex items-start gap-5 flex-wrap">
        <FotoPerfil path={p.foto_url} nombre={p.nombre_completo} className="w-24 h-24 rounded-2xl text-2xl" />
        <div className="flex-1 min-w-[200px]">
          <h1 className="font-display text-2xl font-bold text-foreground">{p.nombre_completo}</h1>
          <p className="font-body text-sm text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1"><Cake className="w-3.5 h-3.5" />{p.edad} años</span>
            <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{p.ciudad}</span>
            <span className="inline-flex items-center gap-1"><User className="w-3.5 h-3.5" />{p.genero || "—"}</span>
            <span>Busca: {p.busca_genero || "—"}</span>
          </p>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <PlanBadge plan={p.plan} />
            <EstadoBadge estado={p.estado_cliente} />
            {!p.revisado && <SinRevisarBadge />}
            {calidad && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-body font-medium border ${calidad.bg} ${calidad.color}`}>
                <Trophy className="w-3 h-3" /> Calidad: {calidad.label}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={buscarPareja}
          className="bg-gold text-accent-foreground hover:bg-gold/90 transition-colors px-5 py-2.5 rounded-xl font-body text-sm font-semibold inline-flex items-center gap-2 shadow-sm"
        >
          <Sparkles className="w-4 h-4" /> Buscar Pareja Compatible
        </button>
      </div>

      {/* Ranking matches */}
      {showMatches && (
        <section className="bg-card border-2 border-gold/40 rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold" /> Top candidatos compatibles
          </h2>
          {calculating ? (
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
      )}

      {/* Datos */}
      <Section title="Datos personales" icon={User}>
        <Field label="Nombre" value={p.nombre_completo} />
        <Field label="Email" value={p.email} />
        <Field label="Teléfono" value={p.telefono} />
        <Field label="Edad" value={p.edad} />
        <Field label="Ciudad" value={p.ciudad} />
        <Field label="Género" value={p.genero} />
        <Field label="Estatura" value={p.estatura ? `${p.estatura} cm` : null} />
        <Field label="Peso" value={p.peso ? `${p.peso} kg` : null} />
      </Section>

      <Section title="Estilo de vida" icon={Cigarette}>
        <Field label="Tabaco" value={p.tabaco} />
        <Field label="Alcohol" value={p.alcohol} />
        <Field label="Fin de semana" value={p.fin_de_semana} />
        <Field label="Hobbies" value={p.hobbies} />
      </Section>

      <Section title="Familia y objetivos" icon={Heart}>
        <Field label="Hijos" value={p.hijos} />
        <Field label="¿Desea casarse?" value={p.desea_casarse} />
        <Field label="Tipo de relación" value={p.tipo_relacion} />
        <Field label="Busca género" value={p.busca_genero} />
        <Field label="Rango edad" value={p.edad_min_busca && p.edad_max_busca ? `${p.edad_min_busca} - ${p.edad_max_busca}` : null} />
      </Section>

      <Section title="Valores" icon={Sparkles}>
        <Field label="Religión" value={p.religion} />
        <Field label="Importa religión pareja" value={p.importa_religion ? `Sí (busca ${p.religion_pareja})` : "No"} />
        <Field label="Ideología" value={p.ideologia} />
        <Field label="Política preferida pareja" value={p.importa_politica ? p.politica_pareja : "No le importa"} />
      </Section>

      <Section title="Escalas de personalidad" icon={Briefcase}>
        <Scale label="Deseo de familia" value={p.deseo_familia} />
        <Scale label="Ambición profesional" value={p.ambicion_profesional} />
        <Scale label="Nivel social" value={p.nivel_social} />
        <Scale label="Estilo de vida activo" value={p.estilo_vida_activo} />
        <Scale label="Necesidad independencia" value={p.necesidad_independencia} />
        <Field label="Perfil DISC" value={p.disc_perfil} />
      </Section>

      <Section title="Filtros excluyentes (no aceptaría)" icon={ShieldAlert}>
        <Field label="Hijos" value={p.hijos === "No quiero tener" ? "❌ Personas con hijos / que quieran" : "Sin restricción"} />
        <Field label="Religión" value={p.importa_religion ? `Solo ${p.religion_pareja}` : "Sin restricción"} />
        <Field label="Política" value={p.importa_politica ? `Solo ${p.politica_pareja}` : "Sin restricción"} />
        <Field label="Tatuajes" value={p.tatuajes_pareja && p.tatuajes_pareja !== "Me da igual" ? `Prefiere: ${p.tatuajes_pareja}` : "Sin restricción"} />
      </Section>

      {/* Estado + notas admin */}
      <EstadoYNotas key={p.id} perfil={p} />
    </div>
  );
};

export default PerfilDetalle;
