import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { RESERVA_DESCUBRIMIENTO } from "@/lib/enlaces";
import { PRECIOS_PUBLICOS } from "@/lib/preciosPublicos";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const plans = [
{
  name: "Esencial",
  price: PRECIOS_PUBLICOS.esencial,
  period: "/mes",
  features: [
  "1 sesión mensual de 60 minutos — Proceso de autoconocimiento guiado por psicólogos especializados en relaciones",
  "Presentaciones a candidatos compatibles contigo en restaurantes de tu ciudad"],

  highlighted: true,
  cta: "Elegir Esencial"
},
{
  name: "Premium",
  price: PRECIOS_PUBLICOS.premium,
  period: "/mes",
  features: [
  "2 sesiones mensuales — Proceso de autoconocimiento guiado por psicólogos especializados en relaciones",
  "Presentaciones prioritarias frente a candidatos con perfil similar",
  "Feedback detallado y recomendaciones personalizadas tras cada cita",
  "Formulario de compatibilidad con cada persona que te vamos a presentar"],

  highlighted: false,
  cta: "Elegir Premium"
}];


const Pricing = () => {
  return (
    <section id="precios" className="py-10 md:py-14 bg-card">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10">

          <p className="text-gold font-body text-sm tracking-[0.2em] uppercase mb-4">
            Planes
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground leading-tight mb-6">
            ¿Y si por el precio de una sesión de psicología pudieras dar un paso{' '}
            <span className="text-gold">mucho más grande</span> en tu vida sentimental?
          </h2>
          <Accordion type="single" collapsible className="max-w-2xl mx-auto text-left">
            <AccordionItem value="como-lo-hacemos" className="border-border">
              <AccordionTrigger className="font-display text-2xl text-foreground">Cómo lo hacemos</AccordionTrigger>
              <AccordionContent>
          <div className="space-y-4 font-body text-base md:text-lg text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">Antes de que conozcas a alguien, hablamos con esa persona.</strong>
            </p>
            <p>La entrevistamos para conocer:</p>
            <ul className="space-y-2 list-disc pl-5">
              <li>Su historia</li>
              <li>Sus valores</li>
              <li>Qué busca realmente</li>
              <li>Qué relación quiere construir</li>
            </ul>
            <p>
              De esta forma, cuando dos personas se encuentran, no necesitan convertir la cita en una entrevista.
            </p>
            <h3 className="font-display text-xl font-semibold text-foreground pt-2">Antes de quedar recibirás un pequeño informe</h3>
            <p>
              Sus inquietudes, intereses y su forma de ver las relaciones. No es un currículum.
              Es simplemente una forma de que la conversación empiece desde un lugar más natural.
            </p>
          </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <p className="mt-6 font-display text-xl md:text-2xl text-gold font-semibold">
            Tu próxima relación puede empezar aquí.
          </p>
        </motion.div>

        {/* Free session block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-3xl mx-auto text-center mb-8 rounded-2xl p-6 border-2 border-gold/40 bg-gradient-to-b from-gold/10 to-transparent shadow-[var(--shadow-elevated)]">

          <div className="inline-block px-4 py-1 rounded-full bg-gold/15 text-gold text-xs font-medium tracking-[0.15em] uppercase mb-3">
            Recomendado
          </div>
          <h3 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-1">
            Empieza sin compromiso
          </h3>
          <p className="font-display text-lg italic text-gold mb-2">
            Primera sesión gratis
          </p>
          <p className="font-body text-xs tracking-wide uppercase text-muted-foreground mb-4">
            Entrevista personal · 20 minutos
          </p>
          <p className="font-body text-sm text-muted-foreground leading-relaxed mb-5 max-w-2xl mx-auto">
            Diagnóstico DISC y entrevista personal de 20 minutos con un especialista. Clarifica qué buscas y si Afín es para ti.
          </p>
          <ul className="flex flex-col sm:flex-row gap-3 justify-center text-sm font-body text-foreground mb-5">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-gold" />
              Diagnóstico DISC
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-gold" />
              Sin tarjeta de crédito
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-gold" />
              Sin compromiso
            </li>
          </ul>
          <a href={RESERVA_DESCUBRIMIENTO} target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-3.5 rounded-full bg-gold text-accent-foreground font-medium text-sm hover:opacity-90 transition-opacity shadow-lg">
            Reservar sesión gratis
          </a>
        </motion.div>


      </div>
    </section>);

};

export const PaidPlans = () => {
  const navigate = useNavigate();
  return (
        <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-stretch">
          {plans.map((plan, i) =>
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.12 }}
            className={`relative rounded-2xl p-8 border transition-shadow duration-300 flex flex-col ${
            plan.highlighted ?
            "bg-primary text-primary-foreground border-primary shadow-[var(--shadow-elevated)]" :
            "bg-background text-foreground border-border hover:shadow-[var(--shadow-soft)]"}`
            }>


              <h3 className="font-display text-2xl font-semibold mb-4">
                {plan.name}
              </h3>

              <div className="mb-8">
                <span className="font-display text-5xl font-bold">€{plan.price}</span>
                <span className={`font-body text-sm ${plan.highlighted ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {plan.period}
                </span>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) =>
              <li key={feature} className="flex items-start gap-3 font-body text-sm">
                    <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan.highlighted ? "text-gold" : "text-primary"}`} />
                    <span className={plan.highlighted ? "text-primary-foreground/90" : ""}>{feature}</span>
                  </li>
              )}
              </ul>

              <Button
              onClick={() => navigate("/perfil")}
              className={`w-full py-3.5 rounded-full font-medium text-sm transition-opacity hover:opacity-90 ${
              plan.highlighted ?
              "bg-gold text-accent-foreground" :
              "bg-primary text-primary-foreground"}`
              }>

                {plan.cta}
              </Button>
            </motion.div>
          )}
        </div>
  );
};

export default Pricing;