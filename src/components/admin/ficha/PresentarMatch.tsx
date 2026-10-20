import { useState } from "react";
import { Eye, Loader2, Send } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useActualizarMatch, useMotivosSugerencia, type MatchConPersonas } from "@/hooks/admin/useMatches";
import { limpiarMotivos, MAX_MOTIVOS_CLIENTE } from "@/lib/matches";

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long" });
const onError = (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" });

// Se monta al abrir: con los motivos ya guardados o, si no hay, con los de la sugerencia.
const Formulario = ({ match, motivosSugerencia, cerrar }: { match: MatchConPersonas; motivosSugerencia: string[]; cerrar: () => void }) => {
  const actualizar = useActualizarMatch();
  const [texto, setTexto] = useState((match.motivos_cliente.length ? match.motivos_cliente : motivosSugerencia).join("\n"));
  const motivos = limpiarMotivos(texto);
  const presentado = !!match.presentado_at;

  const guardar = (cambios: { presentado_at?: string | null; motivos_cliente?: string[] }, titulo: string) =>
    actualizar.mutate({ id: match.id, cambios }, { onSuccess: () => { toast({ title: titulo }); cerrar(); }, onError });

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="font-body text-xs text-muted-foreground uppercase tracking-wider">Por qué os hemos presentado (uno por línea, hasta {MAX_MOTIVOS_CLIENTE})</span>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={5}
          className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm"
          placeholder={"Los dos queréis formar una familia\nPlanes activos el fin de semana"}
        />
      </label>
      <p className="font-body text-xs text-amber-700">
        Lo leerán los dos: no pongas religión, política, salud, apellidos ni datos de contacto. Los riesgos no se muestran nunca.
      </p>
      <div className="flex justify-between gap-2 flex-wrap">
        {presentado ? (
          <button
            onClick={() => guardar({ presentado_at: null }, "Ya no se ve en sus áreas")}
            disabled={actualizar.isPending}
            className="px-3 py-1.5 rounded-lg font-body text-sm text-rose-700 hover:bg-rose-50"
          >
            Retirar de sus áreas
          </button>
        ) : <span />}
        <button
          onClick={() =>
            guardar(
              presentado ? { motivos_cliente: motivos } : { motivos_cliente: motivos, presentado_at: new Date().toISOString() },
              presentado ? "Motivos guardados" : "Presentado: ya lo ven los dos en su área",
            )
          }
          disabled={actualizar.isPending || !motivos.length}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background font-body text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {actualizar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {presentado ? "Guardar motivos" : "Presentar a los dos"}
        </button>
      </div>
    </div>
  );
};

/** T18.1 · Presentar el match en el área de los dos clientes (hasta entonces no lo ven), con los motivos revisados. */
const PresentarMatch = ({ match }: { match: MatchConPersonas }) => {
  const [abierto, setAbierto] = useState(false);
  // Sin motivos guardados, se precargan los de la sugerencia: el formulario espera a tenerlos.
  const precargar = !match.motivos_cliente.length && !!match.sugerencia_id;
  const sugerencia = useMotivosSugerencia(match.sugerencia_id, abierto && precargar);
  const presentado = !!match.presentado_at;
  const nombre = (p: MatchConPersonas["a"]) => p?.nombre_completo.trim().split(/\s+/)[0] ?? "?";

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-body font-medium border ${presentado ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-background text-foreground border-border hover:bg-muted"}`}
        title={presentado ? "Lo ven los dos en su área" : "Aún no lo ven en su área"}
      >
        <Eye className="w-3.5 h-3.5" /> {presentado ? `En su área desde el ${fecha(match.presentado_at as string)}` : "Presentar en su área"}
      </button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{presentado ? "Match presentado" : "Presentar en su área"}: {nombre(match.a)} y {nombre(match.b)}</DialogTitle>
            <DialogDescription className="font-body">
              Al presentarlo, los dos lo ven en su área con el nombre de pila, la edad, la zona, la foto y las aficiones del otro, y estos motivos.
            </DialogDescription>
          </DialogHeader>
          {abierto && (precargar && sugerencia.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" />
          ) : (
            <Formulario match={match} motivosSugerencia={sugerencia.data ?? []} cerrar={() => setAbierto(false)} />
          ))}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PresentarMatch;
