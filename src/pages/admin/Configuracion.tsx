import { useState, type FormEvent, type ReactNode } from "react";
import { Settings, Play, Loader2, CheckCircle2, XCircle, UserPlus, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useEjecutarAutomatizaciones, useEstadoAutomatizaciones } from "@/hooks/admin/useAutomatizaciones";
import { useConfiguracion, useGuardarConfiguracion } from "@/hooks/admin/useConfiguracion";
import { useAdministradoras, useInvitarAdministradora, useQuitarAdministradora, type Administradora } from "@/hooks/admin/useAdministradoras";
import { CAMPOS_ENTEROS, validarConfiguracion, type Configuracion as Config } from "@/lib/configuracion";
import { NOMBRES_DIMENSION, type Dimension } from "@/lib/profileMatching";
import type { PlanTipo } from "@/types/admin";

const NOMBRE: Record<string, { label: string; que: string }> = {
  "evaluar-automatizaciones": { label: "Alertas y tareas automáticas", que: "Informes y feedback pendientes, pocas sesiones, plan terminado, seguimiento y resúmenes sin revisar." },
  "procesar-cola-matching": { label: "Perfiles nuevos muy compatibles", que: "Compara los perfiles nuevos o reactivados con los clientes con plan." },
};
const CADA: Record<string, string> = { "0 * * * *": "Cada hora", "*/15 * * * *": "Cada 15 minutos" };

const fecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Todavía no";

const campo = "mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm";
const tarjeta = "bg-card border border-border rounded-2xl overflow-hidden";
const cabecera = "p-5 border-b border-border";
const onError = (titulo: string) => (e: Error) => toast({ title: titulo, description: e.message, variant: "destructive" });

/** Un campo vacío es NaN: la validación lo marca como no válido en vez de guardarlo como 0. */
const aNumero = (texto: string) => (texto === "" ? NaN : Number(texto));
const enPorcentaje = (v: number) => (Number.isNaN(v) ? "" : Math.round(v * 100));
const mismoValor = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const Campo = ({ label, ayuda, children }: { label: string; ayuda?: string; children: ReactNode }) => (
  <label className="block">
    <span className="font-body text-sm font-medium text-foreground">{label}</span>
    {children}
    {ayuda && <span className="block font-body text-xs text-muted-foreground mt-1">{ayuda}</span>}
  </label>
);

const Numero = ({ value, onChange, min, max, sufijo }: { value: number | string; onChange: (n: number) => void; min: number; max: number; sufijo?: string }) => (
  <span className="flex items-center gap-2">
    <input
      type="number"
      min={min}
      max={max}
      value={typeof value === "number" && Number.isNaN(value) ? "" : value}
      onChange={(e) => onChange(aNumero(e.target.value))}
      className={campo}
    />
    {sufijo && <span className="mt-1 font-body text-sm text-muted-foreground">{sufijo}</span>}
  </span>
);

