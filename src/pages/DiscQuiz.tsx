import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, ArrowLeft, Heart, Sparkles, Zap, Sun, Shield, Target, Check, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { generateDiscPdf } from "@/lib/generateDiscPdf";

type DiscType = "D" | "I" | "S" | "C";

interface QuizOption {
  text: string;
  disc: DiscType;
  icon: React.ReactNode;
}

interface QuizQuestion {
  question: string;
  subtitle: string;
  options: QuizOption[];
}

const QUESTIONS: QuizQuestion[] = [
  {
    question: "Cuando hay conflicto en pareja, normalmente:",
    subtitle: "Elige la opción que más te represente",
    options: [
      { text: "Soy directo/a y voy al punto", disc: "D", icon: <Target className="w-6 h-6" /> },
      { text: "Intento persuadir y suavizar", disc: "I", icon: <Sun className="w-6 h-6" /> },
      { text: "Busco mantener la armonía", disc: "S", icon: <Shield className="w-6 h-6" /> },
      { text: "Analizo antes de responder", disc: "C", icon: <Zap className="w-6 h-6" /> },
    ],
  },
  {
    question: "En el amor disfruto más:",
    subtitle: "¿Qué te hace vibrar en una relación?",
    options: [
      { text: "Aventuras y decisiones rápidas", disc: "D", icon: <Target className="w-6 h-6" /> },
      { text: "Diversión y conexión emocional", disc: "I", icon: <Sun className="w-6 h-6" /> },
      { text: "Estabilidad y tranquilidad", disc: "S", icon: <Shield className="w-6 h-6" /> },
      { text: "Planes organizados y bien pensados", disc: "C", icon: <Zap className="w-6 h-6" /> },
    ],
  },
  {
    question: "Cuando algo cambia en la relación:",
    subtitle: "¿Cuál es tu primera reacción?",
    options: [
      { text: "Actúo inmediatamente", disc: "D", icon: <Target className="w-6 h-6" /> },
      { text: "Me adapto con entusiasmo", disc: "I", icon: <Sun className="w-6 h-6" /> },
      { text: "Prefiero cambios graduales", disc: "S", icon: <Shield className="w-6 h-6" /> },
      { text: "Evalúo antes de moverme", disc: "C", icon: <Zap className="w-6 h-6" /> },
    ],
  },
  {
    question: "Mi mayor fortaleza en pareja es:",
    subtitle: "Lo que te hace único/a",
    options: [
      { text: "Determinación", disc: "D", icon: <Target className="w-6 h-6" /> },
      { text: "Energía y carisma", disc: "I", icon: <Sun className="w-6 h-6" /> },
      { text: "Lealtad y apoyo", disc: "S", icon: <Shield className="w-6 h-6" /> },
      { text: "Precisión y responsabilidad", disc: "C", icon: <Zap className="w-6 h-6" /> },
    ],
  },
];

