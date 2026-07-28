import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, User, Heart, Sliders, MessageCircle, PenLine, Brain, Shield, Check, Sparkles, Zap, Target, Sun, Download, Crown } from "lucide-react";
import jsPDF from "jspdf";
import { generateDiscPdf } from "@/lib/generateDiscPdf";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PlanBookingDialog from "@/components/PlanBookingDialog";
import { calculateDisc, type DiscResult } from "@/components/DiscSurvey";

type DiscType = "D" | "I" | "S" | "C";

const TIPO_RELACION = ["Matrimonio", "Relación estable", "Relación sin convivencia", "Casual"];
const HIJOS = ["Tengo", "No tengo", "Quiero tener", "No quiero tener"];
const TABACO = ["Sí", "Ocasional", "No"];
const CONFLICTO_OPTIONS = ["Dialogar", "Necesito tiempo", "Evitar conflicto", "Enfrentar directamente"];
const QUERIDO_OPTIONS = ["Palabras", "Tiempo de calidad", "Contacto físico", "Proyectos compartidos", "Admiración"];

const ESCALA_LABELS = [
  { key: "deseo_familia", label: "Deseo de formar familia", emoji: "👨‍👩‍👧" },
  { key: "ambicion_profesional", label: "Ambición profesional", emoji: "🚀" },
  { key: "nivel_social", label: "Nivel social", emoji: "🎉" },
  { key: "estilo_vida_activo", label: "Estilo de vida activo", emoji: "🏃" },
  { key: "necesidad_independencia", label: "Necesidad de independencia", emoji: "🦅" },
] as const;

type ScaleKey = typeof ESCALA_LABELS[number]["key"];

const DISC_QUESTIONS = [
  {
    question: "Cuando hay un desacuerdo con tu pareja, ¿cómo reaccionas?",
    options: [
      { text: "Hablo claro y directo", disc: "D" as DiscType },
      { text: "Busco suavizar la situación", disc: "I" as DiscType },
      { text: "Mantengo la calma y escucho", disc: "S" as DiscType },
      { text: "Analizo antes de responder", disc: "C" as DiscType },
    ],
  },
  {
    question: "En momentos románticos, ¿qué disfrutas más?",
    options: [
      { text: "Planear actividades emocionantes", disc: "D" as DiscType },
      { text: "Socializar y compartir emociones", disc: "I" as DiscType },
      { text: "Momentos tranquilos y constantes", disc: "S" as DiscType },
      { text: "Detalles bien pensados y cuidados", disc: "C" as DiscType },
    ],
  },
  {
    question: "Cuando tu pareja propone un plan inesperado:",
    options: [
      { text: "Me adapto rápido y decido", disc: "D" as DiscType },
      { text: "Me entusiasmo y participo", disc: "I" as DiscType },
      { text: "Prefiero seguridad y rutina", disc: "S" as DiscType },
      { text: "Evalúo opciones antes de decidir", disc: "C" as DiscType },
    ],
  },
  {
    question: "Al expresar tus sentimientos:",
    options: [
      { text: "Soy directo y honesto", disc: "D" as DiscType },
      { text: "Soy expresivo y entusiasta", disc: "I" as DiscType },
      { text: "Soy paciente y reflexivo", disc: "S" as DiscType },
      { text: "Comunico con precisión y detalle", disc: "C" as DiscType },
    ],
  },
  {
    question: "¿Cómo manejas los conflictos cotidianos?",
    options: [
      { text: "Enfrento y busco solución", disc: "D" as DiscType },
      { text: "Trato de convencer y dialogar", disc: "I" as DiscType },
      { text: "Busco consenso y armonía", disc: "S" as DiscType },
      { text: "Analizo la situación antes de actuar", disc: "C" as DiscType },
    ],
  },
  {
    question: "En una relación, lo que más valoras:",
    options: [
      { text: "Decisión y liderazgo compartido", disc: "D" as DiscType },
      { text: "Diversión, conexión y energía", disc: "I" as DiscType },
      { text: "Estabilidad y confianza", disc: "S" as DiscType },
      { text: "Planeación, estructura y detalle", disc: "C" as DiscType },
    ],
  },
  {
    question: "¿Cómo reaccionas ante cambios importantes?",
    options: [
      { text: "Tomo acción inmediata", disc: "D" as DiscType },
      { text: "Me adapto con entusiasmo", disc: "I" as DiscType },
      { text: "Prefiero cambios graduales", disc: "S" as DiscType },
      { text: "Evalúo antes de actuar", disc: "C" as DiscType },
    ],
  },
  {
    question: "Proyecto ideal en pareja:",
    options: [
      { text: "Aventuras y retos juntos", disc: "D" as DiscType },
      { text: "Momentos sociales y divertidos", disc: "I" as DiscType },
      { text: "Rutina estable y segura", disc: "S" as DiscType },
      { text: "Planificación y detalles cuidados", disc: "C" as DiscType },
    ],
  },
];

const BUSCA_GENERO = ["Hombre", "Mujer", "Ambos"];
const GENERO_OPTIONS = ["Hombre", "Mujer", "Otro"];

interface FormData {
  nombre_completo: string;
  email: string;
  telefono: string;
  edad: string;
  ciudad: string;
  estatura: string;
  peso: string;
  tipo_relacion: string;
  hijos: string;
  tabaco: string;
  busca_genero: string;
  genero: string;
  edad_min_busca: string;
  edad_max_busca: string;
  deseo_familia: number;
  ambicion_profesional: number;
  nivel_social: number;
  estilo_vida_activo: number;
  necesidad_independencia: number;
  conflicto: string[];
  sentirse_querido: string[];
  relacion_sana: string;
  aprendizaje_ultima_relacion: string;
  vida_en_10_anios: string;
  fin_de_semana: string;
  hobbies: string;
  disc_answers: Record<number, DiscType>;
  importa_vestir: string;
  estilo_vestir: string;
  estilo_vestir_pareja: string;
  importa_politica: string;
  politica_pareja: string;
  tiene_tatuajes: string;
  tatuajes_pareja: string;
  religion: string;
  importa_religion: string;
  religion_pareja: string;
  ideologia: string;
  alcohol: string;
  desea_casarse: string;
  foto_url: string;
}

const initialForm: FormData = {
  nombre_completo: "", email: "", telefono: "", edad: "", ciudad: "", estatura: "", peso: "", tipo_relacion: "", hijos: "", tabaco: "", busca_genero: "", genero: "",
  edad_min_busca: "", edad_max_busca: "",
  deseo_familia: 3, ambicion_profesional: 3, nivel_social: 3, estilo_vida_activo: 3, necesidad_independencia: 3,
  conflicto: [], sentirse_querido: [],
  relacion_sana: "", aprendizaje_ultima_relacion: "", vida_en_10_anios: "", fin_de_semana: "", hobbies: "",
  disc_answers: {},
  importa_vestir: "", estilo_vestir: "", estilo_vestir_pareja: "",
  importa_politica: "", politica_pareja: "",
  tiene_tatuajes: "", tatuajes_pareja: "",
  religion: "", importa_religion: "", religion_pareja: "",
  ideologia: "", alcohol: "", desea_casarse: "", foto_url: "",
};

