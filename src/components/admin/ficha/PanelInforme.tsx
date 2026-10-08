import { useState } from "react";
import { Sparkles, Loader2, Save, Download, Send, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useActualizarMatch, useGenerarInforme, type MatchConPersonas } from "@/hooks/admin/useMatches";
import { exportarInformePdf } from "@/lib/informePdf";
import { NIVELES, validarInforme, type InformeCompatibilidad } from "../../../../supabase/functions/_shared/informe";

const LISTAS = [
  { clave: "fortalezas", label: "Fortalezas" },
  { clave: "fricciones", label: "Posibles fricciones" },
  { clave: "preguntas_sugeridas", label: "Preguntas para la primera cita" },
] as const;

const campo = "mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm resize-y";
const etiqueta = "font-body text-xs text-muted-foreground uppercase tracking-wider";
const boton = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-sm font-semibold disabled:opacity-50";
const onError = (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" });

// Cada lista se edita como texto, una línea por punto (igual que el resumen de sesión).
type Borrador = Record<keyof InformeCompatibilidad, string>;
const aBorrador = (i: InformeCompatibilidad): Borrador => ({
  ...i,
  score: String(i.score),
  fortalezas: i.fortalezas.join("\n"),
  fricciones: i.fricciones.join("\n"),
  preguntas_sugeridas: i.preguntas_sugeridas.join("\n"),
});
const aInforme = (b: Borrador) =>
  validarInforme({ ...b, ...Object.fromEntries(LISTAS.map(({ clave }) => [clave, b[clave].split("\n")])) });

const EditorInforme = ({ match, inicial, nombres }: { match: MatchConPersonas; inicial: InformeCompatibilidad; nombres: [string, string] }) => {
  const [b, setB] = useState(() => aBorrador(inicial));
  const actualizar = useActualizarMatch();
  const generar = useGenerarInforme();
  const set = (clave: keyof Borrador) => (e: { target: { value: string } }) => setB({ ...b, [clave]: e.target.value });

  const limpio = () => {
    const informe = aInforme(b);
    if (!informe) toast({ title: "Informe incompleto", description: "Hacen falta la puntuación, el resumen y al menos las listas.", variant: "destructive" });
    return informe;
  };
  const guardar = () => {
    const informe = limpio();
    if (informe) actualizar.mutate({ id: match.id, cambios: { informe } }, { onSuccess: () => toast({ title: "Informe guardado" }), onError });
  };
  // Enviado = lo que se ve ahora: guarda los cambios y avanza el match si seguía en "propuesto".
  const marcarEnviado = () => {
    const informe = limpio();
    if (!informe) return;
    actualizar.mutate(
      {
        id: match.id,
        cambios: { informe, informe_enviado_at: new Date().toISOString(), ...(match.estado === "propuesto" && { estado: "informe_enviado" as const }) },
      },
      { onSuccess: () => toast({ title: "Informe marcado como enviado" }), onError },
    );
  };
  const regenerar = () => {
    if (window.confirm("Se sustituirá el informe actual, con tus cambios, por uno nuevo. ¿Seguir?")) generar.mutate(match.id);
  };

  return (
    <div className="space-y-3">
      <p className="font-body text-xs text-amber-700">Lo leerán los clientes: revisa que no aparezca nada de las sesiones ni de tus notas antes de enviarlo.</p>
      <div className="grid sm:grid-cols-4 gap-3">
        <div>
          <label className={etiqueta}>Compatibilidad (%)</label>
          <input aria-label="Compatibilidad (%)" type="number" min={0} max={100} value={b.score} onChange={set("score")} className={campo} />
        </div>
        <div>
          <label className={etiqueta}>Nivel</label>
          <select aria-label="Nivel" value={b.nivel} onChange={set("nivel")} className={campo}>
            {NIVELES.map((n) => <option key={n}>{n}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={etiqueta}>Resumen</label>
          <textarea aria-label="Resumen" value={b.resumen} onChange={set("resumen")} rows={2} className={campo} />
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        {LISTAS.map(({ clave, label }) => (
          <div key={clave}>
            <label className={etiqueta}>{label}</label>
            <textarea aria-label={label} value={b[clave]} onChange={set(clave)} rows={Math.max(3, b[clave].split("\n").length)} placeholder="Una línea por punto" className={campo} />
          </div>
        ))}
      </div>
      <div>
        <label className={etiqueta}>Análisis</label>
        <textarea aria-label="Análisis" value={b.analisis_detallado} onChange={set("analisis_detallado")} rows={4} className={campo} />
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={guardar} disabled={actualizar.isPending} className={`${boton} bg-foreground text-background`}>
          <Save className="w-4 h-4" /> Guardar cambios
        </button>
        <button
          onClick={() => { const i = limpio(); if (i) exportarInformePdf(i, nombres[0], nombres[1]); }}
          className={`${boton} border border-border text-foreground hover:bg-muted`}
        >
          <Download className="w-4 h-4" /> Exportar PDF
        </button>
        {match.informe_enviado_at ? (
          <span className="inline-flex items-center gap-1 font-body text-sm text-emerald-700">
            <CheckCircle2 className="w-4 h-4" /> Enviado el {new Date(match.informe_enviado_at).toLocaleDateString("es-ES")}
          </span>
        ) : (
          <button onClick={marcarEnviado} disabled={actualizar.isPending} className={`${boton} bg-gold text-accent-foreground`}>
            <Send className="w-4 h-4" /> Marcar como enviado
          </button>
        )}
        <button onClick={regenerar} disabled={generar.isPending} className={`${boton} ml-auto text-muted-foreground hover:text-foreground`}>
          {generar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Regenerar
        </button>
      </div>
    </div>
  );
};

/** T6.3 · Informe de compatibilidad del match (sustituye a la página /compatibilidad). */
const PanelInforme = ({ match }: { match: MatchConPersonas }) => {
  const generar = useGenerarInforme();
  const informe = validarInforme(match.informe);
  const nombres: [string, string] = [match.a?.nombre_completo ?? "A", match.b?.nombre_completo ?? "B"];

  return (
    <div className="mt-3 p-4 rounded-xl border border-border bg-background/50">
      {informe ? (
        // key: al regenerar, el editor arranca con el informe nuevo.
        <EditorInforme key={JSON.stringify(informe)} match={match} inicial={informe} nombres={nombres} />
      ) : (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="font-body text-sm text-muted-foreground">Aún no hay informe de compatibilidad para esta pareja.</p>
          <button
            onClick={() => generar.mutate(match.id)}
            disabled={generar.isPending}
            className={`${boton} bg-foreground text-background`}
          >
            {generar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generar.isPending ? "Generando…" : "Generar informe con IA"}
          </button>
        </div>
      )}
    </div>
  );
};

export default PanelInforme;
