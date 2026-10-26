// Perfil DISC del cuestionario (/perfil): textos de cada tipo y cálculo del tipo principal, secundario y porcentajes.
// Lo usan el informe del final del cuestionario y el perfil del área del cliente (T16.1), con su PDF (generateDiscPdf).
// Los textos se dirigen siempre a la persona (tuteo), en lenguaje de calle, y hablan de querer: nunca usamos el verbo amar.

export type DiscType = "D" | "I" | "S" | "C";

export const DISC_META: Record<DiscType, { title: string; emoji: string; description: string; bg: string; text: string; gradient: string; ring: string; fortalezas: string[]; mejoras: string[]; enPareja: string; querer: string; necesidades: string[]; conflicto: string; frase: string; compatibility: string; comunicacion: string; actividades: string }> = {
  D: { title: "Dominante", emoji: "⚡", bg: "bg-red-50", text: "text-red-700", gradient: "from-red-500 to-red-600", ring: "ring-red-400",
    description: "Vas al grano, decides rápido y te gusta llevar la iniciativa.",
    fortalezas: ["Decides con rapidez y confianza", "Tiras del carro con energía", "Afrontas los problemas de frente"],
    mejoras: ["A veces suenas impaciente o con ganas de controlarlo todo", "Te cuesta ceder el control", "Puedes quitarle importancia a lo que siente el otro"],
    enPareja: "Aportas dirección, iniciativa y energía. Te va bien alguien que valore tu empuje y te ayude a contar lo que sientes.",
    querer: "Quieres haciendo cosas: resuelves, proteges y preparas planes con ganas.",
    necesidades: ["Autonomía y espacio para decidir", "Una pareja directa", "Retos y metas compartidas", "Respeto por tu tiempo"],
    conflicto: "Vas de frente y discutes sin rodeos. Te toca escuchar antes de contestar.",
    frase: "\"Déjame actuar y no te fallaré.\"",
    compatibility: "Combinas mejor con perfiles S (estabilidad) e I (entusiasmo).",
    comunicacion: "Dilo claro y sin rodeos.", actividades: "Deportes de aventura, viajes espontáneos, retos en pareja." },
  I: { title: "Influyente", emoji: "✨", bg: "bg-amber-50", text: "text-amber-700", gradient: "from-amber-400 to-amber-500", ring: "ring-amber-400",
    description: "Sociable y entusiasta: necesitas conexión, diversión y que te lo digan.",
    fortalezas: ["Contagias las ganas sin proponértelo", "Hablás con cualquiera con facilidad", "Arreglas los roces con empatía"],
    mejoras: ["A veces esquivas las conversaciones difíciles", "Te lanzas por impulso", "Te cuesta sostener las rutinas"],
    enPareja: "Aportas alegría, espontaneidad y ganas de estar con gente. Necesitas que te lo digan y te escuchen.",
    querer: "Quieres con palabras y sorpresas: lo dices, lo celebras y no dejas que se apague la chispa.",
    necesidades: ["Que te digan lo que sientes", "Vida social activa", "Reconocimiento", "Espacio para tu creatividad"],
    conflicto: "Buscas arreglarlo rápido, a veces sin hablar de lo de verdad.",
    frase: "\"Hazme reír y te lo doy todo.\"",
    compatibility: "Encajas bien con perfiles C (estructura) y S (constancia).",
    comunicacion: "Cuenta lo que sientes y deja que te escuchen.", actividades: "Eventos sociales, viajes con amigos, cenas románticas." },
  S: { title: "Estable", emoji: "🌿", bg: "bg-emerald-50", text: "text-emerald-700", gradient: "from-emerald-500 to-emerald-600", ring: "ring-emerald-400",
    description: "Paciente y estable: valoras la tranquilidad y la lealtad.",
    fortalezas: ["Das apoyo constante y lealtad", "Escuchas de verdad, sin juzgar", "Creas un ambiente donde se está tranquilo"],
    mejoras: ["Te cuesta abrirte a los cambios", "Te guardas lo que necesitas", "Acumulas enfados sin decirlos"],
    enPareja: "Aportas calma, estabilidad y compromiso. Eres la persona que sujeta la relación en los días flojos.",
    querer: "Quieres estando ahí: tiempo sin prisa, detalles de cada día y poder contar contigo.",
    necesidades: ["Tranquilidad y seguridad", "Tiempo para adaptarte", "Una pareja que respete tu ritmo", "Rutinas compartidas"],
    conflicto: "Evitas discutir y cedes para que no haya tensión.",
    frase: "\"Dame tranquilidad y te doy mi lealtad.\"",
    compatibility: "Combinas con perfiles D (decisión) e I (energía).",
    comunicacion: "Necesitas tiempo para pensarlo; la paciencia te ayuda.", actividades: "Tardes tranquilas, cocinar juntos, paseos por la naturaleza." },
  C: { title: "Concienzudo", emoji: "💎", bg: "bg-blue-50", text: "text-blue-700", gradient: "from-blue-500 to-blue-600", ring: "ring-blue-400",
    description: "Analítico y cuidadoso: buscas coherencia y un compromiso de verdad.",
    fortalezas: ["Planificas con cuidado", "Cuidas la calidad y la coherencia", "Aportas estructura y confianza"],
    mejoras: ["Puedes ser muy exigente contigo", "Te cuesta improvisar", "Le das muchas vueltas a las cosas"],
    enPareja: "Aportas seguridad, planificación y cuidado por el detalle. Te va bien alguien que valore tu rigor.",
    querer: "Quieres con hechos constantes: detalles pensados, promesas que se cumplen y planes bien organizados.",
    necesidades: ["Que las cosas sean previsibles", "Espacio para pensar lo que sientes", "Conversaciones profundas", "Respeto por tus formas"],
    conflicto: "Te callas, lo piensas y luego hablas.",
    frase: "\"Sé coherente y te doy mi confianza.\"",
    compatibility: "Tu precisión se complementa con perfiles I (espontaneidad) y S (paciencia).",
    comunicacion: "Te van las conversaciones con sentido y con lógica.", actividades: "Museos, lectura compartida, planificación de viajes detallados." },
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
