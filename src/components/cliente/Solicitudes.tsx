import { Check, Loader2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { usePedirAPsicologa } from "@/hooks/cliente/useMiArea";
import { SOLICITUDES, solicitudesDisponibles, type MiAreaAbierta, type TipoSolicitud } from "@/lib/areaCliente";
import { rotuloClaro } from "./estilos";

const pildora = "inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-border font-body text-sm hover:bg-muted disabled:opacity-60";

/** T16.3 · Pausar o reanudar la búsqueda, la baja y la copia de sus datos: solo avisan a la psicóloga, que decide. */
const Solicitudes = ({ area }: { area: MiAreaAbierta }) => {
  const pedir = usePedirAPsicologa();
  const enviar = (tipo: TipoSolicitud) =>
    pedir.mutate(tipo, {
      onSuccess: () => toast({ title: "Solicitud enviada", description: "Tu psicóloga se pondrá en contacto contigo." }),
      onError: () => toast({ title: "No se pudo enviar", description: "Inténtalo de nuevo en un momento.", variant: "destructive" }),
    });
  const disponibles = solicitudesDisponibles(area.en_pausa);
  const pedidas = disponibles.filter((t) => area.solicitudes.includes(t));
  const enviando = (tipo: TipoSolicitud) => pedir.isPending && pedir.variables === tipo;

  return (
    <section className="space-y-3 pt-2">
      <p className={rotuloClaro}>Pedir a tu psicóloga</p>
      {pedidas.map((t) => (
        <p key={t} className="font-body text-sm text-foreground flex items-start gap-2">
          <Check className="w-4 h-4 text-gold-texto mt-0.5 shrink-0" /> {SOLICITUDES[t].enviada}: se pondrá en contacto contigo.
        </p>
      ))}
      <div className="flex flex-wrap gap-2">
        {disponibles.filter((t) => !pedidas.includes(t)).map((t) =>
          t === "baja" ? (
            <AlertDialog key={t}>
              <AlertDialogTrigger asChild>
                <button className={`${pildora} text-rose-700`} disabled={pedir.isPending}>
                  {enviando(t) && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {SOLICITUDES[t].boton}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-display">¿Quieres pedir la baja?</AlertDialogTitle>
                  <AlertDialogDescription className="font-body">
                    Avisaremos a tu psicóloga y ella hablará contigo antes de darte de baja. Hasta entonces, todo sigue igual.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>No, volver</AlertDialogCancel>
                  <AlertDialogAction onClick={() => enviar(t)}>Sí, pedir la baja</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <button key={t} onClick={() => enviar(t)} disabled={pedir.isPending} className={`${pildora} text-foreground`}>
              {enviando(t) && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {SOLICITUDES[t].boton}
            </button>
          ),
        )}
      </div>
    </section>
  );
};

export default Solicitudes;
