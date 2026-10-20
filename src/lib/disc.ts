// Perfil DISC del cuestionario (/perfil): textos de cada tipo y cálculo del tipo principal, secundario y porcentajes.
// Lo usan el informe del final del cuestionario y el perfil del área del cliente (T16.1), con su PDF (generateDiscPdf).

export type DiscType = "D" | "I" | "S" | "C";

export const DISC_META: Record<DiscType, { title: string; emoji: string; description: string; bg: string; text: string; gradient: string; ring: string; fortalezas: string[]; mejoras: string[]; enPareja: string; amor: string; necesidades: string[]; conflicto: string; frase: string; compatibility: string; comunicacion: string; actividades: string }> = {
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
