import { useOutletContext } from "react-router-dom";
import { CalendarPlus, Check, ChevronDown, Loader2, MapPin } from "lucide-react";
import FotoPerfil from "@/components/admin/FotoPerfil";
import FeedbackCita from "@/components/cliente/FeedbackCita";
import { rotuloClaro } from "@/components/cliente/estilos";
import { useMisMatches } from "@/hooks/cliente/useMiArea";
import { cuandoCita, ESTADO_MATCH_CLIENTE, type ContextoArea, type MiMatch } from "@/lib/areaCliente";
import { descargarIcs } from "@/lib/ics";

const tarjeta = "bg-card border border-border rounded-2xl";
// Los niveles del informe van en masculino ("Muy Alto"); aquí acompañan a "compatibilidad".
const NIVEL: Record<string, string> = { Bajo: "baja", Medio: "media", Alto: "alta", "Muy Alto": "muy alta" };

/** 01 Presentado · 02 Cita · 03 Después, con números grandes y claros como "Cómo funciona" en la portada. */
const Pasos = ({ match }: { match: MiMatch }) => {
  const { texto, paso } = ESTADO_MATCH_CLIENTE[match.estado];
  const pasos = ["Presentado", paso === 2 ? texto : "Cita", paso === 3 ? texto : "Después"];
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label={`Estado: ${texto}`}>
      {pasos.map((nombre, i) => (
        <li key={i}>
          <p className={`font-display text-2xl font-bold leading-none ${i + 1 === paso ? "text-foreground" : "text-cream-dark"}`}>0{i + 1}</p>
          <p className={`font-body text-[11px] mt-1 ${i + 1 <= paso ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
            {nombre} {i + 1 < paso && <Check className="inline w-3 h-3 text-gold-texto" />}
          </p>
        </li>
      ))}
    </ol>
  );
};

const Informe = ({ informe }: { informe: NonNullable<MiMatch["informe"]> }) => {
  const lista = (titulo: string, items: string[]) =>
    items.length > 0 && (
      <div>
        <p className="font-body text-xs text-muted-foreground">{titulo}</p>
        <ul className="mt-1 space-y-1">{items.map((x) => <li key={x} className="font-body text-sm text-foreground">· {x}</li>)}</ul>
      </div>
    );
  return (
    <details className="rounded-xl border border-border group">
      <summary className="flex items-center justify-between gap-2 px-4 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span className="font-body text-sm font-semibold text-foreground">Vuestro informe de compatibilidad</span>
        <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="px-4 pb-4 space-y-3">
        {NIVEL[informe.nivel] && <p className="font-display italic text-lg text-gold-texto">Compatibilidad {NIVEL[informe.nivel]}</p>}
        <p className="font-body text-sm text-foreground">{informe.resumen}</p>
        {lista("Lo que os une", informe.fortalezas ?? [])}
        {lista("A tener en cuenta", informe.fricciones ?? [])}
        {lista("Preguntas para vuestra primera cita", informe.preguntas_sugeridas ?? [])}
        {informe.analisis_detallado && <p className="font-body text-sm text-muted-foreground">{informe.analisis_detallado}</p>}
      </div>
    </details>
  );
};

const TarjetaMatch = ({ match }: { match: MiMatch }) => {
  const { otra } = match;
  const citaProxima = match.estado === "cita_agendada" && match.fecha_cita && new Date(match.fecha_cita) > new Date();
  return (
    <article className={`${tarjeta} p-5 space-y-4`}>
      <header className="flex items-center gap-4">
        <FotoPerfil path={otra.foto_url} nombre={otra.nombre} className="w-14 h-14 rounded-full text-lg shrink-0" />
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground leading-tight">
            Te presentamos a <em className="italic font-normal">{otra.nombre}</em>
          </h2>
          <p className="font-body text-sm text-muted-foreground">{[`${otra.edad} años`, otra.zona].filter(Boolean).join(" · ")}</p>
        </div>
      </header>

      <Pasos match={match} />

      {match.motivos.length > 0 && (
        <div className="rounded-xl bg-muted/50 px-4 py-3 space-y-1">
          <p className="font-display italic text-gold-texto">Por qué os hemos presentado</p>
          {match.motivos.map((m) => (
            <p key={m} className="font-body text-sm text-foreground flex gap-2">
              <Check className="w-4 h-4 text-gold-texto shrink-0 mt-0.5" aria-hidden="true" /> {m}
            </p>
          ))}
        </div>
      )}

      {otra.aficiones && (
        <div>
          <p className="font-body text-xs text-muted-foreground">Sus aficiones</p>
          <p className="font-body text-sm text-foreground whitespace-pre-line line-clamp-4">{otra.aficiones}</p>
        </div>
      )}

      {match.fecha_cita && (
        <div className="flex items-center gap-3 rounded-xl border border-gold/60 px-4 py-3">
          <MapPin className="w-5 h-5 text-gold-texto shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="font-body text-sm font-semibold text-foreground first-letter:uppercase">{cuandoCita(match.fecha_cita)}</p>
            {match.lugar && <p className="font-body text-sm text-muted-foreground">{match.lugar}</p>}
          </div>
          {citaProxima && (
            <button
              onClick={() =>
                descargarIcs({
                  uid: match.id,
                  inicio: new Date(match.fecha_cita as string),
                  duracionMin: 90,
                  titulo: `Cita con ${otra.nombre}`,
                  descripcion: match.lugar ? `En ${match.lugar}.` : undefined,
                })
              }
              className="shrink-0 w-9 h-9 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted"
              aria-label={`Añadir a mi calendario la cita con ${otra.nombre}`}
              title="Añadir a mi calendario"
            >
              <CalendarPlus className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      <FeedbackCita match={match} />
      {match.informe && <Informe informe={match.informe} />}
    </article>
  );
};

/** T18.2 · Sus matches presentados por la psicóloga, el más reciente primero. */
const MatchesCliente = () => {
  const { userId } = useOutletContext<ContextoArea>();
  const matches = useMisMatches(userId);

  if (matches.isPending) return <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto mt-10" aria-label="Cargando" />;
  if (matches.isError) return <p className="font-body text-sm text-rose-700 text-center mt-10">No hemos podido cargar tus matches. Vuelve a intentarlo en un momento.</p>;

  return (
    <div className="space-y-4">
      <header>
        <p className={rotuloClaro}>Matches</p>
        <h1 className="font-display text-3xl font-bold text-foreground leading-tight">Tus <em className="italic font-normal">matches</em></h1>
      </header>
      {matches.data.length ? (
        matches.data.map((m) => <TarjetaMatch key={m.id} match={m} />)
      ) : (
        <p className={`${tarjeta} p-5 font-body text-sm text-muted-foreground`}>
          Aún no te hemos presentado a nadie. Tu psicóloga te avisará cuando tenga a alguien para ti.
        </p>
      )}
    </div>
  );
};

export default MatchesCliente;