// T9.2 · Valores de la tabla configuracion. Solo se guardan las claves cambiadas; se vuelve a montar al guardarse (key).
const FormConfiguracion = ({ guardada }: { guardada: Config }) => {
  const guardar = useGuardarConfiguracion();
  const [c, setC] = useState(guardada);
  const poner = <K extends keyof Config>(clave: K, valor: Config[K]) => setC((prev) => ({ ...prev, [clave]: valor }));
  const errores = validarConfiguracion(c);
  const cambios = Object.fromEntries(Object.entries(c).filter(([k, v]) => !mismoValor(v, guardada[k as keyof Config]))) as Partial<Config>;
  const hayCambios = Object.keys(cambios).length > 0;
  const sumaPesos = Math.round(Object.values(c.pesos_algoritmo).reduce((a, b) => a + b, 0) * 100);

  const enteros = (grupo: "avisos" | "matching") =>
    CAMPOS_ENTEROS.filter((f) => f.grupo === grupo).map((f) => (
      <Campo key={f.clave} label={f.label} ayuda={f.ayuda}>
        <Numero value={c[f.clave]} min={f.min} max={f.max} onChange={(n) => poner(f.clave, n)} />
      </Campo>
    ));

  const enviar = () =>
    guardar.mutate(cambios, {
      onSuccess: () => toast({ title: "Configuración guardada", description: "Las automatizaciones y el matching la usan desde su próxima ejecución." }),
      onError: onError("No se pudo guardar la configuración"),
    });

  return (
    <section className={tarjeta}>
      <div className={cabecera}>
        <h2 className="font-display text-lg font-semibold text-foreground">Parámetros</h2>
        <p className="font-body text-sm text-muted-foreground">Umbrales de los avisos, sesiones por plan y ajustes del matching.</p>
      </div>

      <div className="p-5 grid md:grid-cols-3 gap-x-6 gap-y-5">
        <div className="space-y-4">
          <h3 className="font-body text-xs text-muted-foreground uppercase tracking-wider">Planes</h3>
          {(["esencial", "premium"] as PlanTipo[]).map((plan) => (
            <Campo key={plan} label={`Sesiones al mes · ${plan === "esencial" ? "Esencial" : "Premium"}`}>
              <Numero value={c.sesiones_por_plan[plan]} min={0} max={8} onChange={(n) => poner("sesiones_por_plan", { ...c.sesiones_por_plan, [plan]: n })} />
            </Campo>
          ))}
          <p className="font-body text-xs text-muted-foreground">Para sugerir las sesiones contratadas al editar el plan de un cliente.</p>
          <h3 className="font-body text-xs text-muted-foreground uppercase tracking-wider pt-2">Avisos</h3>
          {enteros("avisos")}
        </div>

        <div className="space-y-4">
          <h3 className="font-body text-xs text-muted-foreground uppercase tracking-wider">Sugerencias</h3>
          {enteros("matching")}
          <Campo label="Peso de la IA en el score" ayuda={`El resto (${Number.isNaN(c.peso_ia) ? "–" : 100 - Math.round(c.peso_ia * 100)} %) es del algoritmo por reglas.`}>
            <Numero value={enPorcentaje(c.peso_ia)} min={0} max={100} sufijo="%" onChange={(n) => poner("peso_ia", n / 100)} />
          </Campo>
        </div>

        <div className="space-y-4">
          <h3 className="font-body text-xs text-muted-foreground uppercase tracking-wider">Pesos del algoritmo por reglas</h3>
          {(Object.keys(NOMBRES_DIMENSION) as Dimension[]).map((d) => (
            <Campo key={d} label={NOMBRES_DIMENSION[d]}>
              <Numero
                value={enPorcentaje(c.pesos_algoritmo[d])}
                min={0}
                max={100}
                sufijo="%"
                onChange={(n) => poner("pesos_algoritmo", { ...c.pesos_algoritmo, [d]: n / 100 })}
              />
            </Campo>
          ))}
          <p className={`font-body text-xs ${sumaPesos === 100 ? "text-muted-foreground" : "text-rose-700 font-semibold"}`}>
            Suman {Number.isNaN(sumaPesos) ? "–" : sumaPesos} % (deben sumar 100 %). El aprendizaje de cada cliente los ajusta encima.
          </p>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-4 flex-wrap">
        <ul className="font-body text-xs text-rose-700 space-y-0.5">
          {errores.map((e) => <li key={e}>{e}</li>)}
        </ul>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => setC(guardada)}
            disabled={!hayCambios || guardar.isPending}
            className="px-4 py-2 rounded-xl border border-border font-body text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            Descartar
          </button>
          <button
            onClick={enviar}
            disabled={!hayCambios || errores.length > 0 || guardar.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold text-accent-foreground font-body text-sm font-semibold shadow-sm disabled:opacity-50"
          >
            {guardar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar cambios
          </button>
        </div>
      </div>
    </section>
  );
};

// T9.2 · Quién entra en el CRM. Invitar envía un email para elegir contraseña; quitar el acceso no borra la cuenta.
const Administradoras = () => {
  // isPending y no isLoading: con la pestaña en segundo plano los reintentos se pausan y no habría ni datos ni aviso.
  const { data: administradoras = [], isPending, error } = useAdministradoras();
  const invitar = useInvitarAdministradora();
  const quitar = useQuitarAdministradora();
  const [email, setEmail] = useState("");

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const destino = email.trim();
    invitar.mutate(destino, {
      onSuccess: ({ invitada }) => {
        toast(invitada
          ? { title: "Invitación enviada", description: `${destino} recibirá un email para elegir su contraseña.` }
          : { title: "Acceso recuperado", description: `${destino} ya tenía cuenta: entra con su contraseña de siempre.` });
        setEmail("");
      },
      onError: onError("No se pudo invitar"),
    });
  };

  const quitarAcceso = (a: Administradora) => {
    if (!confirm(`¿Quitar el acceso al CRM a ${a.email}?`)) return;
    quitar.mutate(a.user_id, { onSuccess: () => toast({ title: "Acceso quitado" }), onError: onError("No se pudo quitar el acceso") });
  };

  return (
    <section className={tarjeta}>
      <div className={cabecera}>
        <h2 className="font-display text-lg font-semibold text-foreground">Administradoras</h2>
        <p className="font-body text-sm text-muted-foreground">Personas con acceso al CRM.</p>
      </div>
      {error ? (
        <p className="px-5 py-4 font-body text-sm text-rose-700">No se pudieron cargar: {error.message}</p>
      ) : isPending ? (
        <p className="px-5 py-4 font-body text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <ul>
          {administradoras.map((a) => (
            <li key={a.user_id} className="px-5 py-3 border-t border-border first:border-t-0 flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[220px]">
                <p className="font-body text-sm font-semibold text-foreground">{a.email ?? "(sin email)"}{a.yo && <span className="font-normal text-muted-foreground"> · tú</span>}</p>
                <p className="font-body text-xs text-muted-foreground">
                  {a.ultimo_acceso ? `Último acceso: ${fecha(a.ultimo_acceso)}` : a.invitada_at ? `Invitada el ${fecha(a.invitada_at)}, aún no ha entrado` : "Aún no ha entrado"}
                </p>
              </div>
              {!a.yo && (
                <button
                  onClick={() => quitarAcceso(a)}
                  disabled={quitar.isPending}
                  className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 font-body text-sm hover:bg-rose-50 disabled:opacity-50"
                >
                  Quitar acceso
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={enviar} className="px-5 py-4 border-t border-border flex gap-2 flex-wrap">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@ejemplo.com"
          aria-label="Email de la nueva administradora"
          className="flex-1 min-w-[220px] px-3 py-2 rounded-lg border border-border bg-background font-body text-sm"
        />
        <button
          type="submit"
          disabled={invitar.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background font-body text-sm font-semibold disabled:opacity-50"
        >
          {invitar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Invitar
        </button>
      </form>
    </section>
  );
};

// T7.3 (automatizaciones) y T9.2 (parámetros y administradoras).
const Configuracion = () => {
  const { data: jobs = [], isLoading, error } = useEstadoAutomatizaciones();
  const config = useConfiguracion();
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

      {config.error ? (
        <p className="font-body text-sm text-rose-700">No se pudo leer la configuración: {config.error.message}</p>
      ) : config.data ? (
        <FormConfiguracion key={JSON.stringify(config.data)} guardada={config.data} />
      ) : (
        <p className="font-body text-sm text-muted-foreground">Cargando configuración…</p>
      )}

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

      <Administradoras />
    </div>
  );
};

export default Configuracion;
