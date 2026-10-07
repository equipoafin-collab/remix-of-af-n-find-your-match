import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, ListChecks } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";
import { useTareas, type FiltrosTareas } from "@/hooks/admin/useTareas";
import { ListaTareas, NuevaTarea } from "@/components/admin/tareas/ListaTareas";
import { TIPO_TAREA, vencimiento, type Vencimiento } from "@/lib/tareas";
import { valorDeUrl } from "@/lib/dashboard";
import type { TareaTipo } from "@/types/admin";

const selector = "px-3 py-2 rounded-lg border border-border bg-background font-body text-sm";

// T6.2 · Panel global de tareas de todos los clientes.
const Tareas = () => {
  const [estado, setEstado] = useState<FiltrosTareas["estado"]>("pendiente");
  const [params] = useSearchParams();
  const [tipo, setTipo] = useState<TareaTipo | "">(() => valorDeUrl(params, "tipo", Constants.public.Enums.tarea_tipo) ?? "");  // enlaces del Dashboard
  const [venc, setVenc] = useState<Vencimiento | "">("");
  const [creando, setCreando] = useState(false);
  const { data: tareas = [], isLoading, error } = useTareas({ estado, tipo: tipo || undefined });

  const pendientes = tareas.filter((t) => t.estado === "pendiente");
  const vencidas = pendientes.filter((t) => vencimiento(t.vence_at) === "vencida").length;
  const visibles = venc ? tareas.filter((t) => t.estado === "pendiente" && vencimiento(t.vence_at) === venc) : tareas;

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-2"><ListChecks className="w-7 h-7 text-gold" /> Tareas</h1>
          <p className="font-body text-sm text-muted-foreground mt-1">
            {estado === "pendiente" ? `${pendientes.length} pendiente${pendientes.length === 1 ? "" : "s"}` : `${tareas.length} tarea${tareas.length === 1 ? "" : "s"}`}
            {vencidas > 0 && <span className="text-rose-700 font-semibold"> · {vencidas} vencida{vencidas === 1 ? "" : "s"}</span>}
          </p>
        </div>
        {!creando && (
          <button onClick={() => setCreando(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold text-accent-foreground font-body text-sm font-semibold shadow-sm">
            <Plus className="w-4 h-4" /> Nueva tarea
          </button>
        )}
      </div>

      <section className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-5 flex gap-3 flex-wrap">
          <select value={estado ?? ""} onChange={(e) => setEstado((e.target.value || undefined) as FiltrosTareas["estado"])} className={selector}>
            <option value="pendiente">Pendientes</option>
            <option value="completada">Completadas</option>
            <option value="cancelada">Canceladas</option>
            <option value="">Todas</option>
          </select>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TareaTipo | "")} className={selector}>
            <option value="">Todos los tipos</option>
            {Constants.public.Enums.tarea_tipo.map((t) => <option key={t} value={t}>{TIPO_TAREA[t]}</option>)}
          </select>
          <select value={venc} onChange={(e) => setVenc(e.target.value as Vencimiento | "")} className={selector}>
            <option value="">Cualquier vencimiento</option>
            <option value="vencida">Vencidas</option>
            <option value="hoy">Vencen hoy</option>
            <option value="semana">Próximos 7 días</option>
          </select>
        </div>
        {creando && <NuevaTarea cerrar={() => setCreando(false)} />}
        {error ? (
          <p className="px-5 py-4 border-t border-border font-body text-sm text-rose-700">No se pudieron cargar las tareas: {error.message}</p>
        ) : isLoading ? (
          <p className="px-5 py-4 border-t border-border font-body text-sm text-muted-foreground">Cargando tareas…</p>
        ) : (
          <ListaTareas tareas={visibles} mostrarCliente vacio="No hay tareas con estos filtros." />
        )}
      </section>
    </div>
  );
};

export default Tareas;