const DISC_DESCRIPTIONS: Record<DiscType, {
  title: string;
  emoji: string;
  description: string;
  compatibility: string;
  comunicacion: string;
  actividades: string;
  fortalezas: string[];
  mejoras: string[];
  enPareja: string;
  necesidades: string[];
  frase: string;
  conflicto: string;
  amor: string;
}> = {
  D: {
    title: "Dominante",
    emoji: "⚡",
    description: "Directo, decidido, le gusta el liderazgo y la acción. Te atraen relaciones dinámicas y claras donde ambos tengan objetivos definidos.",
    compatibility: "Combinas mejor con perfiles S (estabilidad) e I (entusiasmo). Alguien que equilibre tu impulso con calma o diversión.",
    comunicacion: "Sé claro y directo, evita rodeos. Valora que tu pareja sea honesta y resolutiva.",
    actividades: "Deportes de aventura, viajes espontáneos, retos en pareja, proyectos ambiciosos juntos.",
    fortalezas: [
      "Toma decisiones con rapidez y confianza",
      "Lidera con determinación y energía",
      "Afronta los problemas de frente sin rodeos",
      "Orientado/a a resultados y objetivos claros",
    ],
    mejoras: [
      "Puede parecer impaciente o autoritario/a",
      "Le cuesta ceder el control o delegar",
      "Tiende a minimizar las emociones ajenas",
      "Puede priorizar ganar sobre conectar",
    ],
    enPareja: "Aporta dirección, iniciativa y energía a la relación. Necesita una pareja que valore su determinación y le ayude a conectar emocionalmente. Cuando se siente seguro/a, es profundamente leal y protector/a.",
    necesidades: [
      "Autonomía y espacio para decidir",
      "Una pareja directa que no dé rodeos",
      "Retos y metas compartidas",
      "Respeto por su tiempo y eficiencia",
    ],
    frase: "\"Dame libertad para actuar y te daré el mundo.\"",
    conflicto: "En conflicto, tiendes a confrontar directamente. Tu reto es aprender a escuchar antes de reaccionar y a reconocer que ceder no es perder.",
    amor: "Tu lenguaje del amor está ligado a la acción: demuestras cariño haciendo cosas, resolviendo problemas y creando experiencias intensas juntos.",
  },
  I: {
    title: "Influyente",
    emoji: "✨",
    description: "Sociable, entusiasta y motivador. Necesitas conexión emocional, diversión y sentirte admirado/a en la relación.",
    compatibility: "Encajas bien con perfiles C (estructura) y S (constancia). Alguien que te dé raíces sin apagar tu chispa.",
    comunicacion: "Expresa emociones abiertamente. Valora la escucha activa y los gestos de afecto espontáneos.",
    actividades: "Eventos sociales, viajes con amigos, cenas románticas, actividades creativas en pareja.",
    fortalezas: [
      "Genera entusiasmo y optimismo contagioso",
      "Conecta fácilmente con las personas a nivel emocional",
      "Resuelve conflictos con empatía y creatividad",
      "Hace que cualquier momento sea especial y memorable",
    ],
    mejoras: [
      "Puede evitar conversaciones difíciles o serias",
      "Tiende a ser impulsivo/a en decisiones importantes",
      "Le cuesta mantener rutinas y compromisos a largo plazo",
      "Puede buscar validación externa en exceso",
    ],
    enPareja: "Aporta alegría, espontaneidad y conexión social a la relación. Es la persona que ilumina la habitación y hace que todo sea más divertido. Necesita sentirse admirado/a y escuchado/a.",
    necesidades: [
      "Expresión emocional abierta y frecuente",
      "Vida social activa compartida",
      "Reconocimiento y admiración",
      "Espacio para la creatividad y la espontaneidad",
    ],
    frase: "\"Hazme reír y te entregaré el corazón.\"",
    conflicto: "En conflicto, tiendes a buscar la armonía rápidamente, a veces a costa de no abordar el problema de fondo. Tu reto es mantener conversaciones difíciles sin huir.",
    amor: "Tu lenguaje del amor es la conexión emocional: palabras de afirmación, gestos espontáneos, sorpresas y mucha comunicación afectiva.",
  },
  S: {
    title: "Estable",
    emoji: "🌿",
    description: "Paciente, estable y confiable. Valoras la seguridad emocional, la rutina compartida y la lealtad por encima de todo.",
    compatibility: "Combinas con perfiles D (decisión) e I (energía). Alguien que te saque de la zona de confort con cariño es ideal.",
    comunicacion: "Necesitas tiempo para procesar. Valora la paciencia y los espacios seguros para hablar.",
    actividades: "Tardes tranquilas, cocinar juntos, paseos por la naturaleza, series y películas en casa.",
    fortalezas: [
      "Ofrece apoyo constante y lealtad inquebrantable",
      "Escucha activamente sin juzgar",
      "Crea un entorno de seguridad y confianza",
      "Es paciente y comprensivo/a en los momentos difíciles",
    ],
    mejoras: [
      "Puede evitar los cambios necesarios por comodidad",
      "Le cuesta expresar sus propias necesidades",
      "Tiende a acumular frustración sin comunicarla",
      "Puede ser demasiado complaciente perdiendo su identidad",
    ],
    enPareja: "Aporta calma, estabilidad y un compromiso profundo. Es la roca emocional de la relación. Cuando se siente seguro/a, se entrega completamente y crea un hogar emocional sólido.",
    necesidades: [
      "Seguridad emocional y previsibilidad",
      "Tiempo para adaptarse a los cambios",
      "Una pareja que respete su ritmo",
      "Rutinas compartidas y momentos de calidad",
    ],
    frase: "\"Dame seguridad y te daré toda mi lealtad.\"",
    conflicto: "En conflicto, tiendes a evitar la confrontación y a ceder para mantener la paz. Tu reto es aprender a poner límites y expresar tus necesidades sin sentir culpa.",
    amor: "Tu lenguaje del amor es el tiempo de calidad y los actos de servicio: estar presente, cuidar los detalles cotidianos y crear momentos de tranquilidad juntos.",
  },
  C: {
    title: "Concienzudo",
    emoji: "💎",
    description: "Analítico, detallista y cuidadoso. Buscas coherencia, compromiso real y una relación bien construida.",
    compatibility: "Tu precisión se complementa con perfiles I (espontaneidad) y S (paciencia). Alguien que valore tu profundidad.",
    comunicacion: "Prefiere conversaciones con sentido. Valora la lógica, los datos y la coherencia en las decisiones.",
    actividades: "Museos, lectura compartida, planificación de viajes detallados, debates intelectuales.",
    fortalezas: [
      "Planifica con cuidado y previsión",
      "Valora la calidad y la coherencia en todo",
      "Aporta estructura, orden y fiabilidad",
      "Es profundamente reflexivo/a y considerado/a",
    ],
    mejoras: [
      "Puede ser excesivamente crítico/a consigo mismo y con otros",
      "Le cuesta ser espontáneo/a o improvisar",
      "Tiende a sobreanalizar las situaciones y las emociones",
      "Puede parecer frío/a cuando en realidad está procesando",
    ],
    enPareja: "Aporta seguridad, planificación y atención al detalle. Es la persona que piensa en todo y cuida cada aspecto de la relación. Necesita una pareja que valore su rigor y le ayude a soltar el control.",
    necesidades: [
      "Previsibilidad y coherencia en la relación",
      "Espacio para procesar las emociones a su ritmo",
      "Conversaciones profundas y con sentido",
      "Respeto por sus estándares y valores",
    ],
    frase: "\"Demuéstrame coherencia y te entregaré mi confianza.\"",
    conflicto: "En conflicto, tiendes a retirarte y analizar antes de hablar. Tu reto es aprender a comunicar lo que sientes en el momento, sin esperar a tener la respuesta perfecta.",
    amor: "Tu lenguaje del amor es la coherencia y los detalles pensados: regalos significativos, planes bien organizados y demostraciones de compromiso real.",
  },
};

