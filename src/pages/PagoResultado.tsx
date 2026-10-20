import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { llamarAccesoCliente, type InfoAcceso } from "@/hooks/cliente/accesoCliente";
import CrearContrasena from "@/components/cliente/CrearContrasena";
import Pantalla from "@/components/cliente/Pantalla";
import { botonDorado, rotulo } from "@/components/cliente/estilos";

// T11.4 · Vuelta desde Stripe (success_url y cancel_url de stripe-checkout). El pago lo registra el aviso de Stripe,
// no esta página: aquí solo se informa.
// T15.3 · Si vuelve con ?session_id=… de un pago cobrado, crea aquí la contraseña de su área (o entra si ya la tiene).
const TEXTOS = {
  "/pago/ok": {
    icono: CheckCircle2,
    color: "text-emerald-600",
    titulo: "Pago recibido",
    texto: "Gracias. Tu plan queda activado y recibirás el recibo de Stripe en tu email. Nos pondremos en contacto contigo para la siguiente sesión.",
  },
  "/pago/cancelado": {
    icono: XCircle,
    color: "text-muted-foreground",
    titulo: "Pago no completado",
    texto: "No se ha cobrado nada. Si quieres pagar, vuelve a abrir el enlace que te enviamos mientras siga vigente, o escríbenos a equipo.afin@gmail.com.",
  },
};

const AccesoTrasPago = ({ sessionId, info }: { sessionId: string; info: InfoAcceso }) => (
  <Pantalla>
    <p className={rotulo}>Pago recibido</p>
    {info.cuenta ? (
      <>
        <h1 className="font-display text-4xl font-bold text-primary-foreground leading-tight">
          Tu plan ya está <em className="italic font-normal">activo</em>
        </h1>
        <p className="font-body text-primary-foreground/70">Gracias{info.nombre ? `, ${info.nombre}` : ""}. Entra en tu área con tu email y tu contraseña.</p>
        <Link to="/mi-area" className={`${botonDorado} w-full`}>Entrar en mi área</Link>
      </>
    ) : (
      <>
        <h1 className="font-display text-4xl font-bold text-primary-foreground leading-tight">
          Crea tu <em className="italic font-normal">contraseña</em>
        </h1>
        <p className="font-body text-primary-foreground/70">
          Gracias{info.nombre ? `, ${info.nombre}` : ""}: tu plan ya está activo. Crea tu contraseña para entrar en tu área, con tus citas, tus matches y tu perfil.
        </p>
        <CrearContrasena
          email={info.email}
          activar={(contrasena) => llamarAccesoCliente({ session_id: sessionId, accion: "activar_pago", contrasena })}
          pie="Recibirás el recibo de Stripe en tu email. Después entrarás con tu email y esta contraseña."
        />
      </>
    )}
  </Pantalla>
);

const PagoResultado = () => {
  const { pathname } = useLocation();
  const sessionId = useSearchParams()[0].get("session_id") ?? "";
  const info = useQuery({
    queryKey: ["acceso-pago", sessionId],
    queryFn: () => llamarAccesoCliente<InfoAcceso>({ session_id: sessionId, accion: "info_pago" }),
    enabled: pathname === "/pago/ok" && !!sessionId,
    retry: false,
  });

  if (info.isLoading) {
    return (
      <Pantalla>
        <Loader2 className="w-6 h-6 animate-spin text-primary-foreground/60 mx-auto" aria-label="Cargando" />
      </Pantalla>
    );
  }
  if (info.data) return <AccesoTrasPago sessionId={sessionId} info={info.data} />;

  // Sin session_id, cancelado o sin poder crear el acceso aquí (p. ej. pago aún sin cobrar): la página de siempre.
  const t = TEXTOS[pathname as keyof typeof TEXTOS] ?? TEXTOS["/pago/cancelado"];
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center space-y-4">
        <t.icono className={`w-12 h-12 mx-auto ${t.color}`} aria-hidden="true" />
        <h1 className="font-display text-3xl font-bold text-foreground">{t.titulo}</h1>
        <p className="font-body text-muted-foreground leading-relaxed">{t.texto}</p>
        <p className="font-body text-sm space-x-4">
          <Link to="/" className="text-gold-texto underline">Volver a Afín</Link>
          <Link to="/terminos" className="text-gold-texto underline">Términos y condiciones</Link>
        </p>
      </div>
    </main>
  );
};

export default PagoResultado;
