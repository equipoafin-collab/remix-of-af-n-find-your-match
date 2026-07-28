import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Perfil profundo",
    description:
      "Completa tu perfil y agenda una entrevista personal con uno de nuestros especialistas. Conocemos tus valores, estilo de vida y lo que realmente buscas.",
  },
  {
    number: "02",
    title: "Entrevista personal",
    description:
      "Nuestro equipo de especialistas te entrevista cara a cara para entender quién eres más allá de lo superficial. Nada de algoritmos, solo personas entendiendo a personas.",
  },
  {
    number: "03",
    title: "Conexiones auténticas",
    description:
      "Nuestros especialistas seleccionan personalmente perfiles compatibles contigo. Cada presentación viene acompañada de un análisis humano de afinidad.",
  },
];

const HowItWorks = () => {
  return (
    <section id="como-funciona" className="py-16 md:py-20 bg-background">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-gold font-body text-sm tracking-[0.2em] uppercase mb-4">
            El proceso
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground">
            Cómo funciona
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="relative"
            >
              <div className="text-6xl font-display font-bold text-cream-dark mb-4">
                {step.number}
              </div>
              <h3 className="font-display text-2xl font-semibold text-foreground mb-3">
                {step.title}
              </h3>
              <p className="font-body text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
