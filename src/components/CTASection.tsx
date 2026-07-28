import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const CTASection = () => {
  const navigate = useNavigate();
  return (
    <section className="py-10 md:py-14 bg-primary relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-gold/10 -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-gold/5 translate-y-1/2 -translate-x-1/2" />

      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-6"
        >
          ¿Listo para encontrar
          <br />
          a tu persona <em className="italic font-normal">afín</em>?
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="font-body text-lg text-primary-foreground/70 mb-6 max-w-xl mx-auto"
        >
          Regístrate hoy y agenda tu primera entrevista gratuita.
          Las mejores conexiones empiezan cuando alguien te escucha de verdad.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto"
        >
          <input
            type="email"
            placeholder="tu@email.com"
            className="flex-1 px-5 py-3.5 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/40 font-body text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
          />
          <button onClick={() => navigate("/quiz")} className="px-7 py-3.5 rounded-full bg-gold text-accent-foreground font-medium text-sm hover:opacity-90 transition-opacity whitespace-nowrap">
            Empezar gratis
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
