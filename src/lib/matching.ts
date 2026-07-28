/**
 * Módulo de Matching DISC – Afín
 * 
 * Función modular de compatibilidad entre dos perfiles DISC.
 * Preparada para reemplazarse por AI_match(profileA, profileB) en el futuro.
 */

export interface DiscProfile {
  id: string;
  name: string;
  email: string;
  primary_style: string;
  secondary_style: string;
  percent_d: number;
  percent_i: number;
  percent_s: number;
  percent_c: number;
}

export interface MatchResult {
  compatibility_score: number;
  strengths: string[];
  risks: string[];
  recommendation: string;
  combo_label: string;
}

type Combo = `${string}+${string}`;

interface ComboData {
  label: string;
  strengths: string[];
  risks: string[];
  recommendation: string;
}

const COMBO_MAP: Record<Combo, ComboData> = {
  "D+S": {
    label: "Complementariedad alta",
    strengths: [
      "El perfil D aporta iniciativa y decisión, mientras que S ofrece estabilidad y apoyo.",
      "Equilibrio natural entre acción y calma.",
      "S suaviza la intensidad de D, creando un entorno seguro.",
    ],
    risks: [
      "D puede percibir a S como pasivo o poco ambicioso.",
      "S podría sentirse presionado por el ritmo acelerado de D.",
    ],
    recommendation:
      "Esta combinación tiene un gran potencial si ambos respetan el ritmo del otro. D debe practicar paciencia y S debe comunicar sus necesidades sin temor.",
  },
  "I+C": {
    label: "Necesitan estructura",
    strengths: [
      "I aporta energía social y creatividad, C aporta análisis y precisión.",
      "Pueden complementarse bien en proyectos compartidos.",
    ],
    risks: [
      "I puede considerar a C demasiado rígido o crítico.",
      "C podría frustrarse con la impulsividad y desorganización de I.",
      "Necesitan definir acuerdos claros para evitar malentendidos.",
    ],
    recommendation:
      "Funcionan mejor cuando establecen reglas básicas de convivencia. I debe respetar la necesidad de orden de C, y C debe permitir espacios de espontaneidad.",
  },
  "D+D": {
    label: "Intensidad alta",
    strengths: [
      "Ambos son decididos, directos y orientados a resultados.",
      "Pueden lograr grandes cosas juntos si comparten una visión.",
    ],
    risks: [
      "Alta probabilidad de choques de poder y competitividad.",
      "Dificultad para ceder o hacer compromisos.",
      "Los conflictos pueden escalar rápidamente.",
    ],
    recommendation:
      "Necesitan definir roles claros y aprender a turnarse en el liderazgo. La clave es el respeto mutuo y evitar ver al otro como rival.",
  },
  "C+C": {
    label: "Estabilidad lógica",
    strengths: [
      "Ambos valoran la precisión, la planificación y el detalle.",
      "Alta compatibilidad en la toma de decisiones racionales.",
      "Conflictos poco frecuentes gracias a la comunicación estructurada.",
    ],
    risks: [
      "Pueden caer en la parálisis por análisis.",
      "Falta de espontaneidad y expresión emocional.",
      "Riesgo de una relación funcional pero fría.",
    ],
    recommendation:
      "Deben introducir deliberadamente momentos de diversión y espontaneidad. Practicar la expresión emocional fortalecerá el vínculo más allá de lo racional.",
  },
  "I+S": {
    label: "Conexión emocional fuerte",
    strengths: [
      "I aporta alegría y entusiasmo, S brinda lealtad y constancia.",
      "Relación cálida y emocionalmente rica.",
      "Ambos priorizan la armonía y evitar conflictos.",
    ],
    risks: [
      "Pueden evitar conversaciones difíciles por miedo al conflicto.",
      "I puede necesitar más estímulo social del que S desea.",
      "Decisiones importantes pueden posponerse demasiado.",
    ],
    recommendation:
      "La base emocional es sólida. Deben trabajar en abordar los temas difíciles con honestidad. I puede ayudar a S a salir de su zona de confort, y S ancla la energía de I.",
  },
  "D+C": {
    label: "Relación estratégica",
    strengths: [
      "D toma decisiones rápidas, C aporta análisis antes de actuar.",
      "Combinación efectiva para planificar y ejecutar.",
      "Se complementan en la resolución de problemas.",
    ],
    risks: [
      "D puede impacientarse con la necesidad de análisis de C.",
      "C puede sentirse atropellado por las decisiones impulsivas de D.",
      "Diferente velocidad para procesar emociones.",
    ],
    recommendation:
      "Funcionan como un gran equipo si D respeta el proceso de C y C confía en la intuición de D. Definir tiempos para analizar y tiempos para actuar.",
  },
  "I+I": {
    label: "Energía elevada",
    strengths: [
      "Relación llena de entusiasmo, diversión y socialización.",
      "Gran conexión emocional y comunicación fluida.",
      "Vida social activa y experiencias compartidas.",
    ],
    risks: [
      "Pueden evitar temas serios o responsabilidades prácticas.",
      "Competencia por la atención en contextos sociales.",
      "Dificultad para mantener rutinas y estructura.",
    ],
    recommendation:
      "Deben asignar momentos para lo práctico: finanzas, planificación, decisiones. La diversión no faltará, pero la estabilidad requiere esfuerzo consciente.",
  },
  "S+S": {
    label: "Seguridad máxima",
    strengths: [
      "Relación estable, predecible y segura.",
      "Ambos priorizan la lealtad y el compromiso.",
      "Bajo nivel de conflicto y alta armonía.",
    ],
    risks: [
      "Riesgo de monotonía y falta de estímulo.",
      "Pueden evitar cambios necesarios por comodidad.",
      "Dificultad para tomar decisiones arriesgadas juntos.",
    ],
    recommendation:
      "La base es muy sólida. Necesitan introducir novedades de forma planificada: viajes, hobbies nuevos, retos. Evitar que la estabilidad se convierta en estancamiento.",
  },
  "D+I": {
    label: "Dúo dinámico",
    strengths: [
      "Ambos son extrovertidos y orientados a la acción.",
      "D lidera con decisión, I conecta emocionalmente.",
      "Relación energética y con mucha iniciativa.",
    ],
    risks: [
      "Pueden descuidar el detalle y la planificación.",
      "I puede sentir que D no valora sus emociones.",
      "Ritmo intenso que puede agotarlos si no descansan.",
    ],
    recommendation:
      "Gran potencial si D muestra más empatía y I aporta estructura. Necesitan pausas juntos para conectar más allá de la acción.",
  },
  "S+C": {
    label: "Armonía reflexiva",
    strengths: [
      "Ambos son introvertidos y reflexivos, creando un entorno tranquilo.",
      "S aporta calidez emocional, C aporta lógica y orden.",
      "Relación predecible y con pocos conflictos.",
    ],
    risks: [
      "Pueden encerrarse y evitar experiencias nuevas.",
      "Falta de espontaneidad e iniciativa.",
      "Dificultad para expresar emociones abiertamente.",
    ],
    recommendation:
      "Necesitan cultivar la comunicación emocional activamente. Programar actividades fuera de su rutina les ayudará a crecer como pareja.",
  },
};

