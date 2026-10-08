import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Loader2, AlertTriangle, RefreshCw, Check, X } from "lucide-react";
import FotoPerfil from "@/components/admin/FotoPerfil";
import { PlanBadge } from "@/components/admin/Badges";
import type { Perfil } from "@/types/admin";
import { NOMBRES_DIMENSION } from "@/lib/profileMatching";
import { MOTIVOS_RECHAZO as MOTIVOS } from "../../../../supabase/functions/_shared/aprendizaje";
import AprendizajeCliente from "./AprendizajeCliente";
import {
  useCalculoAutomatico,
  useDecidirSugerencia,
  useRecalcularSugerencias,
  useSugerencias,
  type Sugerencia,
} from "@/hooks/admin/useSugerencias";

const FILTROS = [
  { estado: "pendiente", label: "Pendientes", vacio: "No hay candidatos pendientes. El resto de perfiles no pasa los filtros excluyentes (estado, zona, género, edad, hijos, religión o política) o ya está decidido." },
  { estado: "aceptada", label: "Aceptadas", vacio: "Aún no has aceptado ninguna sugerencia." },
  { estado: "rechazada", label: "Rechazadas", vacio: "Aún no has rechazado ninguna sugerencia." },
] as const;

// Chips de la sección 3.2; se guardan en motivo_decision ("Distancia, Edad — texto") y el aprendizaje los lee (T5.3).
const MOTIVOS_RECHAZO = Object.keys(MOTIVOS);

const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "");

const colorScore = (score: number) =>
  score >= 80 ? "text-emerald-600 border-emerald-200 bg-emerald-50" : score >= 60 ? "text-amber-700 border-amber-200 bg-amber-50" : "text-rose-700 border-rose-200 bg-rose-50";

