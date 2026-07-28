import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Heart, Coffee, Users, MessageCircle, FileText, Sparkles } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const QuienesSomos = () => {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      {/* 1. Hero */}
      <section className="relative pt-28 pb-16 md:pt-36 md:pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-primary" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/90 to-primary" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <motion.div {...fadeUp}>
            <Coffee className="w-10 h-10 text-gold mx-auto mb-6" />
            <h1 className="font-display text-4xl md:text-6xl font-bold text-primary-foreground leading-tight mb-6">
              Todo empezó con un café…
              <br />
              <em className="font-normal italic text-gold">
                y muchas conversaciones sobre citas.
              </em>
            </h1>
            <p className="font-body text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto leading-relaxed">
              Somos Verónica y Ana, y creamos este proyecto porque estábamos cansadas de las citas frías de las apps.
            </p>
          </motion.div>
        </div>
      </section>

      {/* 2. Nuestra historia */}
      <section className="py-14 md:py-20 bg-background">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div {...fadeUp} className="text-center mb-10">
            <p className="text-gold font-body text-sm tracking-[0.2em] uppercase mb-3">Nuestra historia</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              Historias que seguramente también te suenan
            </h2>
          </motion.div>

          <motion.div {...fadeUp} className="space-y-6 font-body text-muted-foreground leading-relaxed text-base md:text-lg">
            <p>
              Somos <strong className="text-foreground">Verónica y Ana</strong>, compañeras de trabajo que siempre terminábamos hablando de lo mismo en el café: <em>las citas a través de aplicaciones.</em>
            </p>

            <div className="border-l-2 border-gold/40 pl-5 space-y-3 my-8">
              <p>Personas que no buscaban lo mismo.</p>
              <p>Conversaciones que parecían más un interrogatorio que una cita.</p>
              <p>Y la sensación de estar explicando una y otra vez quién eres y qué buscas.</p>
            </div>

            <p>
              Con el tiempo nos dimos cuenta de algo: muchas citas se estaban convirtiendo en <strong className="text-foreground">pequeñas entrevistas</strong>.
            </p>

            <p className="font-display text-xl md:text-2xl text-foreground italic text-center py-4">
              "Creo que acabo de pasar un cuestionario."
            </p>
          </motion.div>
        </div>
      </section>

      {/* Separador suave */}
      <div className="max-w-xl mx-auto px-6">
        <div className="h-px bg-border" />
      </div>

      {/* 3. Quién hay detrás */}
      <section className="py-14 md:py-20 bg-background">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div {...fadeUp} className="text-center mb-10">
            <Users className="w-8 h-8 text-gold mx-auto mb-4" />
            <p className="text-gold font-body text-sm tracking-[0.2em] uppercase mb-3">Quién hay detrás</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              Quizá también influía nuestro trabajo
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 mb-10">
            <motion.div
              {...fadeUp}
              className="bg-card rounded-2xl p-6 border border-border/60"
            >
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="font-display text-2xl font-bold text-primary">V</span>
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground text-center mb-2">
                Verónica
              </h3>
              <p className="font-body text-muted-foreground text-center leading-relaxed text-sm">
                Trabaja en Recursos Humanos, acostumbrada a analizar perfiles, escuchar historias y entender qué hay detrás de lo que una persona cuenta.
              </p>
            </motion.div>

            <motion.div
              {...fadeUp}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="bg-card rounded-2xl p-6 border border-border/60"
            >
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="font-display text-2xl font-bold text-primary">A</span>
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground text-center mb-2">
                Ana
              </h3>
              <p className="font-body text-muted-foreground text-center leading-relaxed text-sm">
                Es psicóloga especializada en terapia de pareja, y lleva años ayudando a personas a entender cómo funcionan las relaciones y qué hace que dos personas realmente encajen.
              </p>
            </motion.div>
          </div>

          <motion.p {...fadeUp} className="font-body text-muted-foreground text-center text-base md:text-lg leading-relaxed">
            Entre conversaciones y experiencias propias, empezamos a preguntarnos:
          </motion.p>
          <motion.p
            {...fadeUp}
            className="font-display text-xl md:text-2xl text-foreground italic text-center py-4"
          >
            "¿Por qué ese filtro no se hace antes de la cita?"
          </motion.p>
        </div>
      </section>

      {/* Separador */}
      <div className="max-w-xl mx-auto px-6">
        <div className="h-px bg-border" />
      </div>

      {/* 4. La idea */}
      <section className="py-14 md:py-20 bg-background">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div {...fadeUp} className="text-center mb-10">
            <Sparkles className="w-8 h-8 text-gold mx-auto mb-4" />
            <p className="text-gold font-body text-sm tracking-[0.2em] uppercase mb-3">La idea</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              Algo más íntimo y natural
            </h2>
          </motion.div>

          <motion.div {...fadeUp} className="space-y-6 font-body text-muted-foreground leading-relaxed text-base md:text-lg">
            <p>
              Alguna vez incluso pensamos en esos programas de televisión donde profesionales encuentran personas compatibles.
            </p>
            <p>
              Pero había algo que no nos convencía: <strong className="text-foreground">la exposición pública</strong>.
            </p>
            <p>
              Nos gustaba la idea de que alguien ayudara a encontrar a personas compatibles… pero queríamos hacerlo de una forma mucho más íntima y natural.
            </p>

            <p className="font-display text-xl md:text-2xl text-foreground italic text-center py-4">
              "¿Y si ese proceso lo hacemos nosotras primero?"
            </p>
          </motion.div>
        </div>
      </section>

      {/* 5. Cómo funciona */}
      <section className="py-14 md:py-20 bg-card">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div {...fadeUp} className="text-center mb-10">
            <MessageCircle className="w-8 h-8 text-gold mx-auto mb-4" />
            <p className="text-gold font-body text-sm tracking-[0.2em] uppercase mb-3">Cómo funciona</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              Así nació esta plataforma
            </h2>
          </motion.div>

          <motion.div {...fadeUp} className="space-y-6 font-body text-muted-foreground leading-relaxed text-base md:text-lg">
            <p>
              Antes de que conozcas a alguien, <strong className="text-foreground">hablamos con esa persona</strong>.
            </p>
            <p>La entrevistamos para conocer:</p>

            <div className="grid grid-cols-2 gap-3 my-6">
              {["Su historia", "Sus valores", "Qué busca realmente", "Qué relación quiere construir"].map(
                (item, i) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    className="flex items-center gap-2 bg-background rounded-xl px-4 py-3 border border-border/60"
                  >
                    <Heart className="w-4 h-4 text-gold shrink-0" />
                    <span className="text-foreground text-sm font-medium">{item}</span>
                  </motion.div>
                )
              )}
            </div>

            <p>
              De esta forma, cuando dos personas se encuentran, <strong className="text-foreground">no necesitan convertir la cita en una entrevista</strong>.
            </p>

            <div className="bg-background rounded-2xl p-6 border border-border/60 my-6">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-gold shrink-0 mt-1" />
                <div>
                  <p className="text-foreground font-medium mb-1">
                    Antes de quedar recibirás un pequeño informe
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Sus inquietudes, intereses y su forma de ver las relaciones. No es un currículum. Es simplemente una forma de que la conversación empiece desde un lugar más natural.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 6. Cierre */}
      <section className="py-14 md:py-20 bg-primary">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <motion.div {...fadeUp}>
            <Heart className="w-8 h-8 text-gold mx-auto mb-6" />
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-6">
              Conocer a alguien especial no debería sentirse como pasar un examen
            </h2>
            <p className="font-body text-lg text-primary-foreground/80 max-w-xl mx-auto mb-4 leading-relaxed">
              Queremos que llegues a una cita sabiendo que ya hay algo en común. Y que lo único que tengas que hacer sea disfrutar del momento y descubrir si hay conexión.
            </p>
            <p className="font-display text-xl text-gold italic mt-8">
              Verónica & Ana
            </p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default QuienesSomos;
