import { useState } from "react";
import { Brain, Loader2, Pencil } from "lucide-react";
import { NOMBRES_DIMENSION, type Dimension } from "@/lib/profileMatching";
import {
  useActualizandoAprendizaje,
  useAprendizaje,
  useGuardarPreferencias,
  type Preferencias,
} from "@/hooks/admin/useAprendizaje";

const campo = "w-full px-3 py-2 rounded-lg border border-border bg-card font-body text-sm";
const lineas = (texto: string) => texto.split("\n").map((l) => l.trim()).filter(Boolean);

const Lista = ({ titulo, puntos }: { titulo: string; puntos: string[] }) => (
  <div>
    <p className="font-body text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{titulo}</p>
    {puntos.length ? (
      <ul className="font-body text-sm text-foreground space-y-0.5">{puntos.map((p) => <li key={p}>· {p}</li>)}</ul>
    ) : (
      <p className="font-body text-sm text-muted-foreground/60">—</p>
    )}
  </div>
);

const Editor = ({ inicial, onGuardar, onCancelar, guardando }: {
  inicial: Preferencias; onGuardar: (p: Preferencias) => void; onCancelar: () => void; guardando: boolean;
}) => {
  const [valora, setValora] = useState(inicial.valora.join("\n"));
  const [evita, setEvita] = useState(inicial.evita.join("\n"));
  const [notas, setNotas] = useState(inicial.notas);
  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="font-body text-xs text-muted-foreground space-y-1">
          <span>Valora (una por línea)</span>
          <textarea value={valora} onChange={(e) => setValora(e.target.value)} rows={4} className={campo} />
        </label>
        <label className="font-body text-xs text-muted-foreground space-y-1">
          <span>Evita (una por línea)</span>
          <textarea value={evita} onChange={(e) => setEvita(e.target.value)} rows={4} className={campo} />
        </label>
      </div>
      <label className="block font-body text-xs text-muted-foreground space-y-1">
        <span>Notas</span>
        <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} maxLength={600} className={campo} />
      </label>
      <div className="flex justify-end gap-2">
        <button onClick={onCancelar} className="px-3 py-1.5 rounded-lg border border-border font-body text-sm text-muted-foreground hover:text-foreground">
          Cancelar
        </button>
        <button
          onClick={() => onGuardar({ valora: lineas(valora), evita: lineas(evita), notas: notas.trim() })}
          disabled={guardando}
          className="px-3 py-1.5 rounded-lg bg-foreground text-background font-body text-sm font-semibold disabled:opacity-50"
        >
          Guardar
        </button>
      </div>
    </div>
  );
};

/**
 * T5.3 · Lo aprendido de las decisiones, sesiones y notas. Las preferencias las corrige la psicóloga (la IA parte
 * de ellas la próxima vez); los ajustes de pesos se recalculan solos a partir de las decisiones.
 */
const AprendizajeCliente = ({ perfilId }: { perfilId: string }) => {
  const { data: aprendizaje } = useAprendizaje(perfilId);
  const actualizando = useActualizandoAprendizaje(perfilId);
  const guardar = useGuardarPreferencias();
  const [editando, setEditando] = useState(false);
  const preferencias = aprendizaje?.preferencias ?? { valora: [], evita: [], notas: "" };
  const ajustes = Object.entries(aprendizaje?.ajustes ?? {}).filter(([, f]) => f !== 1) as [Dimension, number][];

  return (
    <details className="group bg-background border border-border rounded-xl">
      <summary className="px-4 py-3 cursor-pointer list-none flex items-center justify-between gap-3">
        <span className="font-body text-sm font-semibold text-foreground inline-flex items-center gap-2">
          <Brain className="w-4 h-4 text-gold" /> Lo que la IA ha aprendido de este cliente
        </span>
        <span className="font-body text-xs text-muted-foreground inline-flex items-center gap-1.5">
          {actualizando && <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Actualizando…</>}
          {!actualizando && aprendizaje && `Actualizado el ${new Date(aprendizaje.actualizadoAt).toLocaleDateString("es-ES")}`}
          <span className="group-open:rotate-90 transition-transform">›</span>
        </span>
      </summary>

      <div className="px-4 pb-4 space-y-4 border-t border-border pt-3">
        {!aprendizaje && !editando && (
          <p className="font-body text-sm text-muted-foreground">
            Aún no hay nada aprendido. Se genera al aceptar o rechazar sugerencias y al guardar un resumen revisado.
          </p>
        )}

        {editando ? (
          <Editor
            inicial={preferencias}
            guardando={guardar.isPending}
            onCancelar={() => setEditando(false)}
            onGuardar={(p) => guardar.mutate({ perfilId, preferencias: p }, { onSuccess: () => setEditando(false) })}
          />
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <Lista titulo="Valora" puntos={preferencias.valora} />
              <Lista titulo="Evita" puntos={preferencias.evita} />
            </div>
            {preferencias.notas && <p className="font-body text-sm text-foreground">{preferencias.notas}</p>}
            <button onClick={() => setEditando(true)} className="inline-flex items-center gap-1.5 font-body text-xs text-muted-foreground hover:text-foreground">
              <Pencil className="w-3.5 h-3.5" /> Corregir preferencias
            </button>
          </>
        )}

        <div>
          <p className="font-body text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Peso de cada aspecto en el matching</p>
          {ajustes.length ? (
            <div className="flex flex-wrap gap-1.5">
              {ajustes.map(([d, f]) => (
                <span
                  key={d}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-body border ${f > 1 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-muted text-muted-foreground border-border"}`}
                >
                  {NOMBRES_DIMENSION[d]} {f > 1 ? "+" : "−"}{Math.round(Math.abs(f - 1) * 100)} %
                </span>
              ))}
            </div>
          ) : (
            <p className="font-body text-sm text-muted-foreground">Sin ajustes: hacen falta al menos 3 sugerencias aceptadas o rechazadas.</p>
          )}
        </div>
      </div>
    </details>
  );
};

export default AprendizajeCliente;
