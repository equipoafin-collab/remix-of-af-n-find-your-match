import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  const navigate = useNavigate();
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt="Conexión entre dos personas"
          className="w-full h-full object-cover"
          loading="eager" />

        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center pt-20 bg-wine-light text-primary">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-gold font-body text-sm tracking-[0.3em] uppercase mb-6">
          Detrás de cada conexión hay una entrevista real
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-primary-foreground leading-[1.1] mb-6">
          Te escuchamos, te conocemos
          <br />
          <em className="font-normal italic">y encontramos a tu pareja perfecta</em>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="font-body text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-8 leading-relaxed">
          A través de entrevistas personales.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.85 }}
          className="font-display text-xl md:text-2xl text-gold italic mb-10">
          Porque lo importante no se mide en algoritmos.



        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="flex flex-col items-center gap-4">

          <p className="text-primary-foreground/70 text-sm font-body leading-relaxed text-center max-w-md">
            DISC es una metodología usada en RRHH y en Psicología que revela cómo te relacionas, comunicas y conectas con los demás para potenciar tus relaciones personales.
          </p>
          <button
            onClick={() => navigate("/quiz")}
            className="group relative px-10 py-4 rounded-full bg-gold text-accent-foreground font-semibold text-base shadow-[0_8px_30px_-6px_hsl(var(--gold)/0.5)] hover:shadow-[0_12px_40px_-4px_hsl(var(--gold)/0.6)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 overflow-hidden"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
            <span className="relative flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              ¿Quieres saber cuál es tu DISC?
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        </motion.div>

      </div>
    </section>);
};

export default HeroSection;