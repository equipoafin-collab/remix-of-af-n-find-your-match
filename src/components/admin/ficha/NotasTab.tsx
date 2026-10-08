import { useState } from "react";
import { Plus, Loader2, Pencil, Trash2, Bot } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useActualizarNota, useBorrarNota, useCrearNota, useNotas } from "@/hooks/admin/useNotas";
import { useSesiones } from "@/hooks/admin/useSesiones";
import type { Nota, Perfil, Sesion } from "@/types/admin";

const onError = (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" });

const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const nombreSesion = (s: Sesion) =>
  `Sesión del ${new Date(s.fecha_hora).toLocaleDateString("es-ES")}${s.tipo === "primera" ? " (primera)" : ""}`;

const campo = "w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm";

// Solo aparece si el cliente tiene sesiones.
const SelectorSesion = ({ sesiones, value, onChange }: { sesiones: Sesion[]; value: string | null; onChange: (id: string | null) => void }) =>
  sesiones.length === 0 ? null : (
    <select aria-label="Sesión vinculada" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} className={`${campo} sm:w-64`}>
      <option value="">Sin vincular a una sesión</option>
      {sesiones.map((s) => <option key={s.id} value={s.id}>{nombreSesion(s)}</option>)}
    </select>
  );

const NotaItem = ({ nota, sesiones }: { nota: Nota; sesiones: Sesion[] }) => {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(nota.contenido);
  const [sesionId, setSesionId] = useState(nota.sesion_id);
  const actualizar = useActualizarNota();
  const borrar = useBorrarNota();
  const sesion = sesiones.find((s) => s.id === nota.sesion_id);

  const empezarEdicion = () => {
    setTexto(nota.contenido);
    setSesionId(nota.sesion_id);
    setEditando(true);
  };

  const guardar = () => {
    if (!texto.trim()) return;
    actualizar.mutate(
      { id: nota.id, cambios: { contenido: texto.trim(), sesion_id: sesionId } },
      { onSuccess: () => setEditando(false), onError },
    );
  };

  const eliminar = () => {
    if (!confirm("¿Borrar esta nota? No se puede deshacer.")) return;
    borrar.mutate(nota.id, { onError });
  };

  return (
    <li className="px-5 py-4 border-t border-border">
      <div className="flex items-center justify-between gap-3">
        <p className="font-body text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
          {fecha(nota.created_at)}
          {nota.automatica && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-muted border-border">
              <Bot className="w-3 h-3" /> Automática
            </span>
          )}
          {sesion && <span className="px-2 py-0.5 rounded-full border bg-gold/10 border-gold/30 text-foreground">{nombreSesion(sesion)}</span>}
        </p>
        {!editando && (
          <div className="flex items-center gap-2">
            <button onClick={empezarEdicion} className="text-muted-foreground hover:text-foreground" title="Editar"><Pencil className="w-4 h-4" /></button>
            <button onClick={eliminar} disabled={borrar.isPending} className="text-rose-600 hover:text-rose-700 disabled:opacity-50" title="Borrar"><Trash2 className="w-4 h-4" /></button>
          </div>
        )}
      </div>
      {editando ? (
        <div className="mt-2 space-y-2">
          <textarea aria-label="Texto de la nota" value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} className={`${campo} resize-y`} />
          <SelectorSesion sesiones={sesiones} value={sesionId} onChange={setSesionId} />
          <div className="flex gap-2">
            <button onClick={guardar} disabled={actualizar.isPending || !texto.trim()} className="px-3 py-1.5 rounded-lg bg-foreground text-background font-body text-sm font-semibold disabled:opacity-50">
              Guardar
            </button>
            <button onClick={() => setEditando(false)} className="px-3 py-1.5 rounded-lg border border-border font-body text-sm text-muted-foreground hover:text-foreground">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-1.5 font-body text-sm text-foreground whitespace-pre-wrap">{nota.contenido}</p>
      )}
    </li>
  );
};

const NotasTab = ({ perfil }: { perfil: Perfil }) => {
  const { data: notas = [], isLoading, error } = useNotas(perfil.id);
  const { data: sesiones = [] } = useSesiones(perfil.id);
  const crear = useCrearNota();
  const [texto, setTexto] = useState("");
  const [sesionId, setSesionId] = useState<string | null>(null);

  const anadir = () => {
    if (!texto.trim()) return;
    crear.mutate(
      { perfil_id: perfil.id, contenido: texto.trim(), sesion_id: sesionId },
      {
        onSuccess: () => {
          setTexto("");
          setSesionId(null);
        },
        onError,
      },
    );
  };

  return (
    <section className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-display text-sm font-semibold text-foreground">Notas privadas (solo admin)</h3>
          <p className="font-body text-xs text-muted-foreground">
            Último seguimiento: {perfil.ultimo_seguimiento_at ? fecha(perfil.ultimo_seguimiento_at) : "—"}
          </p>
        </div>
        <textarea
          aria-label="Nueva nota"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={3}
          placeholder="Nueva nota: impresiones, acuerdos, cosas a tener en cuenta…"
          className={`${campo} resize-y`}
        />
        <div className="flex items-center gap-2 flex-wrap">
          <SelectorSesion sesiones={sesiones} value={sesionId} onChange={setSesionId} />
          <button
            onClick={anadir}
            disabled={crear.isPending || !texto.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background font-body text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {crear.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Añadir nota
          </button>
        </div>
      </div>

      {error ? (
        <p className="px-5 py-4 border-t border-border font-body text-sm text-rose-700">No se pudieron cargar las notas: {error.message}</p>
      ) : isLoading ? (
        <p className="px-5 py-4 border-t border-border font-body text-sm text-muted-foreground">Cargando notas…</p>
      ) : notas.length === 0 ? (
        <p className="px-5 py-4 border-t border-border font-body text-sm text-muted-foreground">Aún no hay notas.</p>
      ) : (
        <ul>{notas.map((n) => <NotaItem key={n.id} nota={n} sesiones={sesiones} />)}</ul>
      )}
    </section>
  );
};

export default NotasTab;