const RELIGION_OPTIONS = ["Cristianismo", "Catolicismo", "Islam", "Judaísmo", "Budismo", "Hinduismo", "Agnóstico", "Ateo", "Espiritual", "Otra"];
const ALCOHOL_OPTIONS = ["Nunca", "Ocasional", "Social", "Habitual"];
const CASARSE_OPTIONS = ["Sí, lo deseo", "No quiero casarme", "Me da igual"];

// Steps: 0=intro, 1=datos, 2=estilo, 3=preferencias, 4=escala, 5=emocional, 6=abiertas, 7=disc(1-4), 8=disc(5-8), 9=consent, 10=success
const STEPS = [
  { label: "Inicio", icon: Heart },
  { label: "Datos", icon: User },
  { label: "Estilo", icon: Heart },
  { label: "Preferencias", icon: Sparkles },
  { label: "Valores", icon: Sliders },
  { label: "Emociones", icon: MessageCircle },
  { label: "Reflexiones", icon: PenLine },
  { label: "DISC 1-4", icon: Brain },
  { label: "DISC 5-8", icon: Brain },
  { label: "Enviar", icon: Shield },
];

const TOTAL_STEPS = STEPS.length;

const pageVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

const Perfil = () => {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [form, setForm] = useState<FormData>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [consent, setConsent] = useState(false);
  const [discResult, setDiscResult] = useState<DiscResult | null>(null);
  const [bookingPlan, setBookingPlan] = useState<"esencial" | "premium" | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const update = (field: keyof FormData, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const toggleMulti = (field: "conflicto" | "sentirse_querido", value: string) => {
    setForm((prev) => {
      const arr = prev[field];
      return { ...prev, [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  };

  const goNext = useCallback(() => { setDirection(1); setStep((s) => Math.min(s + 1, TOTAL_STEPS)); }, []);
  const goBack = useCallback(() => { setDirection(-1); setStep((s) => Math.max(s - 1, 0)); }, []);

  const validateStep = (): string | null => {
    switch (step) {
      case 1:
        if (!form.nombre_completo.trim()) return "El nombre es obligatorio";
        if (form.nombre_completo.trim().length > 100) return "Máximo 100 caracteres";
        if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Introduce un email válido";
        if (!form.telefono.trim() || form.telefono.trim().length < 6) return "Introduce un teléfono válido";
        const edad = parseInt(form.edad);
        if (!form.edad || isNaN(edad) || edad < 18 || edad > 99) return "La edad debe ser entre 18 y 99";
        if (!form.ciudad.trim()) return "La ciudad es obligatoria";
        if (!form.genero) return "Selecciona tu género";
        return null;
      case 2:
        if (!form.tipo_relacion) return "Selecciona el tipo de relación";
        if (!form.busca_genero) return "Selecciona a quién buscas";
        if (!form.hijos) return "Selecciona tu situación respecto a hijos";
        if (!form.tabaco) return "Selecciona tu relación con el tabaco";
        const eMin = parseInt(form.edad_min_busca);
        const eMax = parseInt(form.edad_max_busca);
        if (!form.edad_min_busca || isNaN(eMin) || eMin < 18) return "Edad mínima debe ser al menos 18";
        if (!form.edad_max_busca || isNaN(eMax) || eMax > 99 || eMax < eMin) return "Edad máxima inválida";
        return null;
      case 3:
        if (!form.importa_vestir) return "Indica si te importa la forma de vestir";
        if (form.importa_vestir === "si" && !form.estilo_vestir) return "Selecciona tu estilo al vestir";
        if (form.importa_vestir === "si" && !form.estilo_vestir_pareja) return "Selecciona el estilo que prefieres en tu pareja";
        if (!form.importa_politica) return "Indica si te importa la política";
        if (form.importa_politica === "si" && !form.politica_pareja) return "Selecciona la ideología que prefieres";
        if (!form.tiene_tatuajes) return "Indica si tienes tatuajes";
        if (form.tiene_tatuajes === "no" && !form.tatuajes_pareja) return "Indica tu preferencia sobre tatuajes en tu pareja";
        return null;
      case 5:
        if (form.conflicto.length === 0) return "Selecciona al menos una opción en conflictos";
        if (form.sentirse_querido.length === 0) return "Selecciona al menos una opción";
        return null;
      case 6:
        if (!form.relacion_sana.trim()) return "Responde sobre relación sana";
        if (!form.fin_de_semana.trim()) return "Responde sobre tu fin de semana";
        if (!form.hobbies.trim()) return "Responde sobre tus hobbies";
        return null;
      case 7: {
        const answered = [0,1,2,3].filter(i => form.disc_answers[i] !== undefined).length;
        if (answered < 4) return "Completa las 4 preguntas de esta sección";
        return null;
      }
      case 8: {
        const answered = [4,5,6,7].filter(i => form.disc_answers[i] !== undefined).length;
        if (answered < 4) return "Completa las 4 preguntas de esta sección";
        return null;
      }
      case 9:
        if (!consent) return "Debes aceptar la política de privacidad";
        return null;
      default: return null;
    }
  };

  const handleNext = () => {
    const error = validateStep();
    if (error) {
      toast({ title: "Campos incompletos", description: error, variant: "destructive" });
      return;
    }
    goNext();
  };

  const handleSubmit = async () => {
    const error = validateStep();
    if (error) {
      toast({ title: "Campos incompletos", description: error, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const disc = calculateDisc(form.disc_answers);
    const { error: dbError } = await supabase.from("perfiles").insert({
      nombre_completo: form.nombre_completo.trim(),
      email: form.email.trim(),
      telefono: form.telefono.trim(),
      edad: parseInt(form.edad),
      ciudad: form.ciudad.trim(),
      tipo_relacion: form.tipo_relacion,
      busca_genero: form.busca_genero,
      genero: form.genero,
      hijos: form.hijos,
      tabaco: form.tabaco,
      edad_min_busca: parseInt(form.edad_min_busca),
      edad_max_busca: parseInt(form.edad_max_busca),
      deseo_familia: form.deseo_familia,
      ambicion_profesional: form.ambicion_profesional,
      nivel_social: form.nivel_social,
      estilo_vida_activo: form.estilo_vida_activo,
      necesidad_independencia: form.necesidad_independencia,
      conflicto: form.conflicto,
      sentirse_querido: form.sentirse_querido,
      relacion_sana: form.relacion_sana.trim(),
      aprendizaje_ultima_relacion: form.aprendizaje_ultima_relacion.trim(),
      vida_en_10_anios: form.vida_en_10_anios.trim(),
      fin_de_semana: form.fin_de_semana.trim() || null,
      hobbies: form.hobbies.trim() || null,
      estatura: form.estatura ? parseInt(form.estatura) : null,
      peso: form.peso ? parseInt(form.peso) : null,
      importa_vestir: form.importa_vestir === "si" ? true : form.importa_vestir === "no" ? false : null,
      estilo_vestir: form.estilo_vestir || null,
      estilo_vestir_pareja: form.estilo_vestir_pareja || null,
      importa_politica: form.importa_politica === "si" ? true : form.importa_politica === "no" ? false : null,
      politica_pareja: form.politica_pareja || null,
      tiene_tatuajes: form.tiene_tatuajes === "si" ? true : form.tiene_tatuajes === "no" ? false : null,
      tatuajes_pareja: form.tatuajes_pareja || null,
      religion: form.religion || null,
      importa_religion: form.importa_religion === "si",
      religion_pareja: form.importa_religion === "si" ? (form.religion_pareja || null) : null,
      ideologia: form.ideologia || null,
      alcohol: form.alcohol || null,
      desea_casarse: form.desea_casarse || null,
      foto_url: form.foto_url || null,
      disc_respuestas: disc.respuestas,
      disc_perfil: disc.perfil,
    } as any);
    setSubmitting(false);
    if (dbError) {
      toast({ title: "Error", description: "No se pudo guardar. Inténtalo de nuevo.", variant: "destructive" });
      return;
    }
    setDiscResult(disc);
    goNext();
  };

  const progressPercent = step > 0 && step < TOTAL_STEPS ? (step / (TOTAL_STEPS - 1)) * 100 : step >= TOTAL_STEPS ? 100 : 0;

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

          {step > 0 && step < TOTAL_STEPS && (
            <span className="text-xs font-body font-medium text-muted-foreground tracking-wide uppercase">
              {step} / {TOTAL_STEPS - 1}
            </span>
          )}

          <a href="/" className="font-display text-lg font-bold text-foreground tracking-tight">Afín</a>
        </div>

        {step > 0 && step < TOTAL_STEPS && (
          <div className="h-1 bg-muted">
            <motion.div
              className="h-full bg-gradient-to-r from-gold-vivid to-gold rounded-r-full"
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-5 py-8 overflow-y-auto">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait" custom={direction}>

            {/* STEP 0: Intro */}
            {step === 0 && (
              <StepWrapper key="intro" direction={direction}>
                <div className="text-center space-y-8">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15, type: "spring" as const, stiffness: 200 }}
                    className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gold-vivid/20 to-gold/10 flex items-center justify-center mx-auto shadow-lg"
                  >
                    <Heart className="w-10 h-10 text-gold-vivid" />
                  </motion.div>

                  <div className="space-y-3">
                    <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground leading-tight">
                      Tu <span className="text-gradient-gold italic font-normal">DNI del amor</span>
                    </h1>
                    <p className="font-body text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
                      No es un formulario cualquiera. Es el primer paso para encontrar a tu persona.
                    </p>
                  </div>

                  <div className="bg-foreground rounded-2xl border border-border/60 p-5 text-left space-y-4 max-w-sm mx-auto">
                    <p className="font-body text-sm text-background leading-relaxed">
                      Sabemos que este cuestionario requiere un poquito de tu tiempo, <span className="font-semibold">¡pero vale totalmente la pena!</span>
                    </p>
                    <p className="font-body text-sm text-background leading-relaxed">
                      Queremos acercarnos lo máximo posible a tu perfil ideal, y para eso necesitamos <span className="font-semibold">respuestas sinceras y dedicación</span>.
                    </p>
                    <p className="font-body text-sm text-background leading-relaxed font-semibold">
                      Relájate, disfrútalo y recuerda: cada respuesta nos acerca más a la persona que buscas.
                    </p>
                    <p className="font-body text-sm text-background leading-relaxed font-bold mt-2">
                      🙏 ¡Por favor, ten paciencia al responderlo!
                    </p>
                  </div>

                  <div className="space-y-4">
                    <button
                      onClick={goNext}
                      className="group inline-flex items-center gap-3 px-10 py-4 rounded-full bg-gradient-to-r from-gold-vivid to-gold text-white font-body font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Comenzar <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                    <div className="flex items-center justify-center gap-6 text-xs font-body text-muted-foreground">
                      <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />5 min</span>
                      <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />9 secciones</span>
                      <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Confidencial</span>
                    </div>
                  </div>
                </div>
              </StepWrapper>
            )}

            {/* STEP 1: Datos básicos */}
            {step === 1 && (
              <StepWrapper key="datos" direction={direction}>
                <StepHeader icon={<User className="w-6 h-6" />} title="Datos básicos" subtitle="Cuéntanos un poco sobre ti" />
                <div className="space-y-5 mt-8">
                  <FieldGroup label="Nombre completo *">
                    <Input value={form.nombre_completo} onChange={(e) => update("nombre_completo", e.target.value)} maxLength={100} placeholder="Tu nombre completo" className="rounded-xl h-12 bg-card" />
                  </FieldGroup>
                  <FieldGroup label="Email *">
                    <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} maxLength={255} placeholder="tu@email.com" className="rounded-xl h-12 bg-card" />
                  </FieldGroup>
                  <FieldGroup label="Teléfono *">
                    <Input type="tel" value={form.telefono} onChange={(e) => update("telefono", e.target.value)} maxLength={20} placeholder="+34 600 000 000" className="rounded-xl h-12 bg-card" />
                  </FieldGroup>
                  <div className="grid grid-cols-2 gap-4">
                    <FieldGroup label="Edad *">
                      <Input type="number" value={form.edad} onChange={(e) => update("edad", e.target.value)} min={18} max={99} placeholder="Ej: 32" className="rounded-xl h-12 bg-card" />
                    </FieldGroup>
                    <FieldGroup label="Ciudad *">
                      <Input value={form.ciudad} onChange={(e) => update("ciudad", e.target.value)} maxLength={100} placeholder="Ej: Madrid" className="rounded-xl h-12 bg-card" />
                    </FieldGroup>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FieldGroup label="Estatura (cm)">
                      <Input type="number" value={form.estatura} onChange={(e) => update("estatura", e.target.value)} min={100} max={250} placeholder="Ej: 175" className="rounded-xl h-12 bg-card" />
                    </FieldGroup>
                    <FieldGroup label="Peso (kg)">
                      <Input type="number" value={form.peso} onChange={(e) => update("peso", e.target.value)} min={30} max={300} placeholder="Ej: 70" className="rounded-xl h-12 bg-card" />
                    </FieldGroup>
                  <PillSelector label="¿Cuál es tu género? *" options={GENERO_OPTIONS} value={form.genero} onChange={(v) => update("genero", v)} />
                  </div>
                  <FieldGroup label="Foto de perfil (opcional)">
                    <div className="flex items-center gap-3">
                      {form.foto_url && (
                        <img src={form.foto_url} alt="" className="w-16 h-16 rounded-full object-cover border border-border" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) {
                            toast({ title: "Foto demasiado grande", description: "Máximo 5 MB", variant: "destructive" });
                            return;
                          }
                          const ext = file.name.split(".").pop() || "jpg";
                          const path = `${crypto.randomUUID()}.${ext}`;
                          const { error } = await supabase.storage.from("fotos-perfil").upload(path, file, { cacheControl: "3600", upsert: false });
                          if (error) {
                            toast({ title: "Error al subir foto", description: error.message, variant: "destructive" });
                            return;
                          }
                          const { data } = supabase.storage.from("fotos-perfil").getPublicUrl(path);
                          update("foto_url", data.publicUrl);
                        }}
                        className="text-sm font-body text-muted-foreground file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-gold/15 file:text-foreground file:font-medium hover:file:bg-gold/25"
                      />
                    </div>
                  </FieldGroup>
                </div>
                <NextButton onClick={handleNext} />
              </StepWrapper>
            )}

            {/* STEP 2: Estilo de vida */}
            {step === 2 && (
              <StepWrapper key="estilo" direction={direction}>
                <StepHeader icon={<Heart className="w-6 h-6" />} title="Estilo de vida" subtitle="¿Qué buscas y cómo vives?" />
                <div className="space-y-6 mt-8">
                  <PillSelector label="¿Qué tipo de relación buscas? *" options={TIPO_RELACION} value={form.tipo_relacion} onChange={(v) => update("tipo_relacion", v)} />
                  <PillSelector label="¿A quién buscas? *" options={BUSCA_GENERO} value={form.busca_genero} onChange={(v) => update("busca_genero", v)} />
                  <PillSelector label="Hijos *" options={HIJOS} value={form.hijos} onChange={(v) => update("hijos", v)} />
                  <PillSelector label="Tabaco *" options={TABACO} value={form.tabaco} onChange={(v) => update("tabaco", v)} />
                  <FieldGroup label="Rango de edad que buscas *">
                    <div className="grid grid-cols-2 gap-4">
                      <Input type="number" value={form.edad_min_busca} onChange={(e) => update("edad_min_busca", e.target.value)} min={18} max={99} placeholder="Mínima" className="rounded-xl h-12 bg-card" />
                      <Input type="number" value={form.edad_max_busca} onChange={(e) => update("edad_max_busca", e.target.value)} min={18} max={99} placeholder="Máxima" className="rounded-xl h-12 bg-card" />
                    </div>
                  </FieldGroup>
                </div>
                <NextButton onClick={handleNext} />
              </StepWrapper>
            )}

            {/* STEP 3: Preferencias (Vestir, Política, Tatuajes) */}
            {step === 3 && (
              <StepWrapper key="preferencias" direction={direction}>
                <StepHeader icon={<Sparkles className="w-6 h-6" />} title="Preferencias" subtitle="Detalles que marcan la diferencia" />
                <div className="space-y-6 mt-8">
                  {/* Bloque 1: Forma de vestir */}
                  <div className="bg-card rounded-2xl p-5 border border-border shadow-sm space-y-4">
                    <p className="font-body text-sm font-semibold text-foreground">1. Forma de vestir</p>
                    <PillSelector label="¿Te importa la forma de vestir? *" options={["Sí, me fijo bastante", "No, no me importa"]} value={form.importa_vestir === "si" ? "Sí, me fijo bastante" : form.importa_vestir === "no" ? "No, no me importa" : ""} onChange={(v) => update("importa_vestir", v === "Sí, me fijo bastante" ? "si" : "no")} />
                    {form.importa_vestir === "si" && (
                      <>
                        <PillSelector label="¿Cómo te gusta vestirte normalmente?" options={["Arreglado/a", "Casual / cómodo/a", "Deportivo/a / activo/a"]} value={form.estilo_vestir} onChange={(v) => update("estilo_vestir", v)} />
                        <PillSelector label="¿Cómo te gustaría que se vistiera tu pareja?" options={["Arreglado/a", "Casual / cómodo/a", "Deportivo/a / activo/a"]} value={form.estilo_vestir_pareja} onChange={(v) => update("estilo_vestir_pareja", v)} />
                      </>
                    )}
                  </div>

                  {/* Bloque 2: Política */}
                  <div className="bg-card rounded-2xl p-5 border border-border shadow-sm space-y-4">
                    <p className="font-body text-sm font-semibold text-foreground">2. Política en la pareja</p>
                    <PillSelector label="¿Te importa la ideología política de tu pareja? *" options={["Sí, me importa", "No, no me importa"]} value={form.importa_politica === "si" ? "Sí, me importa" : form.importa_politica === "no" ? "No, no me importa" : ""} onChange={(v) => update("importa_politica", v === "Sí, me importa" ? "si" : "no")} />
                    {form.importa_politica === "si" && (
                      <PillSelector label="¿Qué ideales te gustaría que tuviera tu pareja?" options={["Derechas", "Izquierdas", "Centro"]} value={form.politica_pareja} onChange={(v) => update("politica_pareja", v)} />
                    )}
                  </div>

                  {/* Bloque 3: Tatuajes */}
                  <div className="bg-card rounded-2xl p-5 border border-border shadow-sm space-y-4">
                    <p className="font-body text-sm font-semibold text-foreground">3. Tatuajes</p>
                    <PillSelector label="¿Tienes tatuajes? *" options={["Sí", "No"]} value={form.tiene_tatuajes === "si" ? "Sí" : form.tiene_tatuajes === "no" ? "No" : ""} onChange={(v) => update("tiene_tatuajes", v === "Sí" ? "si" : "no")} />
                    {form.tiene_tatuajes === "no" && (
                      <PillSelector label="¿Te gustaría que tu pareja tuviera tatuajes?" options={["Sí", "No", "Me da igual"]} value={form.tatuajes_pareja} onChange={(v) => update("tatuajes_pareja", v)} />
                    )}
                  </div>

                  {/* Bloque 4: Religión */}
                  <div className="bg-card rounded-2xl p-5 border border-border shadow-sm space-y-4">
                    <p className="font-body text-sm font-semibold text-foreground">4. Religión</p>
                    <PillSelector label="¿Cuál es tu religión o creencia?" options={RELIGION_OPTIONS} value={form.religion} onChange={(v) => update("religion", v)} />
                    <PillSelector label="¿Te importa que tu pareja comparta tu religión?" options={["Sí, mucho", "No, me da igual"]} value={form.importa_religion === "si" ? "Sí, mucho" : form.importa_religion === "no" ? "No, me da igual" : ""} onChange={(v) => update("importa_religion", v === "Sí, mucho" ? "si" : "no")} />
                    {form.importa_religion === "si" && (
                      <PillSelector label="¿Qué religión prefieres en tu pareja?" options={RELIGION_OPTIONS} value={form.religion_pareja} onChange={(v) => update("religion_pareja", v)} />
                    )}
                  </div>

                  {/* Bloque 5: Ideología */}
                  <div className="bg-card rounded-2xl p-5 border border-border shadow-sm space-y-4">
                    <p className="font-body text-sm font-semibold text-foreground">5. Ideología</p>
                    <PillSelector label="¿Cómo describirías tu ideología?" options={["Derechas", "Izquierdas", "Centro"]} value={form.ideologia} onChange={(v) => update("ideologia", v)} />
                  </div>

                  {/* Bloque 6: Alcohol */}
                  <div className="bg-card rounded-2xl p-5 border border-border shadow-sm space-y-4">
                    <p className="font-body text-sm font-semibold text-foreground">6. Alcohol</p>
                    <PillSelector label="¿Cuál es tu relación con el alcohol?" options={ALCOHOL_OPTIONS} value={form.alcohol} onChange={(v) => update("alcohol", v)} />
                  </div>

                  {/* Bloque 7: Matrimonio */}
                  <div className="bg-card rounded-2xl p-5 border border-border shadow-sm space-y-4">
                    <p className="font-body text-sm font-semibold text-foreground">7. Matrimonio</p>
                    <PillSelector label="¿Deseas casarte?" options={CASARSE_OPTIONS} value={form.desea_casarse} onChange={(v) => update("desea_casarse", v)} />
                  </div>
                </div>
                <NextButton onClick={handleNext} />
              </StepWrapper>
            )}

            {/* STEP 4: Escala de valores */}
            {step === 4 && (
              <StepWrapper key="escala" direction={direction}>
                <StepHeader icon={<Sliders className="w-6 h-6" />} title="Escala de valores" subtitle="¿Qué importancia le das a cada aspecto?" />
                <div className="space-y-6 mt-8">
                  {ESCALA_LABELS.map(({ key, label, emoji }) => (
                    <div key={key} className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-body text-sm font-medium text-foreground flex items-center gap-2">
                          <span>{emoji}</span> {label}
                        </span>
                        <span className="font-body text-sm font-bold text-gold tabular-nums">{form[key]}/5</span>
                      </div>
                      <input
                        type="range" min={1} max={5} step={1}
                        value={form[key]}
                        onChange={(e) => update(key, parseInt(e.target.value))}
                        className="w-full accent-[hsl(var(--ring))] h-2 rounded-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground font-body mt-1.5">
                        <span>Poco</span><span>Mucho</span>
                      </div>
                    </div>
                  ))}
                </div>
                <NextButton onClick={handleNext} />
              </StepWrapper>
            )}

            {/* STEP 5: Emocional */}
            {step === 5 && (
              <StepWrapper key="emocional" direction={direction}>
                <StepHeader icon={<MessageCircle className="w-6 h-6" />} title="Perfil emocional" subtitle="¿Cómo vives tus emociones en pareja?" />
                <div className="space-y-6 mt-8">
                  <MultiPillSelector label="En un conflicto tiendo a... *" options={CONFLICTO_OPTIONS} selected={form.conflicto} onToggle={(v) => toggleMulti("conflicto", v)} />
                  <MultiPillSelector label="Para sentirme querido/a necesito... *" options={QUERIDO_OPTIONS} selected={form.sentirse_querido} onToggle={(v) => toggleMulti("sentirse_querido", v)} />
                </div>
                <NextButton onClick={handleNext} />
              </StepWrapper>
            )}

            {/* STEP 6: Preguntas abiertas */}
            {step === 6 && (
              <StepWrapper key="abiertas" direction={direction}>
                <StepHeader icon={<PenLine className="w-6 h-6" />} title="Reflexiones" subtitle="Tómate tu tiempo para responder" />
                <div className="space-y-5 mt-8">
                  <TextAreaField label="¿Qué significa para ti una relación sana? *" value={form.relacion_sana} onChange={(v) => update("relacion_sana", v)} />
                  <TextAreaField label="¿Cómo sería un fin de semana normal para ti? *" value={form.fin_de_semana} onChange={(v) => update("fin_de_semana", v)} />
                  <TextAreaField label="¿Cuáles son tus hobbies e intereses? *" value={form.hobbies} onChange={(v) => update("hobbies", v)} />
                </div>
                <NextButton onClick={handleNext} />
              </StepWrapper>
            )}

            {/* STEP 7: DISC 1-4 */}
            {step === 7 && (
              <StepWrapper key="disc1" direction={direction}>
                <StepHeader icon={<Brain className="w-6 h-6" />} title="Test DISC (1/2)" subtitle="Selecciona la opción que más te identifique" />
                <div className="space-y-6 mt-8">
                  {DISC_QUESTIONS.slice(0, 4).map((q, qi) => (
                    <DiscQuestionCard key={qi} index={qi} question={q.question} options={q.options} selected={form.disc_answers[qi]} onSelect={(disc) => setForm(prev => ({ ...prev, disc_answers: { ...prev.disc_answers, [qi]: disc } }))} />
                  ))}
                </div>
                <NextButton onClick={handleNext} />
              </StepWrapper>
            )}

            {/* STEP 8: DISC 5-8 */}
            {step === 8 && (
              <StepWrapper key="disc2" direction={direction}>
                <StepHeader icon={<Brain className="w-6 h-6" />} title="Test DISC (2/2)" subtitle="Casi terminamos, últimas preguntas" />
                <div className="space-y-6 mt-8">
                  {DISC_QUESTIONS.slice(4, 8).map((q, qi) => (
                    <DiscQuestionCard key={qi + 4} index={qi + 4} question={q.question} options={q.options} selected={form.disc_answers[qi + 4]} onSelect={(disc) => setForm(prev => ({ ...prev, disc_answers: { ...prev.disc_answers, [qi + 4]: disc } }))} />
                  ))}
                </div>
                <NextButton onClick={handleNext} />
              </StepWrapper>
            )}

            {/* STEP 9: Consent & Submit */}
            {step === 9 && (
              <StepWrapper key="consent" direction={direction}>
                <StepHeader icon={<Shield className="w-6 h-6" />} title="Último paso" subtitle="Revisa y envía tu perfil" />
                <div className="mt-8 space-y-6">
                  <div className="bg-card rounded-2xl p-6 border border-border shadow-sm space-y-3">
                    <p className="font-body text-sm text-foreground font-medium">Resumen de tu perfil</p>
                    <div className="grid grid-cols-2 gap-3 text-sm font-body">
                      <SummaryItem label="Nombre" value={form.nombre_completo} />
                      <SummaryItem label="Edad" value={form.edad} />
                      <SummaryItem label="Ciudad" value={form.ciudad} />
                      <SummaryItem label="Relación" value={form.tipo_relacion} />
                      <SummaryItem label="Preguntas DISC" value={`${Object.keys(form.disc_answers).length}/8`} />
                    </div>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer bg-card rounded-2xl p-5 border border-border">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 w-5 h-5 accent-[hsl(var(--ring))] rounded" />
                    <span className="font-body text-sm text-muted-foreground leading-relaxed">
                      He leído y acepto la{" "}
                      <a href="/privacidad" target="_blank" className="text-gold underline hover:opacity-80">política de privacidad</a>
                      {" "}y los{" "}
                      <a href="/terminos" target="_blank" className="text-gold underline hover:opacity-80">términos y condiciones</a>.
                    </span>
                  </label>

                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full group inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-gold-vivid to-gold text-white font-body font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full inline-block" />
                    ) : (
                      <>Enviar perfil <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" /></>
                    )}
                  </button>
                </div>
              </StepWrapper>
            )}

            {/* STEP 9: Success + DISC Report */}
            {step >= TOTAL_STEPS && (() => {
              const DISC_META: Record<DiscType, { title: string; emoji: string; description: string; bg: string; text: string; gradient: string; ring: string; fortalezas: string[]; mejoras: string[]; enPareja: string; amor: string; necesidades: string[]; conflicto: string; frase: string; compatibility: string; comunicacion: string; actividades: string }> = {
                D: { title: "Dominante", emoji: "⚡", bg: "bg-red-50", text: "text-red-700", gradient: "from-red-500 to-red-600", ring: "ring-red-400",
                  description: "Directo, decidido, le gusta el liderazgo y la acción.",
                  fortalezas: ["Toma decisiones con rapidez y confianza", "Lidera con determinación y energía", "Afronta los problemas de frente"],
                  mejoras: ["Puede parecer impaciente o autoritario/a", "Le cuesta ceder el control", "Tiende a minimizar las emociones ajenas"],
                  enPareja: "Aporta dirección, iniciativa y energía. Necesita una pareja que valore su determinación y le ayude a conectar emocionalmente.",
                  amor: "Demuestra cariño haciendo cosas, resolviendo problemas y creando experiencias intensas.",
                  necesidades: ["Autonomía y espacio para decidir", "Una pareja directa", "Retos y metas compartidas", "Respeto por su tiempo"],
                  conflicto: "Tiendes a confrontar directamente. Tu reto es escuchar antes de reaccionar.",
                  frase: "\"Dame libertad para actuar y te daré el mundo.\"",
                  compatibility: "Combinas mejor con perfiles S (estabilidad) e I (entusiasmo).",
                  comunicacion: "Sé claro y directo, evita rodeos.", actividades: "Deportes de aventura, viajes espontáneos, retos en pareja." },
                I: { title: "Influyente", emoji: "✨", bg: "bg-amber-50", text: "text-amber-700", gradient: "from-amber-400 to-amber-500", ring: "ring-amber-400",
                  description: "Sociable, entusiasta y motivador. Necesitas conexión emocional y diversión.",
                  fortalezas: ["Genera entusiasmo contagioso", "Conecta fácilmente con las personas", "Resuelve conflictos con empatía"],
                  mejoras: ["Puede evitar conversaciones difíciles", "Tiende a ser impulsivo/a", "Le cuesta mantener rutinas"],
                  enPareja: "Aporta alegría, espontaneidad y conexión social. Necesita sentirse admirado/a y escuchado/a.",
                  amor: "Palabras de afirmación, gestos espontáneos, sorpresas y mucha comunicación afectiva.",
                  necesidades: ["Expresión emocional abierta", "Vida social activa", "Reconocimiento", "Espacio para la creatividad"],
                  conflicto: "Tiendes a buscar la armonía rápidamente, a veces sin abordar el fondo.",
                  frase: "\"Hazme reír y te entregaré el corazón.\"",
                  compatibility: "Encajas bien con perfiles C (estructura) y S (constancia).",
                  comunicacion: "Expresa emociones abiertamente, valora la escucha activa.", actividades: "Eventos sociales, viajes con amigos, cenas románticas." },
                S: { title: "Estable", emoji: "🌿", bg: "bg-emerald-50", text: "text-emerald-700", gradient: "from-emerald-500 to-emerald-600", ring: "ring-emerald-400",
                  description: "Paciente, estable y confiable. Valoras la seguridad emocional y la lealtad.",
                  fortalezas: ["Ofrece apoyo constante y lealtad", "Escucha activamente sin juzgar", "Crea un entorno de seguridad"],
                  mejoras: ["Puede evitar los cambios necesarios", "Le cuesta expresar sus propias necesidades", "Tiende a acumular frustración"],
                  enPareja: "Aporta calma, estabilidad y compromiso profundo. Es la roca emocional de la relación.",
                  amor: "Tiempo de calidad y actos de servicio: estar presente y cuidar los detalles cotidianos.",
                  necesidades: ["Seguridad emocional", "Tiempo para adaptarse", "Una pareja que respete su ritmo", "Rutinas compartidas"],
                  conflicto: "Tiendes a evitar la confrontación y ceder para mantener la paz.",
                  frase: "\"Dame seguridad y te daré toda mi lealtad.\"",
                  compatibility: "Combinas con perfiles D (decisión) e I (energía).",
                  comunicacion: "Necesitas tiempo para procesar, valora la paciencia.", actividades: "Tardes tranquilas, cocinar juntos, paseos por la naturaleza." },
                C: { title: "Concienzudo", emoji: "💎", bg: "bg-blue-50", text: "text-blue-700", gradient: "from-blue-500 to-blue-600", ring: "ring-blue-400",
                  description: "Analítico, detallista y cuidadoso. Buscas coherencia y compromiso real.",
                  fortalezas: ["Planifica con cuidado y previsión", "Valora la calidad y la coherencia", "Aporta estructura y fiabilidad"],
                  mejoras: ["Puede ser excesivamente crítico/a", "Le cuesta ser espontáneo/a", "Tiende a sobreanalizar las situaciones"],
                  enPareja: "Aporta seguridad, planificación y atención al detalle. Necesita una pareja que valore su rigor.",
                  amor: "Coherencia y detalles pensados: regalos significativos, planes bien organizados.",
                  necesidades: ["Previsibilidad y coherencia", "Espacio para procesar emociones", "Conversaciones profundas", "Respeto por sus estándares"],
                  conflicto: "Tiendes a retirarte y analizar antes de hablar.",
                  frase: "\"Demuéstrame coherencia y te entregaré mi confianza.\"",
                  compatibility: "Tu precisión se complementa con perfiles I (espontaneidad) y S (paciencia).",
                  comunicacion: "Prefiere conversaciones con sentido, valora la lógica.", actividades: "Museos, lectura compartida, planificación de viajes detallados." },
              };
              const DISC_LABELS: Record<DiscType, string> = { D: "Dominante", I: "Influyente", S: "Estable", C: "Concienzudo" };

              const primary = (discResult?.perfil || "D") as DiscType;
              const sorted = discResult ? (Object.entries(discResult.scores) as [DiscType, number][]).sort((a, b) => b[1] - a[1]) : [];
              const secondary = sorted.length > 1 ? sorted[1][0] : ("I" as DiscType);
              const total = discResult ? Object.values(discResult.scores).reduce((a, b) => a + b, 0) : 1;
              const percents: Record<DiscType, number> = {
                D: discResult ? Math.round((discResult.scores.D / total) * 100) : 0,
                I: discResult ? Math.round((discResult.scores.I / total) * 100) : 0,
                S: discResult ? Math.round((discResult.scores.S / total) * 100) : 0,
                C: discResult ? Math.round((discResult.scores.C / total) * 100) : 0,
              };
              const pri = DISC_META[primary];
              const sec = DISC_META[secondary];
              const userName = form.nombre_completo || "Usuario";

              const reportLines = [
                `1. Nombre: ${userName}`,
                `2. Perfil principal: ${pri.title} (${primary})`,
                `3. Perfil secundario: ${sec.title} (${secondary})`,
                `4. Distribución D: ${percents.D}%`,
                `5. Distribución I: ${percents.I}%`,
                `6. Distribución S: ${percents.S}%`,
                `7. Distribución C: ${percents.C}%`,
                `8. Fortaleza 1: ${pri.fortalezas[0]}`,
                `9. Fortaleza 2: ${pri.fortalezas[1]}`,
                `10. Fortaleza 3: ${pri.fortalezas[2]}`,
                `11. Área de mejora 1: ${pri.mejoras[0]}`,
                `12. Área de mejora 2: ${pri.mejoras[1]}`,
                `13. Área de mejora 3: ${pri.mejoras[2]}`,
                `14. Cómo eres en pareja: ${pri.enPareja}`,
                `15. Lenguaje del amor: ${pri.amor}`,
                `16. Necesidad afectiva 1: ${pri.necesidades[0]}`,
                `17. Necesidad afectiva 2: ${pri.necesidades[1]}`,
                `18. Necesidad afectiva 3: ${pri.necesidades[2]}`,
                `19. Necesidad afectiva 4: ${pri.necesidades[3]}`,
                `20. Gestión de conflictos (principal): ${pri.conflicto}`,
                `21. Gestión de conflictos (secundario): ${sec.conflicto}`,
                `22. Compatibilidad ideal: ${pri.compatibility}`,
                `23. Comunicación recomendada: ${pri.comunicacion}`,
                `24. Actividades sugeridas: ${pri.actividades}`,
                `25. Influencia secundaria: ${sec.enPareja}`,
                `26. Fortalece la relación con acuerdos claros y consistentes`,
                `27. Dedica tiempo de calidad semanal para reforzar conexión`,
                `28. Practica escucha activa antes de responder en conflicto`,
                `29. Celebra avances pequeños para mantener motivación`,
                `30. Mensaje final: ${userName}, tu perfil es una guía para amar mejor 💛`,
              ];

              return (
              <StepWrapper key="success" direction={direction}>
                <div className="space-y-5 py-4">
                  {/* Compact success header + DISC badge */}
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring" as const, stiffness: 200, delay: 0.1 }}
                    className={`relative overflow-hidden rounded-2xl p-6 text-center ${pri.bg} border-2 ${pri.text}`}
                  >
                    <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${pri.gradient} flex items-center justify-center shadow-lg`}>
                        <span className="text-2xl">{pri.emoji}</span>
                      </div>
                      <div className="text-left">
                        <p className="font-body text-[10px] uppercase tracking-[0.15em] opacity-60">Tu perfil DISC</p>
                        <h2 className="font-display text-xl font-bold">{pri.title} <span className="text-base font-normal opacity-70">({percents[primary]}%)</span></h2>
                      </div>
                    </div>
                    <p className="font-display text-base italic font-medium opacity-80">{pri.frase}</p>
                    {/* Inline distribution */}
                    <div className="flex gap-2 mt-3 justify-center">
                      {(["D", "I", "S", "C"] as DiscType[]).map((type) => {
                        const meta = DISC_META[type];
                        const isP = primary === type;
                        return (
                          <div key={type} className={`flex flex-col items-center px-2.5 py-1.5 rounded-lg ${isP ? "opacity-100 font-bold" : "opacity-50"}`}>
                            <span className={`w-2 h-2 rounded-full bg-gradient-to-br ${meta.gradient} mb-0.5`} />
                            <span className="text-[10px] font-semibold">{type}</span>
                            <span className="text-xs tabular-nums">{percents[type]}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>

                  {/* Tabs */}
                  <Tabs defaultValue="planes" className="w-full">
                    <TabsList className="w-full grid grid-cols-3 h-10 rounded-xl bg-muted">
                      <TabsTrigger value="planes" className="rounded-lg text-xs font-body font-medium">Planes</TabsTrigger>
                      <TabsTrigger value="perfil" className="rounded-lg text-xs font-body font-medium">👆 Perfil</TabsTrigger>
                      <TabsTrigger value="relacion" className="rounded-lg text-xs font-body font-medium">👆 Relación</TabsTrigger>
                    </TabsList>

                    {/* TAB: Perfil */}
                    <TabsContent value="perfil" className="space-y-4 mt-4">
                      {/* Fortalezas & Mejoras side by side */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-1.5">
                          <p className="font-body text-[10px] font-bold uppercase tracking-wider text-emerald-700">✦ Fortalezas</p>
                          <ul className="space-y-1">
                            {pri.fortalezas.map((f, i) => (
                              <li key={i} className="font-body text-xs text-emerald-800/80 flex items-start gap-1">
                                <span className="text-emerald-500 shrink-0">•</span>{f}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-1.5">
                          <p className="font-body text-[10px] font-bold uppercase tracking-wider text-amber-700">⚡ Mejora</p>
                          <ul className="space-y-1">
                            {pri.mejoras.map((m, i) => (
                              <li key={i} className="font-body text-xs text-amber-800/80 flex items-start gap-1">
                                <span className="text-amber-500 shrink-0">•</span>{m}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Secondary profile inline */}
                      <div className={`rounded-xl ${sec.bg} ${sec.text} p-3 flex items-center gap-3 border`}>
                        <span className={`w-8 h-8 rounded-lg bg-gradient-to-br ${sec.gradient} flex items-center justify-center text-white text-sm shrink-0`}>{sec.emoji}</span>
                        <div>
                          <p className="font-body text-[10px] uppercase tracking-[0.12em] opacity-60">Secundario: {sec.title} ({percents[secondary]}%)</p>
                          <p className="font-body text-xs opacity-80 leading-relaxed">{sec.description}</p>
                        </div>
                      </div>
                    </TabsContent>

                    {/* TAB: Relación */}
                    <TabsContent value="relacion" className="space-y-4 mt-4">
                      <div className="rounded-xl border border-border bg-card p-4 space-y-1.5">
                        <h4 className="font-body text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Heart className="w-3.5 h-3.5 text-gold" /> En pareja
                        </h4>
                        <p className="font-body text-xs text-muted-foreground leading-relaxed">{pri.enPareja}</p>
                      </div>

                      <div className="rounded-xl bg-gradient-to-br from-gold/10 to-warm/10 border border-gold/20 p-4 space-y-1.5">
                        <h4 className="font-body text-xs font-bold text-foreground">💛 Lenguaje del amor</h4>
                        <p className="font-body text-xs text-muted-foreground leading-relaxed">{pri.amor}</p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {pri.necesidades.map((n, i) => (
                            <span key={i} className="font-body text-[11px] text-muted-foreground bg-background/60 rounded-lg px-2 py-1 border border-gold/10">
                              {n}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-border bg-card p-4 space-y-1.5">
                        <h4 className="font-body text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-gold" /> Conflictos
                        </h4>
                        <p className="font-body text-xs text-muted-foreground leading-relaxed">{pri.conflicto}</p>
                      </div>

                      <div className="rounded-xl border border-border bg-card p-4 space-y-1.5">
                        <h4 className="font-body text-xs font-bold text-foreground">🤝 Compatibilidad</h4>
                        <p className="font-body text-xs text-muted-foreground leading-relaxed">{pri.compatibility}</p>
                      </div>
                    </TabsContent>

                    {/* TAB: Planes */}
                    <TabsContent value="planes" className="space-y-4 mt-4">
                      <div className="text-center space-y-1">
                        <h3 className="font-display text-lg font-bold text-foreground">¡Hora de conocerte en persona y presentarte con la persona perfecta para ti!</h3>
                        <p className="font-body text-sm text-muted-foreground">Elige tu plan</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <a
                          href="https://calendly.com/equipo-afin/plan-esencial"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center gap-1 px-4 py-4 rounded-xl border-2 border-gold bg-card hover:bg-gold/5 transition-all font-body"
                        >
                          <span className="text-[10px] uppercase tracking-[0.12em] text-gold font-semibold">Esencial</span>
                          <span className="font-display text-xl font-bold text-foreground">€160<span className="text-xs font-normal text-muted-foreground">/mes</span></span>
                          <span className="text-[10px] text-muted-foreground">1 sesión · citas</span>
                        </a>
                        <a
                          href="https://calendly.com/equipo-afin/plan-esencial"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center gap-1 px-4 py-4 rounded-xl border-2 border-primary bg-primary text-primary-foreground hover:opacity-90 transition-all font-body"
                        >
                          <span className="text-[10px] uppercase tracking-[0.12em] font-semibold flex items-center gap-1"><Crown className="w-3 h-3" /> Premium</span>
                          <span className="font-display text-xl font-bold">€250<span className="text-xs font-normal opacity-60">/mes</span></span>
                          <span className="text-[10px] opacity-70">2 sesiones · verificación</span>
                        </a>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <PlanBookingDialog plan={bookingPlan} open={!!bookingPlan} onOpenChange={(open) => { if (!open) setBookingPlan(null); }} />

                  {/* Compact action row */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        generateDiscPdf({
                          userName,
                          primary,
                          secondary,
                          percents,
                          pri,
                          sec,
                        });
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-full bg-gradient-to-r from-gold to-warm text-white font-body font-semibold text-xs shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF
                    </button>
                    <button onClick={() => navigate("/")} className="flex-1 inline-flex items-center justify-center px-4 py-3 rounded-full border border-border bg-card text-foreground font-body font-medium text-xs hover:bg-muted transition-colors">
                      Inicio
                    </button>
                  </div>
                </div>
              </StepWrapper>
              );
            })()}

          </AnimatePresence>
        </div>
      </div>
    </main>
  );
};

// ——— Sub-components ———

const StepWrapper = ({ children, direction }: { children: React.ReactNode; direction: number; }) => (
  <motion.div
    custom={direction}
    variants={pageVariants}
    initial="enter"
    animate="center"
    exit="exit"
    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    className="pb-8"
  >
    {children}
  </motion.div>
);

const StepHeader = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) => (
  <div className="text-center space-y-2">
    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold-vivid/15 to-gold/10 flex items-center justify-center mx-auto text-gold-vivid mb-3">
      {icon}
    </div>
    <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">{title}</h2>
    <p className="font-body text-sm text-muted-foreground">{subtitle}</p>
  </div>
);

const NextButton = ({ onClick, label = "Continuar" }: { onClick: () => void; label?: string }) => (
  <div className="mt-8">
    <button
      onClick={onClick}
      className="w-full group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-gold-vivid to-gold text-white font-body font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
    >
      {label} <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
    </button>
  </div>
);

const FieldGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="font-body text-sm font-medium text-foreground">{label}</label>
    {children}
  </div>
);

const PillSelector = ({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) => (
  <div>
    <label className="block font-body text-sm font-medium text-foreground mb-3">{label}</label>
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button key={opt} type="button" onClick={() => onChange(opt)} className={`px-4 py-2.5 rounded-full border text-sm font-body transition-all duration-200 ${value === opt ? "bg-gold-vivid text-white border-gold-vivid shadow-sm" : "bg-card text-foreground border-border hover:border-gold-vivid/50 hover:shadow-sm"}`}>
          {value === opt && <Check className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />}
          {opt}
        </button>
      ))}
    </div>
  </div>
);

const MultiPillSelector = ({ label, options, selected, onToggle }: { label: string; options: string[]; selected: string[]; onToggle: (v: string) => void }) => (
  <div>
    <label className="block font-body text-sm font-medium text-foreground mb-3">{label}</label>
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isActive = selected.includes(opt);
        return (
          <button key={opt} type="button" onClick={() => onToggle(opt)} className={`px-4 py-2.5 rounded-full border text-sm font-body transition-all duration-200 ${isActive ? "bg-gold-vivid text-white border-gold-vivid shadow-sm" : "bg-card text-foreground border-border hover:border-gold-vivid/50 hover:shadow-sm"}`}>
            {isActive && <Check className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />}
            {opt}
          </button>
        );
      })}
    </div>
    {selected.length > 0 && <p className="text-xs text-muted-foreground mt-2 font-body">{selected.length} seleccionado(s)</p>}
  </div>
);

const TextAreaField = ({ label, value, onChange, optional, placeholder }: { label: string; value: string; onChange: (v: string) => void; optional?: boolean; placeholder?: string }) => (
  <div className="space-y-1.5">
    <label className="font-body text-sm font-medium text-foreground">
      {label} {optional && <span className="text-muted-foreground font-normal">(opcional)</span>}
    </label>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={1000}
      rows={3}
      className="w-full rounded-xl border border-border bg-card px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/30 resize-none transition-shadow"
      placeholder={placeholder || "Escribe tu respuesta..."}
    />
  </div>
);

const DiscQuestionCard = ({ index, question, options, selected, onSelect }: {
  index: number;
  question: string;
  options: { text: string; disc: DiscType }[];
  selected?: DiscType;
  onSelect: (disc: DiscType) => void;
}) => (
  <div className="bg-card rounded-2xl p-5 border border-border shadow-sm space-y-3">
    <p className="font-body text-sm font-semibold text-foreground">{index + 1}. {question}</p>
    <div className="grid gap-2">
      {options.map((opt, oi) => {
        const isSelected = selected === opt.disc;
        return (
          <button
            key={oi}
            type="button"
            onClick={() => onSelect(opt.disc)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-body text-left transition-all duration-200 ${
              isSelected
                ? "bg-gold-vivid/10 border-gold-vivid text-foreground shadow-sm"
                : "bg-background border-border text-foreground hover:border-gold-vivid/40 hover:shadow-sm"
            }`}
          >
            <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${isSelected ? "bg-gold-vivid text-white" : "bg-muted text-muted-foreground"}`}>
              {isSelected ? <Check className="w-3.5 h-3.5" /> : String.fromCharCode(65 + oi)}
            </span>
            {opt.text}
          </button>
        );
      })}
    </div>
  </div>
);

const SummaryItem = ({ label, value }: { label: string; value: string }) => (
  <div>
    <span className="text-muted-foreground">{label}:</span>
    <span className="ml-1 font-medium text-foreground">{value || "—"}</span>
  </div>
);

export default Perfil;
