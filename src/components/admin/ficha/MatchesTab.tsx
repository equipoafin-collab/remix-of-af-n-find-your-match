import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Heart, MapPin, FileText, CheckCircle2, MessageSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Constants } from "@/integrations/supabase/types";
import FotoPerfil from "@/components/admin/FotoPerfil";
import { PlanBadge } from "@/components/admin/Badges";
import { useActualizarMatch, useMatches, type MatchConPersonas } from "@/hooks/admin/useMatches";
import type { MatchEstado, Perfil } from "@/types/admin";
import { ESTADO_MATCH as ESTADO } from "@/lib/matches";
import PanelInforme from "./PanelInforme";
import PanelFeedback from "./PanelFeedback";

const badge = "px-2 py-0.5 rounded-full text-xs font-body font-medium border";
const campo = "mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm";
const etiqueta = "font-body text-xs text-muted-foreground uppercase tracking-wider";
const onError = (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" });

const fechaCita = (iso: string) =>
  new Date(iso).toLocaleString("es-ES", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
/** ISO → valor de <input type="datetime-local"> en hora local. */
const aLocal = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

const FormCita = ({ match, cerrar, faltaInforme }: { match: MatchConPersonas; cerrar: () => void; faltaInforme: boolean }) => {
  const actualizar = useActualizarMatch();
  const [fecha, setFecha] = useState(match.fecha_cita ? aLocal(match.fecha_cita) : "");
  const [lugar, setLugar] = useState(match.lugar ?? "");

  const guardar = () =>
    actualizar.mutate(
      { id: match.id, cambios: { estado: "cita_agendada", fecha_cita: new Date(fecha).toISOString(), lugar: lugar.trim() || null } },
      { onSuccess: () => { toast({ title: "Cita guardada" }); cerrar(); }, onError },
    );

  return (
    <div className="mt-3 p-4 rounded-xl border border-border bg-background/50 space-y-3">
      {faltaInforme && (
        <p className="font-body text-xs text-amber-700">
          El informe de compatibilidad aún no se ha enviado y hay un cliente Premium. Puedes agendar igualmente.
        </p>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={etiqueta}>Fecha y hora de la cita</label>
          <input aria-label="Fecha y hora de la cita" type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} className={campo} />
        </div>
        <div>
          <label className={etiqueta}>Lugar</label>
          <input aria-label="Lugar" value={lugar} onChange={(e) => setLugar(e.target.value)} maxLength={200} placeholder="Opcional" className={campo} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={cerrar} className="px-3 py-1.5 rounded-lg border border-border font-body text-sm text-muted-foreground hover:text-foreground">
          Cancelar
        </button>
        <button onClick={guardar} disabled={!fecha || actualizar.isPending} className="px-3 py-1.5 rounded-lg bg-foreground text-background font-body text-sm font-semibold disabled:opacity-50">
          Guardar cita
        </button>
      </div>
    </div>
  );
};

const Persona = ({ p, children }: { p: MatchConPersonas["a"]; children?: ReactNode }) => (
  <div className="flex items-center gap-3 min-w-0">
    <FotoPerfil path={p?.foto_url} nombre={p?.nombre_completo ?? "?"} className="w-10 h-10 rounded-full text-xs" />
    <div className="min-w-0">
      <Link to={`/admin/perfiles/${p?.id}?tab=matches`} className="block font-body text-sm font-semibold text-foreground truncate hover:text-gold-texto">
        {p?.nombre_completo}
      </Link>
      <p className="font-body text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
        {p?.edad} años · {p?.zona ?? p?.ciudad} <PlanBadge plan={p?.plan ?? null} />
        {children}
      </p>
    </div>
  </div>
);

/** En la ficha (perfilId) se ve el otro de la pareja; en Matches Aprobados (T9.1), los dos. */
export const FilaMatch = ({ match, perfilId }: { match: MatchConPersonas; perfilId?: string }) => {
  const actualizar = useActualizarMatch();
  const [editandoCita, setEditandoCita] = useState(false);
  const [verInforme, setVerInforme] = useState(false);
  const [verFeedback, setVerFeedback] = useState(false);
  // Feedback en cuanto la cita se ha hecho (o si ya hay alguno guardado).
  const conFeedback = !!match.feedback_at || ["cita_realizada", "feedback_registrado", "continuan", "cerrado"].includes(match.estado);
  // T6.4 · Bloqueo suave: con un lado Premium la tarea "Enviar informe" sigue pendiente hasta marcarlo como enviado.
  const faltaInforme = !match.informe_enviado_at && (match.a?.plan === "premium" || match.b?.plan === "premium");

  const cambiarEstado = (estado: MatchEstado) => {
    // Agendar pide fecha y lugar: el estado se guarda con el formulario.
    if (estado === "cita_agendada") return setEditandoCita(true);
    actualizar.mutate(
      {
        id: match.id,
        cambios: { estado, ...(estado === "informe_enviado" && !match.informe_enviado_at && { informe_enviado_at: new Date().toISOString() }) },
      },
      { onError },
    );
  };

  return (
    <li className="px-5 py-4 border-t border-border">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            {perfilId ? (
              <Persona p={match.perfil_a === perfilId ? match.b : match.a}>
                <span>· {match.perfil_a === perfilId ? "lo propuso este cliente" : "lo propuso el otro cliente"}</span>
              </Persona>
            ) : (
              <>
                <Persona p={match.a} />
                <Heart className="w-4 h-4 text-gold shrink-0" />
                <Persona p={match.b} />
              </>
            )}
          </div>
          {match.fecha_cita && (
            <p className="font-body text-xs text-foreground mt-2 flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5 text-gold" /> {fechaCita(match.fecha_cita)}</span>
              {match.lugar && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-gold" /> {match.lugar}</span>}
              {match.estado === "cita_agendada" && !editandoCita && (
                <button onClick={() => setEditandoCita(true)} className="text-muted-foreground hover:text-foreground underline">Cambiar</button>
              )}
            </p>
          )}
        </div>
        <button
          onClick={() => setVerInforme(!verInforme)}
          className={`inline-flex items-center gap-1 ${badge} py-1 ${match.informe_enviado_at ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-background text-foreground border-border hover:bg-muted"}`}
          title="Informe de compatibilidad"
        >
          {match.informe_enviado_at ? <CheckCircle2 className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
          {match.informe_enviado_at ? "Informe enviado" : match.informe ? "Informe" : "Informe (sin generar)"}
        </button>
        {conFeedback && (
          <button
            onClick={() => setVerFeedback(!verFeedback)}
            className={`inline-flex items-center gap-1 ${badge} py-1 ${match.feedback_at ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-background text-foreground border-border hover:bg-muted"}`}
            title="Feedback tras la cita"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {match.feedback_at
              ? `Feedback ${match.valoracion_a ?? "–"}/5 · ${match.valoracion_b ?? "–"}/5`
              : "Registrar feedback"}
          </button>
        )}
        <select
          value={match.estado}
          disabled={actualizar.isPending}
          onChange={(e) => cambiarEstado(e.target.value as MatchEstado)}
          className={`${badge} py-1 ${ESTADO[match.estado].color}`}
          title="Cambiar estado"
        >
          {Constants.public.Enums.match_estado.map((e) => <option key={e} value={e}>{ESTADO[e].label}</option>)}
        </select>
      </div>
      {editandoCita && <FormCita match={match} faltaInforme={faltaInforme} cerrar={() => setEditandoCita(false)} />}
      {verInforme && <PanelInforme match={match} />}
      {verFeedback && <PanelFeedback match={match} />}
    </li>
  );
};

// T6.1 · Los matches se crean al aceptar una sugerencia (trigger en la BD), con su informe (T6.3) y feedback (T6.5).
const MatchesTab = ({ perfil }: { perfil: Perfil }) => {
  const { data: matches = [], isLoading, error } = useMatches(perfil.id);

  return (
    <section className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-5">
        <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
          <Heart className="w-4 h-4 text-gold" /> Matches
        </h3>
      </div>
      {error ? (
        <p className="px-5 py-4 border-t border-border font-body text-sm text-rose-700">No se pudieron cargar los matches: {error.message}</p>
      ) : isLoading ? (
        <p className="px-5 py-4 border-t border-border font-body text-sm text-muted-foreground">Cargando matches…</p>
      ) : matches.length === 0 ? (
        <p className="px-5 py-4 border-t border-border font-body text-sm text-muted-foreground">
          Aún no hay matches. Se crean al aceptar una sugerencia en Sugerencias IA.
        </p>
      ) : (
        <ul>{matches.map((m) => <FilaMatch key={m.id} match={m} perfilId={perfil.id} />)}</ul>
      )}
    </section>
  );
};

export default MatchesTab;
