import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";

// T11.4 · Vuelta desde Stripe (success_url y cancel_url de stripe-checkout). El pago lo registra el aviso de Stripe,
// no esta página: aquí solo se informa.
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

const PagoResultado = () => {
  const t = TEXTOS[useLocation().pathname as keyof typeof TEXTOS] ?? TEXTOS["/pago/cancelado"];
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
