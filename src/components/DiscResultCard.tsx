import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
type DiscType = "D" | "I" | "S" | "C";

interface DiscResultCardProps {
  scores: Record<DiscType, number>;
  total: number;
}

const DISC_META: Record<DiscType, {
  label: string;
  color: string;
  description: string;
  tooltip: string;
  fortalezas: string[];
  mejoras: string[];
  enPareja: string;
}> = {
  D: {
    label: "Dominancia",
    color: "bg-red-500",
    description: "Directo, decidido, orientado a resultados",
    tooltip: "Las personas con perfil D son resolutivas y competitivas. Priorizan la eficacia, toman decisiones rápidas y buscan el control de las situaciones. En pareja, necesitan autonomía y claridad.",
    fortalezas: ["Toma decisiones con rapidez", "Lidera con determinación", "Afronta los problemas de frente"],
    mejoras: ["Puede parecer impaciente o autoritario", "Le cuesta ceder el control", "Tiende a minimizar las emociones"],
    enPareja: "Aporta dirección y energía a la relación. Necesita una pareja que valore su iniciativa y le ayude a conectar emocionalmente.",
  },
  I: {
    label: "Influencia",
    color: "bg-yellow-500",
    description: "Entusiasta, sociable, persuasivo",
    tooltip: "Las personas con perfil I son comunicativas y optimistas. Disfrutan de la interacción social, motivan a otros y buscan reconocimiento. En pareja, necesitan expresión emocional y diversión.",
    fortalezas: ["Genera entusiasmo y optimismo", "Conecta fácilmente con las personas", "Resuelve conflictos con empatía"],
    mejoras: ["Puede evitar conversaciones difíciles", "Tiende a ser impulsivo", "Le cuesta mantener rutinas"],
    enPareja: "Aporta alegría, espontaneidad y conexión social. Necesita una pareja que le dé espacio para expresarse y le ayude con la estructura.",
  },
  S: {
    label: "Estabilidad",
    color: "bg-green-500",
    description: "Paciente, confiable, buen oyente",
    tooltip: "Las personas con perfil S son leales y consistentes. Valoran la armonía, evitan los conflictos y ofrecen un apoyo incondicional. En pareja, necesitan seguridad emocional y un ritmo pausado.",
    fortalezas: ["Ofrece apoyo constante y lealtad", "Escucha activamente", "Crea un entorno de seguridad"],
    mejoras: ["Puede evitar los cambios necesarios", "Le cuesta expresar sus propias necesidades", "Tiende a acumular frustración"],
    enPareja: "Aporta calma, estabilidad y compromiso. Necesita una pareja que le anime a expresarse y respete su ritmo.",
  },
  C: {
    label: "Cumplimiento",
    color: "bg-blue-500",
    description: "Analítico, preciso, detallista",
    tooltip: "Las personas con perfil C son metódicas y rigurosas. Buscan la calidad, planifican con detalle y valoran la coherencia. En pareja, necesitan previsibilidad y respeto por sus estándares.",
    fortalezas: ["Planifica con cuidado y previsión", "Valora la calidad y la coherencia", "Aporta estructura y orden"],
    mejoras: ["Puede ser excesivamente crítico", "Le cuesta ser espontáneo", "Tiende a sobreanalizar las situaciones"],
    enPareja: "Aporta seguridad, planificación y atención al detalle. Necesita una pareja que valore su rigor y le ayude a soltar el control.",
  },
};

const TYPES: DiscType[] = ["D", "I", "S", "C"];

const DiscResultCard = ({ scores, total }: DiscResultCardProps) => {
  const sorted = [...TYPES].sort((a, b) => scores[b] - scores[a]);
  const principal = sorted[0];
  const secundario = sorted[1];

  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-gold font-body text-sm tracking-[0.2em] uppercase mb-2">Tu perfil DISC</p>
        <h3 className="font-display text-2xl font-bold text-foreground">
          {DISC_META[principal].label}
          {scores[secundario] > 0 && (
            <span className="text-muted-foreground font-normal text-lg"> / {DISC_META[secundario].label}</span>
          )}
        </h3>
      </div>

      <div className="space-y-4">
        {TYPES.map((type) => {
          const percent = total > 0 ? Math.round((scores[type] / total) * 100) : 0;
          const meta = DISC_META[type];
          return (
            <div key={type} className="space-y-1.5">
              <div className="flex items-center justify-between font-body text-sm">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="font-medium text-foreground cursor-help flex items-center gap-1">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold">
                        {type}
                      </span>
                      {meta.label}
                      <Info className="w-3.5 h-3.5 text-muted-foreground" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs p-3">
                    <p className="font-body text-xs leading-relaxed">{meta.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
                <span className="text-muted-foreground">{percent}%</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className={`h-full rounded-full ${meta.color}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Principal & Secundario detail cards */}
      {[{ key: principal, role: "Principal" }, { key: secundario, role: "Secundario" }].map(({ key, role }) => {
        const meta = DISC_META[key];
        return (
          <div key={role} className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${meta.color}`}>
                {key}
              </span>
              <div>
                <p className="text-xs text-muted-foreground font-body uppercase tracking-wider">{role}</p>
                <p className="font-display text-lg font-bold text-foreground">{meta.label}</p>
              </div>
            </div>
            <p className="font-body text-sm text-muted-foreground italic">{meta.description}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="font-body text-xs font-semibold text-foreground uppercase tracking-wider">✦ Fortalezas</p>
                <ul className="space-y-1">
                  {meta.fortalezas.map((f, i) => (
                    <li key={i} className="font-body text-sm text-muted-foreground flex items-start gap-1.5">
                      <span className="text-green-500 mt-0.5">•</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <p className="font-body text-xs font-semibold text-foreground uppercase tracking-wider">⚡ Áreas de mejora</p>
                <ul className="space-y-1">
                  {meta.mejoras.map((m, i) => (
                    <li key={i} className="font-body text-sm text-muted-foreground flex items-start gap-1.5">
                      <span className="text-gold mt-0.5">•</span>{m}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-3">
              <p className="font-body text-xs font-semibold text-foreground uppercase tracking-wider mb-1">💛 En pareja</p>
              <p className="font-body text-sm text-muted-foreground">{meta.enPareja}</p>
            </div>
          </div>
        );
      })}
    </div>
    </TooltipProvider>
  );
};

export default DiscResultCard;
