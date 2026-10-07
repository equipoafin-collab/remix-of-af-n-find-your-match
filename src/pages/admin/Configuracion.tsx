import { Settings, Play, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useEjecutarAutomatizaciones, useEstadoAutomatizaciones } from "@/hooks/admin/useAutomatizaciones";

const NOMBRE: Record<string, { label: string; que: string }> = {
  "evaluar-automatizaciones": { label: "Alertas y tareas automáticas", que: "Informes y feedback pendientes, pocas sesiones, plan terminado, seguimiento y resúmenes sin revisar." },
  "procesar-cola-matching": { label: "Perfiles nuevos muy compatibles", que: "Compara los perfiles nuevos o reactivados con los clientes con plan." },
};
const CADA: Record<string, string> = { "0 * * * *": "Cada hora", "*/15 * * * *": "Cada 15 minutos" };

const fecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Todavía no";

// T7.3 · De momento solo las automatizaciones; umbrales, pesos y administradoras llegan con T9.2.
const Configuracion = () => {
  const { data: jobs = [], isLoading, error } = useEstadoAutomatizaciones();
  const ejecutar = useEjecutarAutomatizaciones();

  const ejecutarAhora = () =>
    ejecutar.mutate(undefined, {
      onSuccess: ({ automatizaciones: a, cola }) =>
        toast({
          title: "Automatizaciones ejecutadas",
          description:
            `${a.alertas_creadas} alertas nuevas y ${a.alertas_resueltas} resueltas · ${a.tareas_creadas} tareas nuevas y ${a.tareas_completadas} completadas · ` +
            `${cola.procesados} perfiles de la cola (${cola.detecciones.length} muy compatibles)`,
        }),
      onError: (e) => toast({ title: "No se pudieron ejecutar", description: e.message, variant: "destructive" }),
    });

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-2"><Settings className="w-7 h-7 text-gold" /> Configuración</h1>

      <section className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-5 flex items-center justify-between gap-4 flex-wrap border-b border-border">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Automatizaciones</h2>
            <p className="font-body text-sm text-muted-foreground">Se ejecutan solas; "Ejecutar ahora" no espera a la próxima vuelta.</p>
          </div>
          <button
            onClick={ejecutarAhora}
            disabled={ejecutar.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold text-accent-foreground font-body text-sm font-semibold shadow-sm disabled:opacity-50"
          >
            {ejecutar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Ejecutar ahora
          </button>
        </div>
        {error ? (
          <p className="px-5 py-4 font-body text-sm text-rose-700">No se pudo leer el estado: {error.message}</p>
        ) : isLoading ? (
          <p className="px-5 py-4 font-body text-sm text-muted-foreground">Cargando…</p>
        ) : jobs.length === 0 ? (
          <p className="px-5 py-4 font-body text-sm text-muted-foreground">No hay automatizaciones programadas.</p>
        ) : (
          <ul>
            {jobs.map((j) => {
              const ok = j.resultado === "succeeded" && !/^HTTP [45]/.test(j.detalle ?? "");
              return (
                <li key={j.tarea} className="px-5 py-4 border-t border-border first:border-t-0 flex items-start gap-4 flex-wrap">
                  <div className="flex-1 min-w-[240px]">
                    <p className="font-body text-sm font-semibold text-foreground">{NOMBRE[j.tarea]?.label ?? j.tarea}</p>
                    <p className="font-body text-xs text-muted-foreground mt-0.5">{NOMBRE[j.tarea]?.que}</p>
                  </div>
                  <div className="w-40 font-body text-sm text-foreground">
                    {CADA[j.programacion] ?? j.programacion}
                    {!j.activa && <span className="block text-xs text-rose-700">Desactivada</span>}
                  </div>
                  <div className="w-64 font-body text-sm">
                    <p className="text-foreground inline-flex items-center gap-1.5">
                      {j.ultima_ejecucion && (ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />)}
                      {fecha(j.ultima_ejecucion)}
                    </p>
                    {j.detalle && <p className="text-xs text-muted-foreground mt-0.5 break-words">{j.detalle}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};

export default Configuracion;