const DISC_COLORS: Record<DiscType, { bg: string; text: string; accent: string; ring: string; gradient: string }> = {
  D: { bg: "bg-red-50", text: "text-red-700", accent: "bg-red-500", ring: "ring-red-400", gradient: "from-red-500 to-red-600" },
  I: { bg: "bg-amber-50", text: "text-amber-700", accent: "bg-amber-500", ring: "ring-amber-400", gradient: "from-amber-400 to-amber-500" },
  S: { bg: "bg-emerald-50", text: "text-emerald-700", accent: "bg-emerald-500", ring: "ring-emerald-400", gradient: "from-emerald-500 to-emerald-600" },
  C: { bg: "bg-blue-50", text: "text-blue-700", accent: "bg-blue-500", ring: "ring-blue-400", gradient: "from-blue-500 to-blue-600" },
};

const DISC_LABELS: Record<DiscType, string> = {
  D: "Dominante",
  I: "Influyente",
  S: "Estable",
  C: "Concienzudo",
};

const pageVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0, scale: 0.96 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0, scale: 0.96 }),
};

const cardStagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const cardItem = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

const DiscQuiz = () => {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<Record<number, DiscType>>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{
    scores: Record<DiscType, number>;
    percents: Record<DiscType, number>;
    primary: DiscType;
    secondary: DiscType;
  } | null>(null);
  const navigate = useNavigate();

  const goNext = useCallback(() => { setDirection(1); setStep((s) => s + 1); }, []);
  const goBack = useCallback(() => { setDirection(-1); setStep((s) => s - 1); }, []);

  const selectAnswer = useCallback((questionIndex: number, disc: DiscType) => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: disc }));
    setTimeout(() => { setDirection(1); setStep(questionIndex + 2); }, 400);
  }, []);

  const calculateResults = useCallback(() => {
    const scores: Record<DiscType, number> = { D: 0, I: 0, S: 0, C: 0 };
    Object.values(answers).forEach((d) => { scores[d]++; });
    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    const percents: Record<DiscType, number> = {
      D: total > 0 ? (scores.D / total) * 100 : 0,
      I: total > 0 ? (scores.I / total) * 100 : 0,
      S: total > 0 ? (scores.S / total) * 100 : 0,
      C: total > 0 ? (scores.C / total) * 100 : 0,
    };
    const sorted = (Object.entries(scores) as [DiscType, number][]).sort((a, b) => b[1] - a[1]);
    return { scores, percents, primary: sorted[0][0], secondary: sorted[1][0] };
  }, [answers]);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !telefono.trim()) return;
    setSaving(true);
    const res = calculateResults();

    const primary = DISC_DESCRIPTIONS[res.primary];
    const secondary = DISC_DESCRIPTIONS[res.secondary];

    await supabase.from("disc_results" as any).insert({
      name: name.trim(),
      email: email.trim(),
      telefono: telefono.trim(),
      score_d: res.scores.D,
      score_i: res.scores.I,
      score_s: res.scores.S,
      score_c: res.scores.C,
      percent_d: res.percents.D,
      percent_i: res.percents.I,
      percent_s: res.percents.S,
      percent_c: res.percents.C,
      primary_style: res.primary,
      secondary_style: res.secondary,
      strength_1: primary.fortalezas[0] || '',
      strength_2: primary.fortalezas[1] || '',
      strength_3: primary.fortalezas[2] || '',
      weakness_1: primary.mejoras[0] || '',
      weakness_2: primary.mejoras[1] || '',
      weakness_3: primary.mejoras[2] || '',
      love_language_1: primary.amor,
      love_language_2: primary.necesidades[0] || '',
      love_language_3: primary.necesidades[1] || '',
      conflict_style_1: primary.conflicto,
      conflict_style_2: secondary.conflicto,
      compatibility_tip_1: primary.compatibility,
      compatibility_tip_2: primary.comunicacion,
      compatibility_tip_3: primary.actividades,
    } as any);

    setResult(res);
    setSaving(false);
    goNext();
  };

  const progressPercent = step >= 1 && step <= 4 ? (step / 4) * 100 : 0;
  const totalSteps = 6;

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-lg mx-auto px-5 py-3 flex items-center justify-between">
          <button
            onClick={() => step > 0 ? goBack() : navigate("/")}
            className="flex items-center gap-1.5 text-sm font-body text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            {step === 0 ? "Inicio" : "Atrás"}
          </button>

          {step >= 1 && step <= 4 && (
            <span className="text-xs font-body font-medium text-muted-foreground tracking-wide uppercase">
              {step} / 4
            </span>
          )}

          <a href="/" className="font-display text-lg font-bold text-foreground tracking-tight">
            Afín
          </a>
        </div>

        {/* Progress bar */}
        {step >= 1 && step <= 4 && (
          <div className="h-1 bg-muted">
            <motion.div
              className="h-full bg-gradient-to-r from-disc to-disc-glow rounded-r-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait" custom={direction}>
            {/* STEP 0: Intro */}
            {step === 0 && (
              <motion.div
                key="intro"
                custom={direction}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="text-center space-y-10"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
                  className="w-24 h-24 rounded-3xl bg-gradient-to-br from-disc/20 to-disc-glow/10 flex items-center justify-center mx-auto shadow-lg"
                >
                  <Heart className="w-12 h-12 text-disc" />
                </motion.div>

                <div className="space-y-4">
                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.5 }}
                    className="font-display text-4xl md:text-5xl font-bold text-foreground leading-tight"
                  >
                    Descubre tu estilo
                    <br />
                    <span className="text-gradient-disc italic font-normal">en el amor</span>
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="font-body text-muted-foreground text-base md:text-lg max-w-sm mx-auto leading-relaxed"
                  >
                    Responde 4 preguntas rápidas y obtén tu perfil DISC en pareja
                  </motion.p>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55, duration: 0.5 }}
                  className="space-y-4"
                >
                  <button
                    onClick={goNext}
                    className="group relative inline-flex items-center gap-3 px-10 py-4 rounded-full bg-gradient-to-r from-disc to-disc-glow text-white font-body font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Comenzar
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <div className="flex items-center justify-center gap-6 text-xs font-body text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      2 min
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      4 preguntas
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Gratis
                    </span>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* STEPS 1-4: Questions */}
            {step >= 1 && step <= 4 && (
              <motion.div
                key={`q-${step}`}
                custom={direction}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="font-display text-2xl md:text-3xl font-bold text-foreground leading-snug"
                  >
                    {QUESTIONS[step - 1].question}
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="font-body text-sm text-muted-foreground"
                  >
                    {QUESTIONS[step - 1].subtitle}
                  </motion.p>
                </div>

                <motion.div
                  variants={cardStagger}
                  initial="hidden"
                  animate="show"
                  className="grid gap-3"
                >
                  {QUESTIONS[step - 1].options.map((opt) => {
                    const isSelected = answers[step - 1] === opt.disc;
                    const colors = DISC_COLORS[opt.disc];

                    return (
                      <motion.button
                        key={opt.disc}
                        variants={cardItem}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => selectAnswer(step - 1, opt.disc)}
                        className={`
                          relative flex items-center gap-4 p-5 md:p-6 rounded-2xl border-2 text-left
                          transition-all duration-300 cursor-pointer overflow-hidden
                          ${isSelected
                            ? `${colors.bg} border-current ${colors.text} ring-2 ${colors.ring} ring-offset-2 ring-offset-background shadow-md`
                            : "bg-card border-border/60 hover:border-border hover:shadow-md"
                          }
                        `}
                      >
                        {/* Icon circle */}
                        <div className={`
                          flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300
                          ${isSelected
                            ? `bg-gradient-to-br ${colors.gradient} text-white shadow-sm`
                            : "bg-muted/60 text-muted-foreground"
                          }
                        `}>
                          {isSelected ? <Check className="w-6 h-6" /> : opt.icon}
                        </div>

                        {/* Text */}
                        <span className={`font-body text-sm md:text-base font-medium leading-snug transition-colors duration-300 ${isSelected ? colors.text : "text-foreground"}`}>
                          {opt.text}
                        </span>

                        {/* Selection indicator */}
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={`absolute top-3 right-3 w-6 h-6 rounded-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center`}
                          >
                            <Check className="w-3.5 h-3.5 text-white" />
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </motion.div>
              </motion.div>
            )}

            {/* STEP 5: Contact info */}
            {step === 5 && (
              <motion.div
                key="contact"
                custom={direction}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-8"
              >
                <div className="text-center space-y-4">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: "spring" }}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-disc/20 to-disc-glow/10 flex items-center justify-center mx-auto shadow-md"
                  >
                    <Sparkles className="w-10 h-10 text-disc" />
                  </motion.div>
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="font-display text-3xl font-bold text-foreground"
                  >
                    ¡Ya casi!
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="font-body text-muted-foreground text-base max-w-xs mx-auto"
                  >
                    Déjanos tus datos para ver tu resultado personalizado
                  </motion.p>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="space-y-5 bg-card rounded-2xl p-6 border border-border shadow-sm"
                >
                  <div className="space-y-1.5">
                    <label className="font-body text-sm font-medium text-foreground">Nombre</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Tu nombre"
                      className="rounded-xl h-12 bg-background border-border focus:ring-2 focus:ring-disc/30 transition-shadow"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-body text-sm font-medium text-foreground">Email</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="rounded-xl h-12 bg-background border-border focus:ring-2 focus:ring-disc/30 transition-shadow"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-body text-sm font-medium text-foreground">Teléfono</label>
                    <Input
                      type="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="+34 600 000 000"
                      className="rounded-xl h-12 bg-background border-border focus:ring-2 focus:ring-disc/30 transition-shadow"
                    />
                  </div>
                </motion.div>

                <motion.button
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  onClick={handleSubmit}
                  disabled={!name.trim() || !email.trim() || !telefono.trim() || saving}
                  className="w-full group relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-disc to-disc-glow text-white font-body font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {saving ? (
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full inline-block"
                    />
                  ) : (
                    <>
                      Ver mi resultado
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}

            {/* STEP 6: Results */}
            {step === 6 && result && (() => {
              const pri = DISC_DESCRIPTIONS[result.primary];
              const sec = DISC_DESCRIPTIONS[result.secondary];
              const priColors = DISC_COLORS[result.primary];
              const secColors = DISC_COLORS[result.secondary];
              const reportLines = [
                `1. Nombre: ${name}`,
                `2. Perfil principal: ${pri.title} (${result.primary})`,
                `3. Perfil secundario: ${sec.title} (${result.secondary})`,
                `4. Distribución D: ${Math.round(result.percents.D)}%`,
                `5. Distribución I: ${Math.round(result.percents.I)}%`,
                `6. Distribución S: ${Math.round(result.percents.S)}%`,
                `7. Distribución C: ${Math.round(result.percents.C)}%`,
                `8. Fortaleza 1: ${pri.fortalezas[0] ?? ""}`,
                `9. Fortaleza 2: ${pri.fortalezas[1] ?? ""}`,
                `10. Fortaleza 3: ${pri.fortalezas[2] ?? ""}`,
                `11. Área de mejora 1: ${pri.mejoras[0] ?? ""}`,
                `12. Área de mejora 2: ${pri.mejoras[1] ?? ""}`,
                `13. Área de mejora 3: ${pri.mejoras[2] ?? ""}`,
                `14. Cómo eres en pareja: ${pri.enPareja}`,
                `15. Lenguaje del amor: ${pri.amor}`,
                `16. Necesidad afectiva 1: ${pri.necesidades[0] ?? ""}`,
                `17. Necesidad afectiva 2: ${pri.necesidades[1] ?? ""}`,
                `18. Necesidad afectiva 3: ${pri.necesidades[2] ?? ""}`,
                `19. Necesidad afectiva 4: ${pri.necesidades[3] ?? ""}`,
                `20. Gestión de conflictos (principal): ${pri.conflicto}`,
                `21. Gestión de conflictos (secundario): ${sec.conflicto}`,
                `22. Compatibilidad ideal: ${pri.compatibility}`,
                `23. Comunicación recomendada: ${pri.comunicacion}`,
                `24. Actividades sugeridas: ${pri.actividades}`,
                `25. Influencia de tu perfil secundario: ${sec.enPareja}`,
                `26. Fortalece la relación con acuerdos claros y consistentes`,
                `27. Dedica tiempo de calidad semanal para reforzar conexión`,
                `28. Practica escucha activa antes de responder en conflicto`,
                `29. Celebra avances pequeños para mantener motivación`,
                `30. Mensaje final: ${name}, tu perfil es una guía para amar mejor 💛`,
              ];

              return (
              <motion.div
                key="results"
                custom={direction}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-6"
              >
                {/* ═══ HERO HEADER ═══ */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className={`relative overflow-hidden rounded-3xl p-8 text-center ${priColors.bg} border-2 ${priColors.text}`}
                >
                  <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                    className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${priColors.gradient} flex items-center justify-center mx-auto mb-4 shadow-lg`}
                  >
                    <span className="text-4xl">{pri.emoji}</span>
                  </motion.div>
                  <p className="font-body text-xs uppercase tracking-[0.2em] opacity-60 mb-2">Informe DISC personalizado</p>
                  <h2 className="font-display text-3xl md:text-4xl font-bold mb-1">
                    ¡{name}, este es tu perfil!
                  </h2>
                  <p className="font-body text-sm opacity-80 mt-2">
                    {new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </motion.div>

                {/* ═══ PERFIL PRINCIPAL + SECUNDARIO BADGES ═══ */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="grid grid-cols-2 gap-3"
                >
                  <div className={`${priColors.bg} rounded-2xl p-5 text-center border-2 ${priColors.text} shadow-sm`}>
                    <p className="font-body text-[10px] uppercase tracking-[0.15em] opacity-60 mb-1">Principal</p>
                    <p className="font-display text-2xl font-bold">{pri.title}</p>
                    <p className="font-body text-lg font-bold mt-0.5">{Math.round(result.percents[result.primary])}%</p>
                  </div>
                  <div className={`${secColors.bg} rounded-2xl p-5 text-center border ${secColors.text} shadow-sm`}>
                    <p className="font-body text-[10px] uppercase tracking-[0.15em] opacity-60 mb-1">Secundario</p>
                    <p className="font-display text-2xl font-bold">{sec.title}</p>
                    <p className="font-body text-lg font-bold mt-0.5">{Math.round(result.percents[result.secondary])}%</p>
                  </div>
                </motion.div>

                {/* ═══ DISTRIBUCIÓN DISC ═══ */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4"
                >
                  <h3 className="font-display text-lg font-bold text-foreground text-center">Distribución DISC</h3>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {(["D", "I", "S", "C"] as DiscType[]).map((type) => (
                      <div key={type} className={`text-center p-3 rounded-xl transition-all ${result.primary === type ? `${DISC_COLORS[type].bg} ${DISC_COLORS[type].text} ring-2 ${DISC_COLORS[type].ring}` : "bg-muted/40 text-muted-foreground"}`}>
                        <span className="block font-display text-xl font-bold">{Math.round(result.percents[type])}%</span>
                        <span className="block text-[10px] font-body font-semibold uppercase tracking-wider mt-0.5">{DISC_LABELS[type]}</span>
                      </div>
                    ))}
                  </div>
                  {(["D", "I", "S", "C"] as DiscType[]).map((type, i) => {
                    const isPrimary = result.primary === type;
                    const colors = DISC_COLORS[type];
                    return (
                      <div key={type} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`font-body text-xs font-semibold flex items-center gap-2 ${isPrimary ? colors.text : "text-muted-foreground"}`}>
                            <span className={`w-2.5 h-2.5 rounded-full ${colors.accent}`} />
                            {DISC_LABELS[type]}
                          </span>
                          <span className={`font-body text-xs font-bold tabular-nums ${isPrimary ? colors.text : "text-muted-foreground"}`}>
                            {Math.round(result.percents[type])}%
                          </span>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${result.percents[type]}%` }}
                            transition={{ duration: 1, delay: 0.5 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                            className={`h-full rounded-full bg-gradient-to-r ${colors.gradient} ${isPrimary ? "opacity-100" : "opacity-40"}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </motion.div>

                {/* ═══ FRASE IDENTIFICATIVA ═══ */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className={`rounded-2xl ${priColors.bg} ${priColors.text} p-6 text-center border-l-4 border-current`}
                >
                  <p className="font-display text-lg md:text-xl italic font-medium leading-relaxed">
                    {pri.frase}
                  </p>
                </motion.div>

                {/* ═══ DESCRIPCIÓN PRINCIPAL ═══ */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 }}
                  className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${priColors.gradient} flex items-center justify-center text-white text-lg`}>
                      {pri.emoji}
                    </span>
                    <div>
                      <p className="font-body text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Tu perfil principal</p>
                      <h3 className="font-display text-xl font-bold text-foreground">{pri.title}</h3>
                    </div>
                  </div>
                  <p className="font-body text-sm text-muted-foreground leading-relaxed">
                    {pri.description}
                  </p>
                </motion.div>

                {/* ═══ FORTALEZAS & MEJORAS ═══ */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  {/* Fortalezas */}
                  <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-5 space-y-3">
                    <p className="font-body text-xs font-bold uppercase tracking-[0.15em] text-emerald-700 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center text-white text-[10px]">✦</span>
                      Fortalezas
                    </p>
                    <ul className="space-y-2">
                      {pri.fortalezas.map((f, i) => (
                        <li key={i} className="font-body text-sm text-emerald-800/80 flex items-start gap-2">
                          <span className="text-emerald-500 mt-0.5 shrink-0 font-bold">•</span>{f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* Áreas de mejora */}
                  <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-5 space-y-3">
                    <p className="font-body text-xs font-bold uppercase tracking-[0.15em] text-amber-700 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-amber-500 flex items-center justify-center text-white text-[10px]">⚡</span>
                      Áreas de mejora
                    </p>
                    <ul className="space-y-2">
                      {pri.mejoras.map((m, i) => (
                        <li key={i} className="font-body text-sm text-amber-800/80 flex items-start gap-2">
                          <span className="text-amber-500 mt-0.5 shrink-0 font-bold">•</span>{m}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>

                {/* ═══ CÓMO ERES EN PAREJA ═══ */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65 }}
                  className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-3"
                >
                  <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                    <Heart className="w-5 h-5 text-disc" /> {name}, así eres en pareja
                  </h3>
                  <p className="font-body text-sm text-muted-foreground leading-relaxed">
                    {pri.enPareja}
                  </p>
                </motion.div>

                {/* ═══ LENGUAJE DEL AMOR ═══ */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="rounded-2xl bg-gradient-to-br from-disc/10 to-disc-glow/10 border-2 border-disc/30 p-6 space-y-3"
                >
                  <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                    💛 Tu lenguaje del amor
                  </h3>
                  <p className="font-body text-sm text-muted-foreground leading-relaxed">
                    {pri.amor}
                  </p>
                  <div className="pt-2 space-y-2">
                    <p className="font-body text-xs font-bold text-foreground uppercase tracking-wider">Lo que necesitas:</p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {pri.necesidades.map((n, i) => (
                        <li key={i} className="font-body text-sm text-muted-foreground flex items-start gap-2 bg-background/60 rounded-xl p-3 border border-disc/10">
                          <span className="text-disc shrink-0 font-bold">→</span>{n}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>

                {/* ═══ GESTIÓN DE CONFLICTOS ═══ */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.75 }}
                  className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-3"
                >
                  <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                    <Zap className="w-5 h-5 text-disc" /> Cómo gestionas los conflictos
                  </h3>
                  <p className="font-body text-sm text-muted-foreground leading-relaxed">
                    {pri.conflicto}
                  </p>
                </motion.div>

                {/* ═══ PERFIL SECUNDARIO ═══ */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className={`rounded-2xl ${secColors.bg} ${secColors.text} p-6 space-y-4 border-2`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${secColors.gradient} flex items-center justify-center text-white text-lg`}>
                      {sec.emoji}
                    </span>
                    <div>
                      <p className="font-body text-[10px] uppercase tracking-[0.15em] opacity-60">Tu perfil secundario</p>
                      <h3 className="font-display text-xl font-bold">{sec.title}</h3>
                    </div>
                  </div>
                  <p className="font-body text-sm opacity-80 leading-relaxed">
                    {sec.description}
                  </p>
                  <div className="rounded-xl bg-background/40 p-4 space-y-1">
                    <p className="font-body text-xs font-bold uppercase tracking-wider opacity-70">Influencia secundaria en tu relación</p>
                    <p className="font-body text-sm opacity-80 leading-relaxed">
                      {sec.enPareja}
                    </p>
                  </div>
                </motion.div>

                {/* ═══ RECOMENDACIONES DE COMPATIBILIDAD ═══ */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.85 }}
                  className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4"
                >
                  <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-disc" /> Recomendaciones para {name}
                  </h3>
                  <div className="grid gap-3">
                    <div className="rounded-xl bg-muted/40 p-4 border-l-4 border-disc">
                      <p className="font-body text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">🗣 Estilo de comunicación ideal</p>
                      <p className="font-body text-sm text-muted-foreground leading-relaxed">{pri.comunicacion}</p>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-4 border-l-4 border-primary">
                      <p className="font-body text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">🎯 Actividades en pareja</p>
                      <p className="font-body text-sm text-muted-foreground leading-relaxed">{pri.actividades}</p>
                    </div>
                    <div className={`rounded-xl ${priColors.bg} p-4 border-l-4 border-current ${priColors.text}`}>
                      <p className="font-body text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">💫 Compatibilidad ideal</p>
                      <p className="font-body text-sm opacity-80 leading-relaxed">{pri.compatibility}</p>
                    </div>
                  </div>
                </motion.div>


                {/* ═══ CALENDLY — SESIÓN GRATUITA ═══ */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="rounded-2xl bg-gradient-to-br from-disc/10 to-disc-glow/10 border-2 border-disc/20 p-6 space-y-4"
                >
                  <div className="text-center space-y-2">
                    <p className="font-body text-sm font-bold text-disc uppercase tracking-[0.2em]">🎁 Sesión <span className="text-2xl">gratuita</span></p>
                    <h3 className="font-display text-xl font-bold text-foreground">
                      ¡{name}, reserva tu sesión de descubrimiento!
                    </h3>
                    <p className="font-body text-sm text-muted-foreground">
                      Habla con nuestro equipo y descubre cómo encontrar tu pareja ideal 💛
                    </p>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-border">
                    <iframe
                      src="https://calendly.com/equipo-afin/30min"
                      width="100%"
                      height="650"
                      frameBorder="0"
                      title="Reservar sesión gratuita"
                      className="w-full"
                    />
                  </div>
                </motion.div>

                {/* ═══ CTA FINAL ═══ */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.1 }}
                  className="flex flex-col sm:flex-row gap-3 pt-2"
                >
                  <button
                    onClick={() => generateDiscPdf({ userName: name, primary: result.primary, secondary: result.secondary, percents: result.percents, pri, sec })}
                    className="flex-1 group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-disc to-disc-glow text-white font-body font-semibold text-sm shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4" />
                    Descargar mi informe PDF
                  </button>
                  <button
                    onClick={() => navigate("/")}
                    className="flex-1 inline-flex items-center justify-center px-6 py-3.5 rounded-full border border-border bg-card text-foreground font-body font-medium text-sm hover:bg-muted transition-colors"
                  >
                    Volver al inicio
                  </button>
                </motion.div>
              </motion.div>
              );
            })()}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
};

export default DiscQuiz;