export const TarjetaSugerencia = ({ s, perfilId }: { s: Sugerencia; perfilId: string }) => {
  const decidir = useDecidirSugerencia();
  const [rechazando, setRechazando] = useState(false);
  const [motivos, setMotivos] = useState<string[]>([]);
  const [texto, setTexto] = useState("");
  const c = s.candidato;
  const desglose = (s.desglose ?? {}) as Record<string, number>;

  const alternarMotivo = (m: string) => setMotivos((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  const rechazar = () =>
    decidir.mutate({ id: s.id, perfilId, estado: "rechazada", motivo: [motivos.join(", "), texto.trim()].filter(Boolean).join(" — ") || null });

  return (
    <div className="bg-background border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <FotoPerfil path={c?.foto_url} nombre={c?.nombre_completo ?? "?"} className="w-12 h-12 rounded-full text-sm" />
        <div className="flex-1 min-w-0">
          <Link to={`/admin/perfiles/${s.candidato_id}`} className="block font-body text-sm font-semibold text-foreground truncate hover:text-gold-texto">
            {c?.nombre_completo}
          </Link>
          <p className="font-body text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
            {c?.edad} años · {c?.zona ?? c?.ciudad} <PlanBadge plan={c?.plan ?? null} />
          </p>
        </div>
        <div className="text-right">
          <span className={`px-2.5 py-1 rounded-full text-sm font-display font-bold border ${colorScore(s.score)}`}>{s.score}%</span>
          <p className="font-body text-[10px] text-muted-foreground mt-1" title="Puntuación de la IA y del algoritmo por reglas">
            {s.score_ia === null ? "Solo reglas" : `IA ${s.score_ia} · reglas ${s.score_reglas}`}
          </p>
        </div>
      </div>

      {(s.motivos.length > 0 || s.riesgos.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {s.motivos.map((m) => (
            <span key={m} className="px-2 py-0.5 rounded-full text-[11px] font-body bg-emerald-50 text-emerald-700 border border-emerald-200">✓ {m}</span>
          ))}
          {s.riesgos.map((r) => (
            <span key={r} className="px-2 py-0.5 rounded-full text-[11px] font-body bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5" /> {r}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
        {Object.entries(NOMBRES_DIMENSION).map(([clave, etiqueta]) => (
          <div key={clave}>
            <div className="flex justify-between font-body text-[10px] text-muted-foreground">
              <span>{etiqueta}</span>
              <span className="tabular-nums">{desglose[clave] ?? 0}</span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gold" style={{ width: `${desglose[clave] ?? 0}%` }} />
            </div>
          </div>
        ))}
      </div>

      {s.estado !== "pendiente" ? (
        <p className="font-body text-xs text-muted-foreground">
          {s.estado === "aceptada" ? "Aceptada" : "Rechazada"} el {fecha(s.decidido_at)}
          {s.motivo_decision && ` · ${s.motivo_decision}`}
        </p>
      ) : rechazando ? (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="font-body text-xs font-medium text-foreground">¿Por qué no encaja? (opcional)</p>
          <div className="flex flex-wrap gap-1.5">
            {MOTIVOS_RECHAZO.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => alternarMotivo(m)}
                className={`px-2.5 py-1 rounded-full text-xs font-body border transition-colors ${motivos.includes(m) ? "bg-rose-600 text-white border-rose-600" : "bg-card text-foreground border-border hover:border-rose-300"}`}
              >
                {m}
              </button>
            ))}
          </div>
          <input
            aria-label="Otro motivo de rechazo"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={300}
            placeholder="Otro motivo…"
            className="w-full px-3 py-2 rounded-lg border border-border bg-card font-body text-sm"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setRechazando(false)} className="px-3 py-1.5 rounded-lg border border-border font-body text-sm text-muted-foreground hover:text-foreground">
              Cancelar
            </button>
            <button onClick={rechazar} disabled={decidir.isPending} className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-body text-sm font-semibold disabled:opacity-50">
              Confirmar rechazo
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => decidir.mutate({ id: s.id, perfilId, estado: "aceptada", motivo: null })}
            disabled={decidir.isPending}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white font-body text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
          >
            <Check className="w-4 h-4" /> Aceptar
          </button>
          <button
            onClick={() => setRechazando(true)}
            disabled={decidir.isPending}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 text-rose-700 font-body text-sm font-semibold hover:bg-rose-50 disabled:opacity-50"
          >
            <X className="w-4 h-4" /> Rechazar
          </button>
        </div>
      )}
    </div>
  );
};

// Las guardadas salen al instante; la ficha lanza el recálculo en segundo plano al abrirse (useCalculoAutomatico).
const SugerenciasTab = ({ perfil }: { perfil: Perfil }) => {
  const { data: sugerencias = [], isLoading } = useSugerencias(perfil.id);
  const calculo = useCalculoAutomatico(perfil.id);
  const recalcular = useRecalcularSugerencias();
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["estado"]>("pendiente");
  const calculando = calculo.isFetching || recalcular.isPending;
  const visibles = sugerencias.filter((s) => s.estado === filtro);

  return (
    <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-gold" /> Candidatos sugeridos
        </h2>
        <div className="flex items-center gap-3">
          {calculando && (
            <span className="font-body text-xs text-muted-foreground inline-flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Actualizando…
            </span>
          )}
          <button
            onClick={() => recalcular.mutate(perfil.id)}
            disabled={calculando}
            className="bg-gold text-accent-foreground hover:bg-gold/90 transition-colors px-4 py-2 rounded-xl font-body text-sm font-semibold inline-flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" /> Recalcular
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTROS.map((f) => (
          <button
            key={f.estado}
            onClick={() => setFiltro(f.estado)}
            className={`px-3 py-1.5 rounded-full font-body text-xs font-medium border transition-colors ${filtro === f.estado ? "bg-foreground text-background border-foreground" : "bg-background text-muted-foreground border-border hover:text-foreground"}`}
          >
            {f.label} ({sugerencias.filter((s) => s.estado === f.estado).length})
          </button>
        ))}
      </div>

      <AprendizajeCliente perfilId={perfil.id} />

      {perfil.estado_cliente !== "activo" && (
        <p className="font-body text-xs text-muted-foreground">El cliente no está activo: conserva sus sugerencias, pero no recibe nuevas.</p>
      )}
      {calculo.error && (
        <p className="font-body text-xs text-rose-700">No se pudieron actualizar las sugerencias ({calculo.error.message}). Se muestran las guardadas.</p>
      )}

      {isLoading ? (
        <p className="font-body text-sm text-muted-foreground">Cargando sugerencias…</p>
      ) : visibles.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground">
          {filtro === "pendiente" && calculando ? "Calculando sugerencias…" : FILTROS.find((f) => f.estado === filtro)?.vacio}
        </p>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {visibles.map((s) => (
            <TarjetaSugerencia key={s.id} s={s} perfilId={perfil.id} />
          ))}
        </div>
      )}
    </section>
  );
};

export default SugerenciasTab;
