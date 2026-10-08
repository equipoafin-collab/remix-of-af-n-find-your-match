import { useState } from "react";
import { format } from "date-fns";
import { Pencil, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useConfiguracion } from "@/hooks/admin/useConfiguracion";
import { useUpdatePerfil } from "@/hooks/admin/usePerfiles";
import { CONFIGURACION_POR_DEFECTO } from "@/lib/configuracion";
import { mesesDePlan, sesionesSugeridas } from "@/lib/plan";
import type { Cliente, PlanTipo } from "@/types/admin";

const campo = "mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm";
const etiqueta = "font-body text-xs text-muted-foreground uppercase tracking-wider";

// Se monta al abrir el diálogo: siempre arranca con lo guardado.
const FormularioPlan = ({ cliente, cerrar }: { cliente: Cliente; cerrar: () => void }) => {
  const { data: config = CONFIGURACION_POR_DEFECTO } = useConfiguracion();
  const updatePerfil = useUpdatePerfil();
  const [plan, setPlan] = useState<PlanTipo | null>(cliente.plan);
  const [inicio, setInicio] = useState(cliente.plan_inicio ?? "");
  const [fin, setFin] = useState(cliente.plan_fin ?? "");
  const [sesiones, setSesiones] = useState(String(cliente.sesiones_contratadas));

  // Cambiar plan o fechas propone las sesiones sugeridas; después se pueden ajustar a mano.
  const cambiar = (p: PlanTipo | null, i: string, f: string) => {
    setPlan(p);
    setInicio(i);
    setFin(f);
    const sugeridas = sesionesSugeridas(p, i, f, config.sesiones_por_plan);
    if (sugeridas !== null) setSesiones(String(sugeridas));
  };

  const meses = mesesDePlan(inicio, fin);
  const fechasAlReves = !!inicio && !!fin && fin < inicio;
  const numSesiones = Number(sesiones);
  const sesionesValidas = sesiones !== "" && Number.isInteger(numSesiones) && numSesiones >= 0;

  const guardar = () =>
    updatePerfil.mutate(
      {
        id: cliente.id,
        cambios: { plan, plan_inicio: inicio || null, plan_fin: fin || null, sesiones_contratadas: numSesiones },
      },
      {
        onSuccess: () => {
          toast({ title: "Plan actualizado", description: cliente.nombre_completo });
          cerrar();
        },
        onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
      },
    );

  return (
    <>
      <div className="space-y-4">
        <div>
          <label className={etiqueta}>Plan</label>
          <select aria-label="Plan"
            value={plan ?? ""}
            onChange={(e) => {
              const p = (e.target.value || null) as PlanTipo | null;
              // Al dar de alta un plan, el inicio por defecto es hoy.
              cambiar(p, p && !inicio ? format(new Date(), "yyyy-MM-dd") : inicio, fin);
            }}
            className={campo}
          >
            <option value="">Sin plan (lead)</option>
            <option value="esencial">Esencial · {config.sesiones_por_plan.esencial} sesión/mes</option>
            <option value="premium">Premium · {config.sesiones_por_plan.premium} sesiones/mes</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={etiqueta}>Inicio</label>
            <input aria-label="Inicio" type="date" value={inicio} onChange={(e) => cambiar(plan, e.target.value, fin)} className={campo} />
          </div>
          <div>
            <label className={etiqueta}>Fin</label>
            <input aria-label="Fin" type="date" value={fin} min={inicio || undefined} onChange={(e) => cambiar(plan, inicio, e.target.value)} className={campo} />
          </div>
        </div>
        {fechasAlReves && <p className="font-body text-xs text-rose-700">La fecha de fin es anterior a la de inicio.</p>}
        <div>
          <label className={etiqueta}>Sesiones contratadas</label>
          <input aria-label="Sesiones contratadas" type="number" min="0" step="1" value={sesiones} onChange={(e) => setSesiones(e.target.value)} className={campo} />
          <p className="mt-1 font-body text-xs text-muted-foreground">
            {plan && meses !== null
              ? `Sugerido: ${config.sesiones_por_plan[plan]}/mes × ${meses} ${meses === 1 ? "mes" : "meses"} = ${config.sesiones_por_plan[plan] * meses}. `
              : "Elige plan y fechas para ver la sugerencia. "}
            Lleva {cliente.sesiones_realizadas} realizadas.
          </p>
        </div>
      </div>
      <DialogFooter>
        <button onClick={cerrar} className="px-4 py-2 rounded-xl border border-border font-body text-sm text-muted-foreground hover:text-foreground">
          Cancelar
        </button>
        <button
          onClick={guardar}
          disabled={updatePerfil.isPending || fechasAlReves || !sesionesValidas}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background font-body text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {updatePerfil.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Guardar plan
        </button>
      </DialogFooter>
    </>
  );
};

const EditarPlan = ({ cliente }: { cliente: Cliente }) => {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="inline-flex items-center gap-1 text-xs font-body text-muted-foreground hover:text-foreground"
        title="Editar plan y sesiones contratadas"
      >
        <Pencil className="w-3 h-3" /> Plan
      </button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Plan de {cliente.nombre_completo}</DialogTitle>
            <DialogDescription className="font-body">Tipo de plan, fechas y sesiones contratadas.</DialogDescription>
          </DialogHeader>
          {abierto && <FormularioPlan cliente={cliente} cerrar={() => setAbierto(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EditarPlan;