function normalizeCombo(a: string, b: string): Combo {
  // Normalize to alphabetical-ish order matching our map keys
  const pairs: Combo[] = [
    `${a}+${b}` as Combo,
    `${b}+${a}` as Combo,
  ];
  for (const p of pairs) {
    if (COMBO_MAP[p]) return p;
  }
  return pairs[0];
}

/**
 * Calcula la compatibilidad entre dos perfiles DISC.
 * 
 * En el futuro, esta función puede reemplazarse por:
 *   AI_match(profileA, profileB)
 */
export function calculateCompatibility(
  profileA: DiscProfile,
  profileB: DiscProfile
): MatchResult {
  const diff_d = Math.abs(profileA.percent_d - profileB.percent_d);
  const diff_i = Math.abs(profileA.percent_i - profileB.percent_i);
  const diff_s = Math.abs(profileA.percent_s - profileB.percent_s);
  const diff_c = Math.abs(profileA.percent_c - profileB.percent_c);

  const avg_diff = (diff_d + diff_i + diff_s + diff_c) / 4;
  const compatibility_score = Math.round(100 - avg_diff);

  const combo = normalizeCombo(profileA.primary_style, profileB.primary_style);
  const comboData = COMBO_MAP[combo];

  if (comboData) {
    return {
      compatibility_score,
      strengths: comboData.strengths,
      risks: comboData.risks,
      recommendation: comboData.recommendation,
      combo_label: comboData.label,
    };
  }

  // Fallback genérico
  return {
    compatibility_score,
    strengths: [
      "Ambos perfiles tienen características únicas que pueden complementarse.",
      "La diversidad de estilos enriquece la relación.",
    ],
    risks: [
      "Las diferencias pueden generar malentendidos si no se comunican.",
      "Conviene establecer expectativas claras desde el inicio.",
    ],
    recommendation:
      "Cada relación es única. Recomendamos una sesión con un especialista para explorar las dinámicas específicas de esta combinación.",
    combo_label: "Combinación única",
  };
}
