import { useState } from "react";
import { Plus } from "lucide-react";
import { useTareas, type FiltrosTareas } from "@/hooks/admin/useTareas";
import { ListaTareas, NuevaTarea } from "@/components/admin/tareas/ListaTareas";
import type { Perfil } from "@/types/admin";

const FILTROS: { estado: FiltrosTareas["estado"]; label: string }[] = [
  { estado: "pendiente", label: "Pendientes" },
  { estado: "completada", label: "Completadas" },
  { estado: "cancelada", label: "Canceladas" },
  { estado: undefined, label: "Todas" },
];

// T6.2 · Tareas del cliente. Las automáticas (informe, feedback… T6.4/T7.2) aparecen aquí igual que las manuales.
const TareasTab = ({ perfil }: { perfil: Perfil }) => {
  const [estado, setEstado] = useState<FiltrosTareas["estado"]>("pendiente");
  const [creando, setCreando] = useState(false);
  const { data: tareas = [], isLoading, error } = useTareas({ perfilId: perfil.id, estado });

  return (
    <section className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {FILTROS.map((f) => (
            <button
              key={f.label}
              onClick={() => setEstado(f.estado)}
              className={`px-3 py-1.5 rounded-full font-body text-xs font-medium border transition-colors ${estado === f.estado ? "bg-foreground text-background border-foreground" : "bg-background text-muted-foreground border-border hover:text-foreground"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {!creando && (
          <button onClick={() => setCreando(true)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gold text-accent-foreground text-xs font-body font-semibold">
            <Plus className="w-3.5 h-3.5" /> Nueva tarea
          </button>
        )}
      </div>
      {creando && <NuevaTarea perfilId={perfil.id} cerrar={() => setCreando(false)} />}
      {error ? (
        <p className="px-5 py-4 border-t border-border font-body text-sm text-rose-700">No se pudieron cargar las tareas: {error.message}</p>
      ) : isLoading ? (
        <p className="px-5 py-4 border-t border-border font-body text-sm text-muted-foreground">Cargando tareas…</p>
      ) : (
        <ListaTareas tareas={tareas} vacio={estado === "pendiente" ? "No hay tareas pendientes." : "No hay tareas en este filtro."} />
      )}
    </section>
  );
};

export default TareasTab;
