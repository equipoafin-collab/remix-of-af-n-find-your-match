import { useState, type FormEvent } from "react";
import { Loader2, Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useDejarFeedback } from "@/hooks/cliente/useMiArea";
import { puedeDejarFeedback, type MiMatch } from "@/lib/areaCliente";
import { botonDorado } from "./estilos";

const opcion = (activa: boolean) =>
  `px-4 py-2 rounded-full border font-body text-sm transition-colors ${activa ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:bg-muted"}`;

const Formulario = ({ match, cerrar }: { match: MiMatch; cerrar?: () => void }) => {
  const dejar = useDejarFeedback();
  const previo = match.mi_feedback;
  const [valoracion, setValoracion] = useState(previo.valoracion ?? 0);
  const [repetir, setRepetir] = useState<boolean | null>(previo.quiere_repetir);
  const [comentario, setComentario] = useState(previo.comentario ?? "");
  const [error, setError] = useState("");

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!valoracion || repetir === null || comentario.trim().length < 3) {
      return setError("Valora la cita, dinos si quieres volver a verle y cuéntanos en unas palabras qué tal fue.");
    }
    dejar.mutate(
      { matchId: match.id, valoracion, quiereRepetir: repetir, comentario: comentario.trim() },
      {
        onSuccess: () => { toast({ title: "Gracias", description: "Tu psicóloga ya lo tiene." }); cerrar?.(); },
        onError: (e) => setError(e.message),
      },
    );
  };

  return (
    <form onSubmit={enviar} className="space-y-3" noValidate>
      <fieldset>
        <legend className="font-body text-xs text-muted-foreground mb-1">Tu valoración</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => { setValoracion(n); setError(""); }}
              aria-label={`${n} de 5`}
              aria-pressed={valoracion === n}
              className="p-1"
            >
              <Star className={`w-7 h-7 ${n <= valoracion ? "fill-gold text-gold-vivid" : "text-cream-dark"}`} />
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="font-body text-xs text-muted-foreground mb-1">¿Te gustaría volver a verle?</legend>
        <div className="flex gap-2">
          <button type="button" aria-pressed={repetir === true} onClick={() => { setRepetir(true); setError(""); }} className={opcion(repetir === true)}>Sí</button>
          <button type="button" aria-pressed={repetir === false} onClick={() => { setRepetir(false); setError(""); }} className={opcion(repetir === false)}>No</button>
        </div>
      </fieldset>
      <label className="block">
        <span className="block font-body text-xs text-muted-foreground mb-1">Cuéntale a tu psicóloga qué tal fue</span>
        <textarea
          rows={3}
          maxLength={1000}
          value={comentario}
          onChange={(e) => { setComentario(e.target.value); setError(""); }}
          className="w-full px-4 py-3 rounded-2xl border border-border bg-background font-body text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gold/50"
        />
      </label>
      {error && <p role="alert" className="font-body text-sm text-rose-700">{error}</p>}
      <button type="submit" disabled={dejar.isPending} className={`${botonDorado} w-full`}>
        {dejar.isPending && <Loader2 className="w-4 h-4 animate-spin" />} {previo.comentario ? "Guardar cambios" : "Enviar a tu psicóloga"}
      </button>
      <p className="font-body text-xs text-muted-foreground text-center">Solo lo verá tu psicóloga, nunca {match.otra.nombre}.</p>
    </form>
  );
};

/** T18.3 · Su feedback tras la cita: lo deja o lo cambia mientras se pueda; después, solo lo ve. */
const FeedbackCita = ({ match }: { match: MiMatch }) => {
  const [editando, setEditando] = useState(false);
  const f = match.mi_feedback;
  const puede = puedeDejarFeedback(match);
  if (!puede && !f.comentario) return null;

  return (
    <section className="rounded-xl border border-border px-4 py-3 space-y-3">
      <p className="font-display text-lg font-bold text-foreground">¿Qué tal con <em className="italic font-normal">{match.otra.nombre}</em>?</p>
      {f.comentario && !editando ? (
        <div className="space-y-1">
          <p className="font-body text-sm text-foreground">
            {f.valoracion}/5 · {f.quiere_repetir ? "Quieres volver a verle" : "No quieres volver a verle"}
          </p>
          <p className="font-body text-sm text-muted-foreground italic">"{f.comentario}"</p>
          {puede && <button onClick={() => setEditando(true)} className="font-body text-sm text-gold-texto font-semibold hover:underline">Cambiar</button>}
        </div>
      ) : (
        <Formulario match={match} cerrar={() => setEditando(false)} />
      )}
    </section>
  );
};

export default FeedbackCita;
