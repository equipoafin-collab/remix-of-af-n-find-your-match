import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Constants } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import { useCambiarEstado } from "@/hooks/admin/usePerfiles";
import type { EstadoCliente, Perfil } from "@/types/admin";

// Reglas de cambiar_estado_cliente (T1.5), contadas a la psicóloga antes de confirmar.
const CONSECUENCIAS: Record<EstadoCliente, string> = {
  activo: "Vuelve a entrar en el matching. Todo su historial (sesiones, notas, matches) sigue intacto.",
  pausado:
    "Deja de aparecer en nuevos matches y caducan las sugerencias pendientes donde es candidato. Conserva sus tareas y su historial, y se puede reactivar cuando quieras.",
  baja:
    "Sale del matching: se cancelan sus tareas pendientes, caducan sus sugerencias y se cierran sus alertas. No se borra nada: sesiones, notas y matches se conservan y se puede reactivar.",
  finalizado:
    "Plan terminado o pareja encontrada. Igual que Pausado a efectos de matching y no genera alertas. Conserva tareas e historial.",
};

const CambiarEstado = ({ perfil }: { perfil: Perfil }) => {
  const [destino, setDestino] = useState<EstadoCliente | null>(null);
  const [motivo, setMotivo] = useState("");
  const cambiarEstado = useCambiarEstado();

  const cerrar = () => {
    setDestino(null);
    setMotivo("");
  };

  const confirmar = () => {
    if (!destino) return;
    cambiarEstado.mutate(
      { perfilId: perfil.id, estado: destino, motivo },
      {
        onSuccess: () => {
          toast({ title: "Estado actualizado", description: `${perfil.nombre_completo} pasa a ${destino}.` });
          cerrar();
        },
        onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
      },
    );
  };

  return (
    <div>
      <label className="font-body text-xs text-muted-foreground uppercase tracking-wider">Estado del cliente</label>
      {/* El valor sigue al guardado: elegir otro abre la confirmación y, si se cancela, vuelve solo. */}
      <select
        value={perfil.estado_cliente}
        onChange={(e) => setDestino(e.target.value as EstadoCliente)}
        className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm capitalize"
      >
        {Constants.public.Enums.estado_cliente.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <AlertDialog open={destino !== null} onOpenChange={(abierto) => !abierto && cerrar()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              ¿Pasar a <span className="capitalize">{destino}</span> a {perfil.nombre_completo}?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-body">{destino && CONSECUENCIAS[destino]}</AlertDialogDescription>
          </AlertDialogHeader>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            placeholder="Motivo (opcional, queda registrado)"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm resize-y"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cambiarEstado.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={cambiarEstado.isPending}
              onClick={(e) => {
                e.preventDefault(); // se cierra al terminar, no al pulsar
                confirmar();
              }}
              className={destino === "baja" ? "bg-rose-600 hover:bg-rose-700" : undefined}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CambiarEstado;
