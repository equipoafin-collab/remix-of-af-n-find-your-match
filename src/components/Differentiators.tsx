import { motion } from "framer-motion";
import { Brain, Heart, Shield, Sparkles } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Entrevistas personales",
    description: "Nuestros especialistas te conocen en persona para entender quién eres de verdad.",
  },
  {
    icon: Heart,
    title: "Sin superficialidad",
    description: "Priorizamos la compatibilidad profunda sobre la apariencia. Las fotos son secundarias.",
  },
  {
    icon: Shield,
    title: "Verificación rigurosa",
    description: "Cada perfil es verificado manualmente. Cero bots, cero perfiles falsos.",
  },
  {
    icon: Sparkles,
    title: "Calidad sobre cantidad",
    description: "Buscamos calidad sobre cantidad. Tu match llegará cuando consideremos que hay un perfil que encaja contigo.",
  },
];

const Differentiators = () => {
  return (
    <section id="diferencia" className="py-16 md:py-20 bg-card">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-gold font-body text-sm tracking-[0.2em] uppercase mb-4">
            Nuestra diferencia
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground">
            No es una app de citas
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-6 md:gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-background rounded-2xl p-6 border border-border hover:shadow-[var(--shadow-soft)] transition-shadow duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="font-body text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Differentiators;
