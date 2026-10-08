import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const content = {
  "/terminos": {
    title: "Términos y Condiciones de Uso",
    body: [
      "Bienvenido a nuestra web. Al usar este sitio, aceptas estos términos y condiciones:",
      "1. Todos los contenidos son únicamente informativos.",
      "2. La web no se hace responsable del uso indebido de los datos o informes generados.",
      "3. Nos reservamos el derecho de modificar la web y los términos en cualquier momento.",
      "Para cualquier duda, contáctanos en equipo.afin@gmail.com.",
    ],
  },
  "/privacidad": {
    title: "Política de Privacidad",
    // T9.3 · Versión VERSION_CONSENTIMIENTO (src/lib/rgpd.ts). Pendiente de validar con asesoría legal.
    body: [
      "Nos tomamos muy en serio la protección de tus datos personales. Esta política cumple con el Reglamento General de Protección de Datos (RGPD) y la LOPDGDD. Última actualización: 8 de octubre de 2026.",
      "Responsable:\nAfín. Para cualquier cuestión sobre tus datos, escríbenos a equipo.afin@gmail.com.",
      "Datos que tratamos:\n- Los del cuestionario: nombre, email, teléfono, edad, ciudad y zona, foto, preferencias de pareja y de relación, hijos, tabaco, valores, hobbies, escalas de personalidad, test DISC y respuestas abiertas.\n- Si contratas un plan: tus pagos, las notas y resúmenes de tus sesiones con la psicóloga (incluyen información sobre tu bienestar emocional, que es un dato de salud), el vídeo de la primera sesión y, en el plan Premium, el certificado de antecedentes que subas.\n- Tu opinión después de cada cita.",
      "Finalidad:\nBuscarte pareja compatible: proponerte perfiles, preparar los informes de compatibilidad y acompañar tu proceso con la psicóloga. No usamos tus datos para nada más.",
      "Base legal:\nTu consentimiento, que das al enviar el cuestionario y que es explícito para los datos sobre tu bienestar emocional, y el contrato del plan si lo contratas. Puedes retirar tu consentimiento cuando quieras.",
      "Uso de inteligencia artificial:\nUsamos IA para ordenar los perfiles más compatibles contigo, redactar un borrador del resumen de cada sesión y preparar el informe de compatibilidad. Lo hacemos a través de la pasarela de IA de Lovable, que procesa los datos con modelos Gemini de Google. Solo enviamos lo necesario y nunca tu email ni tu teléfono. La IA no decide: la psicóloga revisa cada propuesta y cada resumen, y no te presentamos a nadie sin su aprobación.",
      "Quién puede ver tus datos:\nSolo el equipo de Afín, con acceso protegido y registrado. Cuando te presentamos a alguien, esa persona recibe el informe de compatibilidad, con tu nombre y lo que hace que encajéis, pero nunca tus notas de sesión. Nuestros proveedores técnicos (alojamiento e IA) tratan los datos por cuenta nuestra.",
      "Conservación:\nMientras uses el servicio. Si pides que borremos tus datos, los borramos todos, salvo los de facturación, que la ley nos obliga a conservar durante los plazos legales.",
      "Tus derechos:\nPuedes acceder a tus datos, rectificarlos, pedir que los borremos, oponerte o limitar su tratamiento, recibirlos en un formato portable y retirar tu consentimiento escribiendo a equipo.afin@gmail.com. Si crees que no los tratamos bien, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).",
    ],
  },
  "/aviso-legal": {
    title: "Aviso Legal",
    body: [
      "La web es propiedad de Afín.",
      "Todos los contenidos, informes y datos proporcionados son solo de carácter informativo.",
      "No nos hacemos responsables de decisiones tomadas basadas en los informes de compatibilidad.",
      "Para consultas legales o administrativas, contáctanos en equipo.afin@gmail.com.",
    ],
  },
};

const Legal = () => {
  const { pathname } = useLocation();
  const page = content[pathname as keyof typeof content];

  if (!page) return null;

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Volver al inicio
        </Link>
        <h1 className="font-display text-3xl font-bold text-foreground mb-8">{page.title}</h1>
        <div className="space-y-4">
          {page.body.map((p, i) => (
            <p key={i} className="font-body text-muted-foreground leading-relaxed whitespace-pre-line">{p}</p>
          ))}
        </div>
      </div>
    </main>
  );
};

export default Legal;
