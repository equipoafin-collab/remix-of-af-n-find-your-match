import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import CompartirEnlace from "@/components/admin/CompartirEnlace";
import { useConfiguracion } from "@/hooks/admin/useConfiguracion";
import { useCrearEnlacePago, type EnlacePago as Enlace } from "@/hooks/admin/usePagos";
import { CONFIGURACION_POR_DEFECTO } from "@/lib/configuracion";
import { conceptoPago, importeCentimos } from "../../../../supabase/functions/_shared/stripe";
import type { Cliente, PlanTipo } from "@/types/admin";

const campo = "mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm";
const etiqueta = "font-body text-xs text-muted-foreground uppercase tracking-wider";
const euros = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
const fechaHora = (iso: string) => new Date(iso).toLocaleString("es-ES", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

// Se monta al abrir el diálogo: siempre arranca con el plan del cliente y los meses de Configuración.
const FormularioEnlace = ({ cliente }: { cliente: Cliente }) => {
  const { data: config = CONFIGURACION_POR_DEFECTO } = useConfiguracion();
  const crear = useCrearEnlacePago();
  const [plan, setPlan] = useState<PlanTipo>(cliente.plan ?? "esencial");
  const [meses, setMeses] = useState(String(config.meses_plan));
  const [enlace, setEnlace] = useState<Enlace | null>(null);

  const n = Number(meses);
  const mesesValidos = Number.isInteger(n) && n >= 1 && n <= 24;
  const importe = mesesValidos ? importeCentimos(config.precio_plan[plan], n) / 100 : null;

  const generar = () =>
    crear.mutate(
      { perfilId: cliente.id, plan, meses: n },
      {
        onSuccess: (r) => {
          setEnlace(r);
          if (r.reutilizado) toast({ title: "Ya había un enlace vigente", description: "Es el mismo que se creó antes para este plan y estos meses." });
        },
        onError: (e) => toast({ title: "No se pudo crear el enlace", description: e.message, variant: "destructive" }),
      },
    );

  if (enlace) {
    const concepto = conceptoPago(plan, n);
    return (
      <div className="space-y-3">
        <p className="font-body text-sm text-foreground">
          {concepto} · <span className="font-semibold">{euros(enlace.importe)}</span>. Envíaselo a {cliente.nombre_completo}: al pagar,
          el pago queda registrado y el plan se activa solo. El enlace caduca el {fechaHora(enlace.caduca_at)}.
        </p>
        <CompartirEnlace
          enlace={enlace.enlace}
          email={cliente.email ?? ""}
          etiqueta="Enlace de pago"
          asunto="Pago de tu plan en Afín"
          cuerpo={`Hola, ${cliente.nombre_completo}:\n\nAquí tienes el enlace para pagar tu ${concepto} (${euros(enlace.importe)}):\n${enlace.enlace}\n\nEl pago es seguro, con Stripe, y el enlace caduca el ${fechaHora(enlace.caduca_at)}.\n\nUn saludo,\nAfín`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!cliente.email?.trim() && (
        <p className="font-body text-sm text-rose-700">El perfil no tiene email: Stripe lo necesita para el recibo. Añádelo antes de crear el enlace.</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className={etiqueta}>Plan</span>
          <select value={plan} onChange={(e) => setPlan(e.target.value as PlanTipo)} className={campo}>
            <option value="esencial">Esencial · {euros(config.precio_plan.esencial)}/mes</option>
            <option value="premium">Premium · {euros(config.precio_plan.premium)}/mes</option>
          </select>
        </label>
        <label className="block">
          <span className={etiqueta}>Meses</span>
          <input type="number" min={1} max={24} step={1} value={meses} onChange={(e) => setMeses(e.target.value)} className={campo} />
        </label>
      </div>
      <p className="font-body text-sm text-foreground">
        {importe !== null ? <>Total: <span className="font-semibold">{euros(importe)}</span> (IVA incluido), en un solo pago.</> : "Los meses van de 1 a 24."}
      </p>
      <div className="flex justify-end">
        <button
          onClick={generar}
          disabled={crear.isPending || importe === null || !cliente.email?.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background font-body text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {crear.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Crear enlace de pago
        </button>
      </div>
    </div>
  );
};

/** T11.4 · Enlace de pago de Stripe para el plan del cliente, desde la cabecera de la ficha. */
const EnlacePago = ({ cliente }: { cliente: Cliente }) => {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="inline-flex items-center gap-1 text-xs font-body text-muted-foreground hover:text-foreground"
        title="Crear un enlace de pago con Stripe"
      >
        <CreditCard className="w-3 h-3" /> Enlace de pago
      </button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Enlace de pago para {cliente.nombre_completo}</DialogTitle>
            <DialogDescription className="font-body">Pago único del plan completo con Stripe. Al pagar se activa el plan.</DialogDescription>
          </DialogHeader>
          {abierto && <FormularioEnlace cliente={cliente} />}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EnlacePago;
