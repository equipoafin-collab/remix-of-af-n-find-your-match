// Perfil DISC del cuestionario (/perfil): textos de cada tipo y cálculo del tipo principal, secundario y porcentajes.
// Lo usan el informe del final del cuestionario y el perfil del área del cliente (T16.1), con su PDF (generateDiscPdf).
// Los textos se dirigen siempre a la persona (tuteo) y hablan de querer: nunca usamos el verbo amar.

export type DiscType = "D" | "I" | "S" | "C";

export const DISC_META: Record<DiscType, { title: string; emoji: string; description: string; bg: string; text: string; gradient: string; ring: string; fortalezas: string[]; mejoras: string[]; enPareja: string; querer: string; necesidades: string[]; conflicto: string; frase: string; compatibility: string; comunicacion: string; actividades: string }> = {
  D: { title: "Dominante", emoji: "⚡", bg: "bg-red-50", text: "text-red-700", gradient: "from-red-500 to-red-600", ring: "ring-red-400",
    description: "Vas al grano, decides rápido y te gusta tomar la iniciativa.",
    fortalezas: ["Decides con rapidez y confianza", "Lideras con determinación y energía", "Afrontas los problemas de frente"],
    mejoras: ["A veces suenas impaciente o con ganas de controlarlo todo", "Te cuesta ceder el control", "Puedes restar importancia a lo que siente la otra persona"],
    enPareja: "Aportas dirección, iniciativa y energía. Te va bien una pareja que valore tu determinación y te ayude a abrirte emocionalmente.",
    querer: "Quieres a base de hechos: resuelves, proteges y buscas experiencias intensas para quien te importa.",
    necesidades: ["Autonomía y espacio para decidir", "Una pareja directa", "Retos y metas compartidas", "Respeto por tu tiempo"],
    conflicto: "Tiendes a confrontar de frente. Tu reto es escuchar antes de reaccionar.",
    frase: "\"Dame libertad para actuar y te daré el mundo.\"",
    compatibility: "Combinas mejor con perfiles S (estabilidad) e I (entusiasmo).",
    comunicacion: "Sé claro y di las cosas sin rodeos.", actividades: "Deportes de aventura, viajes espontáneos, retos en pareja." },
  I: { title: "Influyente", emoji: "✨", bg: "bg-amber-50", text: "text-amber-700", gradient: "from-amber-400 to-amber-500", ring: "ring-amber-400",
    description: "Sociable y entusiasta: necesitas conexión, diversión y sentirte admirado/a.",
    fortalezas: ["Contagias entusiasmo sin proponértelo", "Conectas con la gente con mucha facilidad", "Resuelves los conflictos con empatía"],
    mejoras: ["A veces esquivas las conversaciones difíciles", "Te lanzas por impulso", "Te cuesta sostener las rutinas"],
    enPareja: "Aportas alegría, espontaneidad y conexión. Necesitas sentirte admirado/a y escuchado/a de verdad.",
    querer: "Quieres con palabras y sorpresas: lo dices, lo celebras y mantienes la chispa viva.",
    necesidades: ["Expresión emocional abierta", "Vida social activa", "Reconocimiento", "Espacio para tu creatividad"],
    conflicto: "Buscas la armonía enseguida, a veces sin tocar el fondo del asunto.",
    frase: "\"Hazme reír y te entregaré el corazón.\"",
    compatibility: "Encajas bien con perfiles C (estructura) y S (constancia).",
    comunicacion: "Expresa lo que sientes y valora que te escuchen de verdad.", actividades: "Eventos sociales, viajes con amigos, cenas románticas." },
  S: { title: "Estable", emoji: "🌿", bg: "bg-emerald-50", text: "text-emerald-700", gradient: "from-emerald-500 to-emerald-600", ring: "ring-emerald-400",
    description: "Paciente y estable: valoras la seguridad emocional y la lealtad.",
    fortalezas: ["Das apoyo constante y lealtad", "Escuchas de verdad, sin juzgar", "Creas un entorno donde se está seguro"],
    mejoras: ["Te cuesta abrirte a los cambios", "Te guardas lo que necesitas", "Acumulas frustración sin decirlo"],
    enPareja: "Aportas calma, estabilidad y un compromiso profundo. Eres la base segura de la relación.",
    querer: "Quieres con presencia: tiempo sin prisa, cuidados cotidianos y estar ahí cuando hace falta.",
    necesidades: ["Seguridad emocional", "Tiempo para adaptarte", "Una pareja que respete tu ritmo", "Rutinas compartidas"],
    conflicto: "Evitas la confrontación y cedes para mantener la paz.",
    frase: "\"Dame seguridad y te daré toda mi lealtad.\"",
    compatibility: "Combinas con perfiles D (decisión) e I (energía).",
    comunicacion: "Necesitas tiempo para procesar; valora la paciencia.", actividades: "Tardes tranquilas, cocinar juntos, paseos por la naturaleza." },
  C: { title: "Concienzudo", emoji: "💎", bg: "bg-blue-50", text: "text-blue-700", gradient: "from-blue-500 to-blue-600", ring: "ring-blue-400",
    description: "Analítico y cuidadoso: buscas coherencia y un compromiso de verdad.",
    fortalezas: ["Planificas con cuidado y previsión", "Cuidas la calidad y la coherencia", "Aportas estructura y confianza"],
    mejoras: ["Puedes ser muy exigente contigo", "Te cuesta ser espontáneo/a", "Le das muchas vueltas a las cosas"],
    enPareja: "Aportas seguridad, planificación y atención al detalle. Te va bien una pareja que valore tu rigor.",
    querer: "Quieres con coherencia: detalles pensados, promesas que se cumplen y planes bien cuidados.",
    necesidades: ["Previsibilidad y coherencia", "Espacio para procesar lo que sientes", "Conversaciones profundas", "Respeto por tus estándares"],
    conflicto: "Te retiras y analizas antes de hablar.",
    frase: "\"Demuéstrame coherencia y te entregaré mi confianza.\"",
    compatibility: "Tu precisión se complementa con perfiles I (espontaneidad) y S (paciencia).",
    comunicacion: "Prefieres conversaciones con sentido; valoras la lógica.", actividades: "Museos, lectura compartida, planificación de viajes detallados." },
};

/**
 * Tipo principal, secundario y porcentaje de cada uno a partir de las puntuaciones (respuestas de cada letra).
 * Empates en el orden D, I, S, C (como calculateDisc). Sin puntuaciones: D e I al 0 %.
 */
export function resumenDisc(scores: Record<DiscType, number> | null) {
  const orden = scores ? (Object.entries(scores) as [DiscType, number][]).sort((a, b) => b[1] - a[1]) : [];
  const total = scores ? Object.values(scores).reduce((a, b) => a + b, 0) || 1 : 1;
  const porcentaje = (t: DiscType) => (scores ? Math.round((scores[t] / total) * 100) : 0);
  return {
    primary: orden[0]?.[0] ?? ("D" as DiscType),
    secondary: orden[1]?.[0] ?? ("I" as DiscType),
    percents: { D: porcentaje("D"), I: porcentaje("I"), S: porcentaje("S"), C: porcentaje("C") } as Record<DiscType, number>,
  };
}
