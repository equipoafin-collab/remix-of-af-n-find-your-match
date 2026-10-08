import { useState } from "react";
import { Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useGuardarFeedback, type Feedback, type MatchConPersonas } from "@/hooks/admin/useMatches";

const campo = "mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm";
const etiqueta = "font-body text-xs text-muted-foreground uppercase tracking-wider";

// "" = sin respuesta (null en la BD).
const aRepetir = (v: string) => (v === "" ? null : v === "si");
const deRepetir = (v: boolean | null) => (v === null ? "" : v ? "si" : "no");

const Lado = ({ nombre, texto, valoracion, repetir, onTexto, onValoracion, onRepetir }: {
  nombre: string; texto: string; valoracion: string; repetir: string;
  onTexto: (v: string) => void; onValoracion: (v: string) => void; onRepetir: (v: string) => void;
}) => (
  <div className="space-y-2">
    <p className="font-body text-sm font-semibold text-foreground">{nombre}</p>
    <div>
      <label className={etiqueta}>Qué le ha parecido</label>
      <textarea aria-label="Qué le ha parecido" value={texto} onChange={(e) => onTexto(e.target.value)} rows={3} maxLength={2000} className={`${campo} resize-y`} />
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className={etiqueta}>Valoración</label>
        <select aria-label="Valoración" value={valoracion} onChange={(e) => onValoracion(e.target.value)} className={campo}>
          <option value="">—</option>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} / 5</option>)}
        </select>
      </div>
      <div>
        <label className={etiqueta}>¿Volver a verse?</label>
        <select aria-label="¿Volver a verse?" value={repetir} onChange={(e) => onRepetir(e.target.value)} className={campo}>
          <option value="">Sin respuesta</option>
          <option value="si">Sí</option>
          <option value="no">No</option>
        </select>
      </div>
    </div>
  </div>
);

/** T6.5 · Feedback de los dos tras la cita; visible igual desde la ficha de cada uno. */
const PanelFeedback = ({ match }: { match: MatchConPersonas }) => {
  const guardar = useGuardarFeedback();
  const [f, setF] = useState({
    a: match.feedback_a ?? "", b: match.feedback_b ?? "",
    va: match.valoracion_a?.toString() ?? "", vb: match.valoracion_b?.toString() ?? "",
    ra: deRepetir(match.quiere_repetir_a), rb: deRepetir(match.quiere_repetir_b),
  });
  const set = (clave: keyof typeof f) => (v: string) => setF({ ...f, [clave]: v });

  const enviar = () => {
    const feedback: Feedback = {
      feedback_a: f.a.trim() || null, feedback_b: f.b.trim() || null,
      valoracion_a: f.va ? Number(f.va) : null, valoracion_b: f.vb ? Number(f.vb) : null,
      quiere_repetir_a: aRepetir(f.ra), quiere_repetir_b: aRepetir(f.rb),
    };
    guardar.mutate({ match, feedback }, { onSuccess: () => toast({ title: "Feedback guardado" }) });
  };

  return (
    <div className="mt-3 p-4 rounded-xl border border-border bg-background/50 space-y-3">
      <div className="grid md:grid-cols-2 gap-4">
        <Lado nombre={match.a?.nombre_completo ?? "A"} texto={f.a} valoracion={f.va} repetir={f.ra} onTexto={set("a")} onValoracion={set("va")} onRepetir={set("ra")} />
        <Lado nombre={match.b?.nombre_completo ?? "B"} texto={f.b} valoracion={f.vb} repetir={f.rb} onTexto={set("b")} onValoracion={set("vb")} onRepetir={set("rb")} />
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={enviar}
          disabled={guardar.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background font-body text-sm font-semibold disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> Guardar feedback
        </button>
        <span className="font-body text-xs text-muted-foreground">
          {match.feedback_at ? `Registrado el ${new Date(match.feedback_at).toLocaleDateString("es-ES")}. ` : ""}
          Con el de los dos, el match pasa a "Feedback registrado".
        </span>
      </div>
    </div>
  );
};

export default PanelFeedback;
