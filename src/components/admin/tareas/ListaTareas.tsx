import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, RotateCcw, X, Bot, CalendarClock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import BuscadorPerfil from "@/components/admin/BuscadorPerfil";
import { useActualizarTarea, useCrearTarea, type TareaConPerfil } from "@/hooks/admin/useTareas";
import { TIPO_TAREA, vencimiento } from "@/lib/tareas";
import type { Perfil } from "@/types/admin";

const badge = "px-2 py-0.5 rounded-full text-[11px] font-body font-medium border";
const campo = "mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm";
const etiqueta = "font-body text-xs text-muted-foreground uppercase tracking-wider";
const onError = (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" });

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });

const Vence = ({ tarea }: { tarea: TareaConPerfil }) => {
  if (!tarea.vence_at) return null;
  const v = tarea.estado === "pendiente" ? vencimiento(tarea.vence_at) : "despues";
  const color = v === "vencida" ? "text-rose-700 font-semibold" : v === "hoy" ? "text-amber-700 font-medium" : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 ${color}`}>
      <CalendarClock className="w-3 h-3" />
      {v === "vencida" ? "Vencida · " : v === "hoy" ? "Hoy · " : "Vence "}
      {fecha(tarea.vence_at)}
    </span>
  );
};

const FilaTarea = ({ tarea, mostrarCliente }: { tarea: TareaConPerfil; mostrarCliente: boolean }) => {
  const actualizar = useActualizarTarea();
  const pendiente = tarea.estado === "pendiente";
  const vencida = pendiente && vencimiento(tarea.vence_at) === "vencida";
  const cambiar = (estado: TareaConPerfil["estado"]) => actualizar.mutate({ id: tarea.id, cambios: { estado } }, { onError });

  return (
    <li className={`px-5 py-3 border-t border-border flex items-start gap-3 ${vencida ? "bg-rose-50/60" : ""}`}>
      <button
        onClick={() => cambiar(pendiente ? "completada" : "pendiente")}
        disabled={actualizar.isPending || tarea.estado === "cancelada"}
        title={pendiente ? "Marcar como completada" : "Reabrir"}
        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 disabled:opacity-40 ${
          tarea.estado === "completada" ? "bg-emerald-600 border-emerald-600 text-white" : "border-border hover:border-emerald-500"
        }`}
      >
        {tarea.estado === "completada" && <Check className="w-3.5 h-3.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`font-body text-sm ${pendiente ? "text-foreground" : "text-muted-foreground line-through"}`}>{tarea.titulo}</p>
        {tarea.descripcion && <p className="font-body text-xs text-muted-foreground mt-0.5">{tarea.descripcion}</p>}
        <p className="font-body text-xs mt-1 flex items-center gap-2 flex-wrap">
          <span className={`${badge} bg-muted text-muted-foreground border-border`}>{TIPO_TAREA[tarea.tipo]}</span>
          {tarea.origen === "auto" && (
            <span className={`${badge} bg-gold/10 text-foreground border-gold/30 inline-flex items-center gap-1`}><Bot className="w-3 h-3" /> Automática</span>
          )}
          <Vence tarea={tarea} />
          {mostrarCliente && tarea.perfil && (
            <Link to={`/admin/perfiles/${tarea.perfil.id}?tab=tareas`} className="text-gold hover:underline">{tarea.perfil.nombre_completo}</Link>
          )}
          {tarea.estado === "cancelada" && <span className="text-muted-foreground">Cancelada</span>}
          {tarea.estado === "completada" && tarea.completada_at && <span className="text-muted-foreground">Completada el {fecha(tarea.completada_at)}</span>}
        </p>
      </div>
      {pendiente ? (
        <button onClick={() => cambiar("cancelada")} disabled={actualizar.isPending} title="Cancelar tarea" className="text-muted-foreground hover:text-rose-600 disabled:opacity-40">
          <X className="w-4 h-4" />
        </button>
      ) : tarea.estado === "cancelada" && (
        <button onClick={() => cambiar("pendiente")} disabled={actualizar.isPending} title="Reabrir" className="text-muted-foreground hover:text-foreground disabled:opacity-40">
          <RotateCcw className="w-4 h-4" />
        </button>
      )}
    </li>
  );
};

/** Las pendientes se quedan en la lista hasta completarlas o cancelarlas; las vencidas, en rojo. */
export const ListaTareas = ({ tareas, mostrarCliente = false, vacio }: { tareas: TareaConPerfil[]; mostrarCliente?: boolean; vacio: string }) =>
  tareas.length === 0 ? (
    <p className="px-5 py-4 border-t border-border font-body text-sm text-muted-foreground">{vacio}</p>
  ) : (
    <ul>{tareas.map((t) => <FilaTarea key={t.id} tarea={t} mostrarCliente={mostrarCliente} />)}</ul>
  );

/** Tarea manual. En la ficha el cliente viene dado; en el panel global se busca. */
export const NuevaTarea = ({ perfilId, cerrar }: { perfilId?: string; cerrar: () => void }) => {
  const crear = useCrearTarea();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [vence, setVence] = useState("");
  const destino = perfilId ?? perfil?.id;

  const guardar = () =>
    crear.mutate(
      {
        perfil_id: destino as string,
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        // Un día concreto vence al final de ese día, en hora local.
        vence_at: vence ? new Date(`${vence}T23:59`).toISOString() : null,
      },
      { onSuccess: () => { toast({ title: "Tarea creada" }); cerrar(); }, onError },
    );

  return (
    <div className="p-5 border-t border-border space-y-3 bg-background/50">
      {!perfilId && (
        <div>
          <label className={etiqueta}>Cliente</label>
          {perfil ? (
            <p className="mt-1 font-body text-sm text-foreground flex items-center gap-2">
              {perfil.nombre_completo}
              <button onClick={() => setPerfil(null)} className="text-xs text-muted-foreground underline">Cambiar</button>
            </p>
          ) : (
            <div className="mt-1"><BuscadorPerfil onSelect={setPerfil} /></div>
          )}
        </div>
      )}
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className={etiqueta}>Tarea</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} placeholder="Qué hay que hacer" className={campo} />
        </div>
        <div>
          <label className={etiqueta}>Vence (opcional)</label>
          <input type="date" value={vence} onChange={(e) => setVence(e.target.value)} className={campo} />
        </div>
      </div>
      <div>
        <label className={etiqueta}>Detalle (opcional)</label>
        <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2} maxLength={1000} className={campo} />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={cerrar} className="px-3 py-1.5 rounded-lg border border-border font-body text-sm text-muted-foreground hover:text-foreground">
          Cancelar
        </button>
        <button
          onClick={guardar}
          disabled={!destino || !titulo.trim() || crear.isPending}
          className="px-3 py-1.5 rounded-lg bg-foreground text-background font-body text-sm font-semibold disabled:opacity-50"
        >
          Crear tarea
        </button>
      </div>
    </div>
  );
};
