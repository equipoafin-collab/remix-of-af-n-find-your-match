import { useState } from "react";

type DiscType = "D" | "I" | "S" | "C";

interface Option {
  text: string;
  disc: DiscType;
}

interface Question {
  question: string;
  options: Option[];
}

const DISC_QUESTIONS: Question[] = [
  {
    question: "Cuando hay un desacuerdo con tu pareja, ¿cómo reaccionas?",
    options: [
      { text: "Hablo claro y directo", disc: "D" },
      { text: "Busco suavizar la situación y persuadir", disc: "I" },
      { text: "Mantengo la calma y escucho", disc: "S" },
      { text: "Analizo antes de responder", disc: "C" },
    ],
  },
  {
    question: "En momentos románticos, ¿qué disfrutas más?",
    options: [
      { text: "Planear actividades emocionantes", disc: "D" },
      { text: "Socializar y compartir emociones", disc: "I" },
      { text: "Momentos tranquilos y constantes", disc: "S" },
      { text: "Detalles bien pensados y cuidados", disc: "C" },
    ],
  },
  {
    question: "Cuando tu pareja propone un plan inesperado:",
    options: [
      { text: "Me adapto rápido y tomo decisiones", disc: "D" },
      { text: "Me entusiasmo y participo", disc: "I" },
      { text: "Prefiero seguridad y rutina", disc: "S" },
      { text: "Evalúo opciones antes de decidir", disc: "C" },
    ],
  },
  {
    question: "Al expresar tus sentimientos:",
    options: [
      { text: "Soy directo y honesto", disc: "D" },
      { text: "Soy expresivo y entusiasta", disc: "I" },
      { text: "Soy paciente y reflexivo", disc: "S" },
      { text: "Prefiero comunicar con precisión y detalle", disc: "C" },
    ],
  },
  {
    question: "¿Cómo manejas los conflictos cotidianos?",
    options: [
      { text: "Enfrento la situación y busco solución", disc: "D" },
      { text: "Trato de convencer y dialogar", disc: "I" },
      { text: "Busco consenso y armonía", disc: "S" },
      { text: "Analizo la situación antes de actuar", disc: "C" },
    ],
  },
  {
    question: "En una relación, lo que más valoras:",
    options: [
      { text: "Decisión y liderazgo compartido", disc: "D" },
      { text: "Diversión, conexión social y energía", disc: "I" },
      { text: "Estabilidad y confianza", disc: "S" },
      { text: "Planeación, estructura y detalle", disc: "C" },
    ],
  },
  {
    question: "¿Cómo reaccionas ante cambios importantes en la relación?",
    options: [
      { text: "Tomo acción inmediata", disc: "D" },
      { text: "Me adapto con entusiasmo", disc: "I" },
      { text: "Prefiero cambios graduales", disc: "S" },
      { text: "Evalúo antes de actuar", disc: "C" },
    ],
  },
  {
    question: "Proyecto ideal en pareja:",
    options: [
      { text: "Aventuras y retos juntos", disc: "D" },
      { text: "Momentos sociales y divertidos", disc: "I" },
      { text: "Rutina estable y segura", disc: "S" },
      { text: "Planificación y detalles cuidados", disc: "C" },
    ],
  },
];

const LETTER_LABELS = ["A", "B", "C", "D"];

export interface DiscResult {
  respuestas: Record<number, DiscType>;
  perfil: string;
  scores: Record<DiscType, number>;
}

function calculateDisc(answers: Record<number, DiscType>): DiscResult {
  const scores: Record<DiscType, number> = { D: 0, I: 0, S: 0, C: 0 };
  Object.values(answers).forEach((d) => {
    scores[d]++;
  });
  const dominant = (Object.entries(scores) as [DiscType, number][])
    .sort((a, b) => b[1] - a[1])[0][0];
  return { respuestas: answers, perfil: dominant, scores };
}

interface DiscSurveyProps {
  value: Record<number, DiscType>;
  onChange: (answers: Record<number, DiscType>) => void;
}

const DiscSurvey = ({ value, onChange }: DiscSurveyProps) => {
  const handleSelect = (questionIndex: number, disc: DiscType) => {
    onChange({ ...value, [questionIndex]: disc });
  };

  const answeredCount = Object.keys(value).length;

  return (
    <fieldset className="space-y-8">
      <legend className="font-display text-xl font-semibold text-foreground mb-4 border-b border-border pb-2">
        Test de personalidad DISC
      </legend>
      <p className="font-body text-sm text-muted-foreground -mt-4">
        Responde las 8 preguntas seleccionando la opción que más te identifique. ({answeredCount}/8)
      </p>

      {DISC_QUESTIONS.map((q, qi) => (
        <div key={qi} className="space-y-3">
          <p className="font-body text-sm font-medium text-foreground">
            {qi + 1}. {q.question}
          </p>
          <div className="grid gap-2">
            {q.options.map((opt, oi) => {
              const isSelected = value[qi] === opt.disc;
              return (
                <button
                  key={oi}
                  type="button"
                  onClick={() => handleSelect(qi, opt.disc)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-body text-left transition-colors ${
                    isSelected
                      ? "bg-gold/10 border-gold text-foreground"
                      : "bg-card border-border text-foreground hover:border-gold/50"
                  }`}
                >
                  <span
                    className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                      isSelected
                        ? "bg-gold text-accent-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {LETTER_LABELS[oi]}
                  </span>
                  {opt.text}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </fieldset>
  );
};

export { calculateDisc };
export default DiscSurvey;
