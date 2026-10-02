import { useState } from "react";
import { Sparkles, Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useActualizarSesion } from "@/hooks/admin/useSesiones";
import { useGenerarResumen, useGuardarResumen, type ResumenSesion } from "@/hooks/admin/useResumenSesion";
import { validarResumen } from "../../../../supabase/functions/_shared/resumen";
import type { Sesion } from "@/types/admin";

const LISTAS: { clave: Exclude<keyof ResumenSesion, "estado_emocional">; label: string }[] = [
  { clave: "temas_tratados", label: "Temas tratados" },
  { clave: "avances", label: "Avances" },
  { clave: "objetivos", label: "Objetivos" },
  { clave: "proximos_pasos", label: "Próximos pasos" },
  { clave: "preferencias_detectadas", label: "Preferencias detectadas (para el matching)" },
];

const campo = "mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm resize-y";
const etiqueta = "font-body text-xs text-muted-foreground uppercase tracking-wider";

// Cada lista se edita como texto, una línea por elemento.
type Borrador = Record<keyof ResumenSesion, string>;
const aBorrador = (r: ResumenSesion): Borrador => ({
  estado_emocional: r.estado_emocional,
  ...Object.fromEntries(LISTAS.map(({ clave }) => [clave, (r[clave] ?? []).join("\n")])),
} as Borrador);
const aResumen = (b: Borrador) =>
  validarResumen({ estado_emocional: b.estado_emocional, ...Object.fromEntries(LISTAS.map(({ clave }) => [clave, b[clave].split("\n")])) });

/** Campos del resumen; se monta con key por versión del resumen para arrancar con lo guardado. */
const EditorResumen = ({ sesion, resumen, notas }: { sesion: Sesion; resumen: ResumenSesion; notas: string }) => {
  const [borrador, setBorrador] = useState(() => aBorrador(resumen));
  const guardar = useGuardarResumen();

  const guardarRevisado = () => {
    const limpio = aResumen(borrador);
    if (!limpio) return toast({ title: "Falta el estado emocional", variant: "destructive" });
    guardar.mutate(
      { sesionId: sesion.id, perfilId: sesion.perfil_id, resumen: limpio, notas },
      { onSuccess: () => toast({ title: "Resumen guardado como revisado" }) },
    );
  };

  return (
    <div className="space-y-3">
      <div>
        <label className={etiqueta}>Estado emocional</label>
        <textarea
          value={borrador.estado_emocional}
          onChange={(e) => setBorrador({ ...borrador, estado_emocional: e.target.value })}
          rows={2}
          className={campo}
        />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {LISTAS.map(({ clave, label }) => (
          <div key={clave}>
            <label className={etiqueta}>{label}</label>
            <textarea
              value={borrador[clave]}
              onChange={(e) => setBorrador({ ...borrador, [clave]: e.target.value })}
              rows={Math.max(2, borrador[clave].split("\n").length)}
              placeholder="Una línea por punto"
              className={campo}
            />
          </div>
        ))}
      </div>
      <button
        onClick={guardarRevisado}
        disabled={guardar.isPending}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background font-body text-sm font-semibold hover:opacity-90 disabled:opacity-50"
      >
        {guardar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        {sesion.resumen_estado === "revisado" ? "Guardar cambios" : "Guardar como revisado"}
      </button>
    </div>
  );
};

/** Notas de la sesión + resumen con IA (T3.3). La psicóloga pega sus notas, genera, revisa y guarda. */
const PanelResumen = ({ sesion }: { sesion: Sesion }) => {
  const [notas, setNotas] = useState(sesion.notas_brutas ?? "");
  const actualizar = useActualizarSesion();
  const generar = useGenerarResumen();
  const resumen = sesion.resumen_ia ? validarResumen(sesion.resumen_ia) : null;
  const ocupado = actualizar.isPending || generar.isPending;

  const generarResumen = async () => {
    if (sesion.resumen_estado === "revisado" && !confirm("Se sustituirá el resumen revisado por un borrador nuevo. ¿Seguir?")) return;
    // La función lee las notas guardadas en la sesión: se guardan antes si han cambiado.
    if (notas !== (sesion.notas_brutas ?? "")) {
      try {
        await actualizar.mutateAsync({ id: sesion.id, cambios: { notas_brutas: notas } });
      } catch (error) {
        return toast({ title: "No se pudieron guardar las notas", description: (error as Error).message, variant: "destructive" });
      }
    }
    generar.mutate(sesion.id);
  };

  return (
    <div className="mt-3 p-4 rounded-xl border border-border bg-background/60 space-y-4">
      <div>
        <label className={etiqueta}>Notas de la sesión</label>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={5}
          placeholder="Pega aquí tus notas o la transcripción de la sesión…"
          className={campo}
        />
        <button
          onClick={generarResumen}
          disabled={ocupado || !notas.trim()}
          className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold text-accent-foreground font-body text-sm font-semibold hover:bg-gold/90 disabled:opacity-50"
        >
          {generar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : resumen ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          {generar.isPending ? "Generando resumen…" : resumen ? "Regenerar con IA" : "Generar resumen con IA"}
        </button>
      </div>

      {resumen && (
        <EditorResumen key={JSON.stringify(sesion.resumen_ia)} sesion={sesion} resumen={resumen} notas={notas} />
      )}
    </div>
  );
};

export default PanelResumen;
