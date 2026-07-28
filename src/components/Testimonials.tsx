import { motion } from "framer-motion";

const testimonials = [
  {
    quote: "Estaba cansada de las apps de citas y quería que alguien entendiera realmente quién soy. Necesitaba que expertos en compatibilidad de parejas me conocieran de manera personal, para poder ir a mis citas con más confianza y seguridad.",
    name: "Lucía M.",
    detail: "Madrid",
  },
  {
    quote: "La entrevista personal fue reveladora. Los especialistas de Afín me conectaron con alguien que complementa mi vida perfectamente.",
    name: "Carlos R.",
    detail: "Barcelona",
  },
  {
    quote: "Después de años en apps superficiales, Afín me devolvió la esperanza. Hablar con un especialista que te entiende cambia todo.",
    name: "Marta S.",
    detail: "Valencia",
  },
];

const Testimonials = () => {
  return (
    <section id="testimonios" className="py-10 md:py-14 bg-background">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <p className="text-gold font-body text-sm tracking-[0.2em] uppercase mb-4">
            Historias reales
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground">
            Conexiones que perduran
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <motion.blockquote
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="bg-card rounded-2xl p-6 border border-border"
            >
              <p className="font-body text-foreground text-sm leading-relaxed mb-4 italic">
                "{t.quote}"
              </p>
              <footer>
                <div className="font-display font-semibold text-foreground">{t.name}</div>
                <div className="font-body text-sm text-muted-foreground">{t.detail}</div>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
