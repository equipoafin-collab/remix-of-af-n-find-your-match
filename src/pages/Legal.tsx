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
    body: [
      "Nos tomamos muy en serio la protección de tus datos personales. Esta web cumple con la LOPDGDD y el Reglamento General de Protección de Datos (RGPD).",
      "Datos que recogemos:\nNombre, edad, ciudad, preferencias de relación, hijos, tabaco, hobbies. Escalas de personalidad y respuestas abiertas para generar informes de compatibilidad.",
      "Finalidad:\nLos datos se usan únicamente para crear perfiles, generar informes de compatibilidad y mejorar la experiencia del usuario.",
      "Conservación de datos:\nSe almacenan de forma segura en nuestra base de datos y no se cederán a terceros sin tu consentimiento.",
      "Derechos:\nPuedes acceder, rectificar o eliminar tus datos en cualquier momento enviando un correo a equipo.afin@gmail.com.",
      "Consentimiento:\nAntes de enviar tu perfil, debes aceptar el tratamiento de tus datos marcando la casilla correspondiente.",
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
