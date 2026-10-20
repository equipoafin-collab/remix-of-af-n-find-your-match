import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import CompartirEnlace from "@/components/admin/CompartirEnlace";
import { useCrearAccesoCliente } from "@/hooks/admin/useAccesoCliente";
import type { Cliente } from "@/types/admin";

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long" });

type Enlace = { enlace: string; caduca_at: string };

// Se monta al abrir el diálogo: cada vez empieza sin enlace.
const FormularioAcceso = ({ cliente }: { cliente: Cliente }) => {
  const crear = useCrearAccesoCliente();
  const [enlace, setEnlace] = useState<Enlace | null>(null);
  const email = cliente.email?.trim() ?? "";

  if (enlace) {
    return (
      <div className="space-y-3">
        <p className="font-body text-sm text-foreground">
          Envíaselo a {cliente.nombre_completo}: con él elige su contraseña y entra en su área. Vale una sola vez, hasta el {fecha(enlace.caduca_at)}.
        </p>
        {window.location.hostname === "localhost" && (
          <p className="font-body text-xs text-rose-700">Lo has creado en local: el enlace apunta a localhost y no le funcionará al cliente.</p>
        )}
        <CompartirEnlace
          enlace={enlace.enlace}
          email={email}
          etiqueta="Enlace de acceso al área"
          asunto="Tu área privada en Afín"
          cuerpo={`Hola, ${cliente.nombre_completo}:\n\nYa tienes tu área privada en Afín, con tus citas, tus matches y tu perfil. Entra con este enlace personal y elige tu contraseña:\n${enlace.enlace}\n\nTu usuario es este email (${email}). El enlace es solo para ti y vale hasta el ${fecha(enlace.caduca_at)}.\n\nUn saludo,\nAfín`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="font-body text-sm text-foreground">
        Su usuario es su email: <span className="font-semibold">{email || "sin email"}</span>. Con el enlace elige su contraseña; nadie más la conoce.
        {cliente.user_id
          ? " Ya tiene cuenta: si ha olvidado la contraseña, envíale un enlace nuevo y elegirá otra."
          : " Aún no ha entrado nunca."}
      </p>
      <p className="font-body text-xs text-muted-foreground">
        El enlace vale 7 días y una sola vez; al crear otro, el anterior deja de valer. Si el plan vence sin renovar, pierde el acceso hasta que pague.
      </p>
      {!email && <p className="font-body text-sm text-rose-700">El perfil no tiene email: añádelo antes de crear el enlace.</p>}
      <div className="flex justify-end">
        <button
          onClick={() =>
            crear.mutate(cliente.id, {
              onSuccess: setEnlace,
              onError: (e) => toast({ title: "No se pudo crear el enlace", description: e.message, variant: "destructive" }),
            })
          }
          disabled={crear.isPending || !email}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background font-body text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {crear.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Crear enlace de acceso
        </button>
      </div>
    </div>
  );
};

/** T15.1 · Acceso del cliente a su área privada, desde la cabecera de la ficha. Solo con el plan pagado y en vigor. */
const AccesoArea = ({ cliente }: { cliente: Cliente }) => {
  const [abierto, setAbierto] = useState(false);
  if (!cliente.con_area) return null;
  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="inline-flex items-center gap-1 text-xs font-body text-muted-foreground hover:text-foreground"
        title="Enlace para que el cliente cree su contraseña"
      >
        <KeyRound className="w-3 h-3" /> Acceso al área
      </button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Acceso al área de {cliente.nombre_completo}</DialogTitle>
            <DialogDescription className="font-body">Su área privada en Afín: citas, matches y perfil.</DialogDescription>
          </DialogHeader>
          {abierto && <FormularioAcceso cliente={cliente} />}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AccesoArea;
