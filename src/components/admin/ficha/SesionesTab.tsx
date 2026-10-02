import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Loader2, Video } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Constants } from "@/integrations/supabase/types";
import { useActualizarSesion, useCrearSesion, useSesiones } from "@/hooks/admin/useSesiones";
import type { Perfil, Sesion } from "@/types/admin";

type Estado = Sesion["estado"];

const ESTADO: Record<Estado, { label: string; color: string }> = {
  programada: { label: "Programada", color: "bg-blue-50 text-blue-700 border-blue-200" },
  realizada: { label: "Realizada", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelada: { label: "Cancelada", color: "bg-slate-50 text-slate-600 border-slate-200" },
  no_asistio: { label: "No asistió", color: "bg-rose-50 text-rose-700 border-rose-200" },
};

const RESUMEN: Record<Sesion["resumen_estado"], { label: string; color: string }> = {
  sin_generar: { label: "Sin resumen", color: "bg-muted text-muted-foreground border-border" },
  borrador: { label: "Resumen en borrador", color: "bg-amber-50 text-amber-700 border-amber-200" },
  revisado: { label: "Resumen revisado", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

const badge = "px-2 py-0.5 rounded-full text-xs font-body font-medium border";
const campo = "mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm";
const etiqueta = "font-body text-xs text-muted-foreground uppercase tracking-wider";
const onError = (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" });

const NuevaSesion = ({ perfil, hayPrimera, cerrar }: { perfil: Perfil; hayPrimera: boolean; cerrar: () => void }) => {
  const crear = useCrearSesion();
  const [fecha, setFecha] = useState("");
  const [duracion, setDuracion] = useState("60");
  const [tipo, setTipo] = useState<Sesion["tipo"]>(hayPrimera ? "seguimiento" : "primera");
  const [estado, setEstado] = useState<Estado>("programada");

  const guardar = () =>
    crear.mutate(
      { perfil_id: perfil.id, fecha_hora: new Date(fecha).toISOString(), duracion_min: Number(duracion), tipo, estado },
      {
        onSuccess: () => {
          toast({ title: estado === "programada" ? "Sesión programada" : "Sesión registrada" });
          cerrar();
        },
        onError,
      },
    );

  return (
    <div className="p-5 border-t border-border space-y-3 bg-background/50">
      <div className="grid sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2">
          <label className={etiqueta}>Fecha y hora</label>
          <input
            type="datetime-local"
            value={fecha}
            onChange={(e) => {
              setFecha(e.target.value);
              // Una fecha pasada suele ser una sesión que ya se hizo; se puede cambiar.
              if (e.target.value) setEstado(new Date(e.target.value) < new Date() ? "realizada" : "programada");
            }}
            className={campo}
          />
        </div>
        <div>
          <label className={etiqueta}>Duración (min)</label>
          <input type="number" min="1" step="5" value={duracion} onChange={(e) => setDuracion(e.target.value)} className={campo} />
        </div>
        <div>
          <label className={etiqueta}>Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as Sesion["tipo"])} className={campo}>
            <option value="primera" disabled={hayPrimera}>Primera sesión</option>
            <option value="seguimiento">Seguimiento</option>
          </select>
        </div>
      </div>
      <div className="flex items-end gap-3 flex-wrap">
        <div className="w-48">
          <label className={etiqueta}>Estado</label>
          <select value={estado} onChange={(e) => setEstado(e.target.value as Estado)} className={campo}>
            {Constants.public.Enums.sesion_estado.map((e) => <option key={e} value={e}>{ESTADO[e].label}</option>)}
          </select>
        </div>
        <button
          onClick={guardar}
          disabled={crear.isPending || !fecha || !(Number(duracion) > 0)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background font-body text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {crear.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Guardar sesión
        </button>
        <button onClick={cerrar} className="px-4 py-2 rounded-xl border border-border font-body text-sm text-muted-foreground hover:text-foreground">
          Cancelar
        </button>
      </div>
    </div>
  );
};

const FilaSesion = ({ sesion, perfil }: { sesion: Sesion; perfil: Perfil }) => {
  const actualizar = useActualizarSesion();
  const estado = actualizar.isPending && actualizar.variables?.cambios.estado ? actualizar.variables.cambios.estado : sesion.estado;

  return (
    <li className="px-5 py-3 border-t border-border flex items-center gap-3 flex-wrap">
      <div className="flex-1 min-w-[220px]">
        <p className="font-body text-sm font-medium text-foreground">
          {new Date(sesion.fecha_hora).toLocaleString("es-ES", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
        <p className="font-body text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
          {sesion.duracion_min} min
          {sesion.tipo === "primera" && <span className={`${badge} bg-gold/15 text-foreground border-gold/40`}>Primera sesión</span>}
          {sesion.tipo === "primera" && perfil.video_presentacion_path && (
            <Link to="?tab=resumen" className="inline-flex items-center gap-1 text-gold hover:underline">
              <Video className="w-3 h-3" /> Vídeo
            </Link>
          )}
        </p>
      </div>
      {estado === "realizada" && <span className={`${badge} ${RESUMEN[sesion.resumen_estado].color}`}>{RESUMEN[sesion.resumen_estado].label}</span>}
      <select
        value={estado}
        disabled={actualizar.isPending}
        onChange={(e) => actualizar.mutate({ id: sesion.id, cambios: { estado: e.target.value as Estado } }, { onError })}
        className={`${badge} py-1 ${ESTADO[estado].color}`}
        title="Cambiar estado"
      >
        {Constants.public.Enums.sesion_estado.map((e) => <option key={e} value={e}>{ESTADO[e].label}</option>)}
      </select>
    </li>
  );
};

const SesionesTab = ({ perfil }: { perfil: Perfil }) => {
  const { data: sesiones = [], isLoading, error } = useSesiones(perfil.id);
  const [creando, setCreando] = useState(false);
  const hayPrimera = sesiones.some((s) => s.tipo === "primera" && s.estado !== "cancelada");

  return (
    <section className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-5 flex items-center justify-between gap-3">
        <h3 className="font-display text-sm font-semibold text-foreground">Sesiones</h3>
        {!creando && (
          <button onClick={() => setCreando(true)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gold text-accent-foreground text-xs font-body font-semibold">
            <Plus className="w-3.5 h-3.5" /> Nueva sesión
          </button>
        )}
      </div>
      {creando && <NuevaSesion perfil={perfil} hayPrimera={hayPrimera} cerrar={() => setCreando(false)} />}
      {error ? (
        <p className="px-5 py-4 border-t border-border font-body text-sm text-rose-700">No se pudieron cargar las sesiones: {error.message}</p>
      ) : isLoading ? (
        <p className="px-5 py-4 border-t border-border font-body text-sm text-muted-foreground">Cargando sesiones…</p>
      ) : sesiones.length === 0 ? (
        <p className="px-5 py-4 border-t border-border font-body text-sm text-muted-foreground">Aún no hay sesiones. Programa la primera con "Nueva sesión".</p>
      ) : (
        <ul>{sesiones.map((s) => <FilaSesion key={s.id} sesion={s} perfil={perfil} />)}</ul>
      )}
    </section>
  );
};

export default SesionesTab;
