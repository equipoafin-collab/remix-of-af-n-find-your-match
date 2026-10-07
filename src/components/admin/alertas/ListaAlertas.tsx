import { Link } from "react-router-dom";
import { Eye, Check, AlertTriangle, Info, BellRing } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useActualizarAlerta, type AlertaConPerfil } from "@/hooks/admin/useAlertas";
import { SEVERIDAD_ALERTA, TIPO_ALERTA } from "@/lib/alertas";

const badge = "px-2 py-0.5 rounded-full text-[11px] font-body font-medium border";
const ICONO = { urgente: AlertTriangle, aviso: BellRing, info: Info };
const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });

const FilaAlerta = ({ alerta, mostrarCliente, compacta }: { alerta: AlertaConPerfil; mostrarCliente: boolean; compacta: boolean }) => {
  const actualizar = useActualizarAlerta();
  const resuelta = alerta.estado === "resuelta";
  const Icono = ICONO[alerta.severidad];
  const cambiar = (estado: "vista" | "resuelta") =>
    actualizar.mutate({ id: alerta.id, estado }, { onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }) });

  return (
    <li className={`flex items-start gap-3 ${compacta ? "px-3 py-2.5" : "px-5 py-3"} border-t border-border first:border-t-0 ${alerta.estado === "abierta" ? "" : "opacity-75"}`}>
      <Icono className={`w-4 h-4 mt-0.5 shrink-0 ${alerta.severidad === "urgente" ? "text-rose-600" : alerta.severidad === "aviso" ? "text-amber-600" : "text-blue-600"}`} />
      <div className="flex-1 min-w-0">
        <p className={`font-body text-sm ${resuelta ? "text-muted-foreground line-through" : "text-foreground"} ${alerta.estado === "abierta" ? "font-medium" : ""}`}>
          {alerta.mensaje}
        </p>
        <p className="font-body text-xs mt-1 flex items-center gap-2 flex-wrap text-muted-foreground">
          <span className={`${badge} ${SEVERIDAD_ALERTA[alerta.severidad].color}`}>{SEVERIDAD_ALERTA[alerta.severidad].label}</span>
          {!compacta && <span>{TIPO_ALERTA[alerta.tipo]}</span>}
          <span>{fecha(alerta.created_at)}</span>
          {mostrarCliente && alerta.perfil && (
            <Link to={`/admin/perfiles/${alerta.perfil.id}`} className="text-gold hover:underline">{alerta.perfil.nombre_completo}</Link>
          )}
          {resuelta && alerta.resuelta_at && <span>Resuelta el {fecha(alerta.resuelta_at)}</span>}
        </p>
      </div>
      {!resuelta && (
        <div className="flex items-center gap-1 shrink-0">
          {alerta.estado === "abierta" && (
            <button onClick={() => cambiar("vista")} disabled={actualizar.isPending} title="Marcar como vista" className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-40">
              <Eye className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => cambiar("resuelta")} disabled={actualizar.isPending} title="Resolver" className="p-1 text-muted-foreground hover:text-emerald-600 disabled:opacity-40">
            <Check className="w-4 h-4" />
          </button>
        </div>
      )}
    </li>
  );
};

/** T7.1 · Lista de alertas (campana, página /admin/alertas y banda de la ficha). */
export const ListaAlertas = ({ alertas, mostrarCliente = false, compacta = false, vacio }: {
  alertas: AlertaConPerfil[]; mostrarCliente?: boolean; compacta?: boolean; vacio: string;
}) =>
  alertas.length === 0 ? (
    <p className={`${compacta ? "px-3 py-3" : "px-5 py-4"} font-body text-sm text-muted-foreground`}>{vacio}</p>
  ) : (
    <ul>{alertas.map((a) => <FilaAlerta key={a.id} alerta={a} mostrarCliente={mostrarCliente} compacta={compacta} />)}</ul>
  );
