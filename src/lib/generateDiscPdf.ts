import jsPDF from "jspdf";
import { aWinAnsi } from "@/lib/informePdf";

type DiscType = "D" | "I" | "S" | "C";

interface DiscMeta {
  title: string;
  emoji: string;
  description: string;
  fortalezas: string[];
  mejoras: string[];
  enPareja: string;
  querer: string;
  necesidades: string[];
  conflicto: string;
  compatibility: string;
  comunicacion: string;
  actividades: string;
}

interface PdfParams {
  userName: string;
  primary: DiscType;
  secondary: DiscType;
  percents: Record<DiscType, number>;
  pri: DiscMeta;
  sec: DiscMeta;
}

type RGB = [number, number, number];

// Paleta editorial: marfil, tinta y oro viejo; los colores DISC, apagados.
// Estilo cósmico: noche profunda, estrellas y oro.
const GOLD: RGB = [222, 190, 120];
const GOLD_SOFT: RGB = [140, 118, 80];
const INK: RGB = [240, 236, 228];
const MUTED: RGB = [168, 166, 190];
const IVORY: RGB = [18, 34, 72]; // azul marino corporativo
const LINE: RGB = [62, 84, 130];

const DISC_COLORS: Record<DiscType, RGB> = {
  D: [236, 120, 132],
  I: [240, 196, 110],
  S: [120, 214, 178],
  C: [130, 168, 255],
};

const DISC_LABELS: Record<DiscType, string> = { D: "Dominante", I: "Influyente", S: "Estable", C: "Concienzudo" };

const M = 22; // margen lateral
const TOP = 28;
const BOTTOM = 270;

const t = (s: string) => aWinAnsi(s);

export function generateDiscPdf({ userName, primary, secondary, percents, pri, sec }: PdfParams) {
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const textW = W - M * 2;
  // El nombre se muestra siempre con la inicial en mayúscula.
  const nombre = userName.charAt(0).toUpperCase() + userName.slice(1);
  let y = 0;
  let seccion = 0;

  // Estrellas con semilla fija para que cada página sea distinta pero estable.
  let semilla = 7;
  const azar = () => ((semilla = (semilla * 9301 + 49297) % 233280) / 233280);
  const nebulosa = (x: number, yy: number, r: number, c: RGB) => {
    for (let k = 6; k >= 1; k--) {
      doc.setGState(doc.GState({ opacity: 0.035 }));
      doc.setFillColor(...c);
      doc.circle(x, yy, (r * k) / 6, "F");
    }
    doc.setGState(doc.GState({ opacity: 1 }));
  };
  const fondo = () => {
    doc.setFillColor(...IVORY);
    doc.rect(0, 0, W, H, "F");
    nebulosa(W * 0.85, H * 0.12, 70, [110, 80, 200]);
    nebulosa(W * 0.1, H * 0.8, 80, [40, 90, 170]);
    for (let k = 0; k < 140; k++) {
      const op = 0.25 + azar() * 0.75;
      doc.setGState(doc.GState({ opacity: op }));
      doc.setFillColor(...(azar() > 0.85 ? GOLD : ([255, 255, 255] as RGB)));
      doc.circle(azar() * W, azar() * H, azar() > 0.93 ? 0.55 : 0.22, "F");
    }
    doc.setGState(doc.GState({ opacity: 1 }));
  };
  const nuevaPagina = () => {
    doc.addPage();
    fondo();
    y = TOP;
  };
  const espacio = (n: number) => {
    if (y + n > BOTTOM) nuevaPagina();
  };

  const titulo = (texto: string) => {
    espacio(30);
    seccion++;
    y += 4;
    doc.setFont("times", "italic");
    doc.setFontSize(11);
    doc.setTextColor(...GOLD);
    doc.text(String(seccion).padStart(2, "0"), M, y);
    doc.setFont("times", "normal");
    doc.setFontSize(17);
    doc.setTextColor(...INK);
    doc.text(t(texto), M + 11, y);
    y += 4;
    doc.setDrawColor(...GOLD_SOFT);
    doc.setLineWidth(0.3);
    doc.line(M, y, M + 28, y);
    y += 9;
  };

  const parrafo = (texto: string, size = 10.5, color: RGB = INK, estilo: "normal" | "italic" = "normal") => {
    doc.setFont(estilo === "italic" ? "times" : "helvetica", estilo);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lh = size * 0.5 + 0.8;
    doc.splitTextToSize(t(texto), textW).forEach((l: string) => {
      espacio(lh);
      doc.text(l, M, y);
      y += lh;
    });
    y += 4;
  };

  const etiqueta = (texto: string, x: number, yy: number, color: RGB = MUTED) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...color);
    doc.setCharSpace(1.2);
    doc.text(t(texto.toUpperCase()), x, yy);
    doc.setCharSpace(0);
  };

  // ── PORTADA ──────────────────────────────
  fondo();
  doc.setFont("times", "normal");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.setCharSpace(4);
  doc.text("AFÍN", W / 2, 40, { align: "center" });
  doc.setCharSpace(0);
  etiqueta("Matchmaking profesional", W / 2 - 22, 47);

  etiqueta("Informe de personalidad", W / 2 - 21, 92, GOLD);
  doc.setFont("times", "normal");
  doc.setFontSize(34);
  doc.setTextColor(...INK);
  doc.text("Perfil DISC", W / 2, 108, { align: "center" });
  doc.setFont("times", "italic");
  doc.setFontSize(18);
  doc.setTextColor(...MUTED);
  doc.text(t(nombre), W / 2, 121, { align: "center" });

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.line(W / 2 - 15, 131, W / 2 + 15, 131);

  // Estilo principal en la portada
  const priCol = DISC_COLORS[primary];
  nebulosa(W / 2, 165, 45, priCol);
  doc.setDrawColor(...GOLD_SOFT);
  doc.setLineWidth(0.15);
  doc.ellipse(W / 2, 165, 38, 11);
  doc.ellipse(W / 2, 165, 28, 28);
  doc.setFillColor(...GOLD);
  doc.circle(W / 2 + 38, 165, 1.1, "F");
  doc.circle(W / 2 - 20, 145.5, 0.8, "F");
  doc.setDrawColor(...priCol);
  doc.setLineWidth(0.8);
  doc.circle(W / 2, 165, 18);
  doc.setFont("times", "normal");
  doc.setFontSize(30);
  doc.setTextColor(...priCol);
  doc.text(primary, W / 2, 169, { align: "center" });
  doc.setFontSize(22);
  doc.setTextColor(...INK);
  doc.text(t(pri.title), W / 2, 199, { align: "center" });
  doc.setFontSize(46);
  doc.setTextColor(...priCol);
  doc.text(`${percents[primary]}%`, W / 2, 218, { align: "center" });

  etiqueta(new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }), M + 4, H - 26);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("Tu guía para querer mejor", W - M - 4, H - 26, { align: "right" });

  // ── RESUMEN ──────────────────────────────
  nuevaPagina();
  titulo("Tu estilo principal");
  doc.setFont("times", "normal");
  doc.setFontSize(24);
  doc.setTextColor(...priCol);
  doc.text(t(pri.title), M, y + 2);
  y += 10;
  parrafo(pri.description, 11);
  parrafo(`${nombre}, este resultado recoge cómo has respondido hoy. No cuenta todo lo que eres ni determina con quién vas a encajar. Puede ayudarte a poner palabras a esas cosas que a veces notas cuando conoces a alguien: qué te da confianza, qué te cuesta decir y qué necesitas para estar a gusto.`, 10.5, MUTED);
  parrafo("El porcentaje más alto señala el estilo que más aparece en tus respuestas, no cuánto vales como pareja. Todos tenemos algo de los cuatro estilos, y podemos actuar de forma distinta según la persona, el momento y la confianza que tengamos.", 10, MUTED);

  titulo("Distribución DISC");
  (["D", "I", "S", "C"] as DiscType[]).forEach((type) => {
    const col = DISC_COLORS[type];
    const destacado = type === primary || type === secondary;
    doc.setFont("times", destacado ? "bold" : "normal");
    doc.setFontSize(13);
    doc.setTextColor(...(destacado ? col : MUTED));
    doc.text(type, M, y + 1);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...(destacado ? INK : MUTED));
    doc.text(DISC_LABELS[type], M + 8, y + 1);
    const bx = M + 40;
    const bw = textW - 54;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.8);
    doc.line(bx, y, bx + bw, y);
    if (percents[type] > 0) {
      doc.setDrawColor(...col);
      doc.setLineWidth(2.2);
      doc.line(bx, y, bx + (bw * percents[type]) / 100, y);
    }
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...(destacado ? INK : MUTED));
    doc.text(`${percents[type]}%`, W - M, y + 1, { align: "right" });
    y += 11;
  });
  y += 4;

  // Secundario
  espacio(28);
  const secCol = DISC_COLORS[secondary];
  doc.setDrawColor(...secCol);
  doc.setLineWidth(0.6);
  doc.line(M, y - 3, M, y + 15);
  etiqueta(`Estilo secundario · ${percents[secondary]}%`, M + 5, y);
  doc.setFont("times", "normal");
  doc.setFontSize(14);
  doc.setTextColor(...secCol);
  doc.text(t(sec.title), M + 5, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  doc.text(doc.splitTextToSize(t(sec.description), textW - 8)[0] ?? "", M + 5, y + 13);
  y += 24;
  parrafo(`Además de tu estilo ${pri.title.toLowerCase()}, aparece un lado ${sec.title.toLowerCase()} en tus respuestas. ${sec.enPareja} Quizá lo reconozcas más cuando ya tienes confianza con alguien. No necesitas encajar en una sola descripción: quédate con lo que te resulte familiar y comenta lo que no te representa.`, 10, MUTED);

  // ── ANÁLISIS ─────────────────────────────
  titulo("Tus fortalezas");
  const fortalezas: Record<DiscType, string> = {
    D: "Cuando algo te importa, te implicas y buscas cómo hacerlo posible. Si hay que organizar una cita o resolver un problema, no sueles quedarte esperando. En una relación, esa iniciativa puede dar mucha seguridad: la otra persona nota que puede contar contigo. Y cuando haces sitio a su opinión, tus ganas de avanzar se convierten en un proyecto de los dos.",
    I: "Te suele salir acercarte, sacar conversación y compartir lo que te ilusiona. Puedes hacer que una primera cita se sienta menos tensa y que la otra persona se anime a hablar. En pareja, aportas ganas de hacer cosas juntos y de expresar el cariño. También sabes notar cuándo alguien necesita un gesto cercano, una llamada o que le preguntes cómo está de verdad.",
    S: "Tu manera de cuidar se nota en el día a día: escuchar, acordarte de lo que le preocupa a la otra persona y estar cuando hace falta. No necesitas montar un gran plan para demostrar interés. En una relación, esa constancia ayuda a que haya confianza. Cuando tú también cuentas lo que necesitas, el cuidado deja de ir en una sola dirección y podéis apoyaros mutuamente.",
    C: "Te fijas en los detalles y te importa que lo que alguien dice tenga sentido con lo que hace. Cuando te comprometes, procuras cumplir. Eso puede dar tranquilidad a tu pareja: sabe que te tomas la relación en serio. Un plan pensado con cuidado o recordar algo importante para la otra persona son formas muy tuyas de mostrar que te interesa.",
  };
  parrafo(fortalezas[primary]);
  titulo("Áreas de crecimiento");
  const mejoras: Record<DiscType, string> = {
    D: "Cuando quieres resolver algo rápido, puedes ir por delante de la otra persona sin darte cuenta. Antes de decidir un plan por los dos, prueba a preguntarle qué le apetece. Y si te cuenta algo que le preocupa, escucha un poco antes de ofrecer una solución. A veces no necesita que lo arregles: necesita que entiendas cómo se siente.",
    I: "Cuando hay buena conexión, es fácil dejarse llevar por las ganas. Date tiempo para comprobar cómo os tratáis también en los días normales, no solo cuando todo es nuevo. Si algo te molesta, intenta contarlo aunque te dé miedo estropear el buen ambiente. Hablarlo con calma suele acercaros más que hacer como si no pasara nada.",
    S: "A veces puedes ceder para que todo esté tranquilo, aunque el plan no te apetezca o algo te haya dolido. Intenta decirlo cuando todavía es una molestia pequeña. Puedes empezar con algo sencillo: explicar qué pasó, cómo te sentiste y qué te gustaría hacer distinto. Tus preferencias también cuentan; no tienes que esperar a estar muy cansado de una situación para hablar.",
    C: "Puedes darle muchas vueltas a un mensaje o esperar a tener todo claro antes de dar un paso. Si tienes una duda, preguntar suele ayudarte más que intentar adivinar. También puedes proponer una cita sencilla sin tener cada detalle cerrado. Conocer a alguien lleva tiempo, y no hace falta acertar en todo desde el primer día.",
  };
  parrafo(mejoras[primary]);
  parrafo("No se trata de cambiar tu personalidad para gustar. Se trata de reconocer qué haces cuando estás nervioso, ilusionado o preocupado, y tener alguna alternativa que te ayude a relacionarte mejor.", 10, MUTED);

  titulo(`${nombre}, así eres en pareja`);
  parrafo(pri.enPareja);
  parrafo(
    `Así quieres tú: ${primary === "D" ? "con intensidad, protegiendo y decidiendo rápido" : primary === "I" ? "con calidez, sorpresas y muchas ganas" : primary === "S" ? "con constancia, paciencia y una lealtad que no falla" : "a fondo, pensando cada detalle"}. Te va bien alguien que lo valore y, a la vez, te ayude a compensar tu perfil secundario ${sec.title} (${percents[secondary]}%), que te da ${secondary === "D" ? "un punto más de decisión" : secondary === "I" ? "chispa y ganas de estar con gente" : secondary === "S" ? "calma emocional" : "orden y cabeza"}.`,
    10.5, MUTED,
  );

  titulo("Tu forma de querer");
  parrafo(pri.querer);
  parrafo("Piensa en cómo sueles demostrar interés cuando alguien te gusta. Puede que para ti esté clarísimo y que la otra persona no lo interprete igual. Contarle cómo expresas el cariño y preguntarle qué le hace sentirse tenida en cuenta evita muchos malentendidos. No tenéis que hacerlo todo igual para entenderos.", 10.5, MUTED);

  titulo("Lo que necesitas");
  parrafo(`En tus respuestas aparecen necesidades relacionadas con ${pri.necesidades.map((n) => n.charAt(0).toLowerCase() + n.slice(1)).join(", ")}. Fíjate en cuáles tienen más peso para ti: quizá disfrutes de muchos planes juntos, pero también necesites tiempo a solas; o quizá te importe más la constancia que hablar durante horas.`);
  parrafo("Cuando algo te falta, puede que te frustres o te alejes sin explicarlo. Intenta poner un ejemplo concreto de lo que necesitas: tener tiempo para pensar después de una discusión, acordar cuándo os vais a ver o recibir una llamada en un día complicado. Así la otra persona puede entenderte sin tener que adivinar.", 10.5, MUTED);

  titulo("Gestión de conflictos");
  parrafo(pri.conflicto);
  espacio(14);
  etiqueta("Influencia del estilo secundario", M, y);
  y += 6;
  parrafo(sec.conflicto, 10, MUTED);
  parrafo("Una discusión no tiene que resolverse en el momento. Si os estáis haciendo daño al hablar, podéis parar y acordar cuándo retomarlo. Al volver, céntrate en lo que pasó y en cómo te afectó, en lugar de repasar todos los errores anteriores. Escuchar no significa darle la razón en todo: significa intentar entender qué le preocupa.", 10.5, MUTED);

  titulo("Compatibilidad ideal");
  parrafo(pri.compatibility);
  parrafo("Estos estilos son una orientación, no una lista de personas que debas buscar o descartar. La compatibilidad también depende de vuestros valores, de cómo queréis vivir y de si buscáis el mismo tipo de relación. Observa si puedes hablar con naturalidad, si se respetan tus límites y si lo que te cuenta esa persona se corresponde con lo que hace.", 10.5, MUTED);
  titulo("Comunicación en pareja");
  parrafo(pri.comunicacion);
  titulo("Planes que os acercan");
  parrafo(pri.actividades);

  titulo("Consejos prácticos");
  parrafo("Si estás conociendo a alguien, no tienes que decidir enseguida si será tu pareja. Después de cada cita, pregúntate cómo te has sentido: si has podido ser tú, si te han escuchado y si te apetece volver a verle. La ilusión importa, pero también importa estar a gusto sin tener que esforzarte todo el rato por impresionar.");
  parrafo("Si ya tienes pareja, buscad un rato sin móviles para contaros cómo estáis. Podéis empezar por algo que os haya gustado de esa semana y algo que necesitéis mejorar. Los acuerdos pequeños y concretos, como avisar si vais a llegar tarde o reservar tiempo juntos, son más fáciles de cumplir que prometer que todo va a cambiar.");

  // Cierre
  espacio(62);
  y += 6;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.line(W / 2 - 15, y, W / 2 + 15, y);
  y += 12;
  doc.setFont("times", "italic");
  doc.setFontSize(15);
  doc.setTextColor(...INK);
  doc.splitTextToSize(t(`${nombre}, quédate con lo que te ayude a conocerte mejor.`), textW - 20).forEach((line: string) => {
    doc.text(line, W / 2, y, { align: "center" });
    y += 7;
  });
  y += 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  doc.splitTextToSize(t("Este informe es el punto de partida. En tu sesión con nuestra especialista profundizaremos en cada aspecto y diseñaremos un camino personalizado para ti."), textW - 30)
    .forEach((l: string) => { doc.text(l, W / 2, y, { align: "center" }); y += 5; });

  // ── ACOMPAÑAMIENTO ───────────────────────
  nuevaPagina();
  titulo("Tu siguiente paso con Afín");
  parrafo("¿Y si por el precio de una sesión de psicología pudieras dar un paso mucho más grande en tu vida sentimental?", 17, GOLD, "italic");
  parrafo("En Afín no somos una aplicación de citas. Somos psicólogos especializados en relaciones de pareja que te acompañamos en un proceso de autoconocimiento y búsqueda de pareja.", 11);
  parrafo("Analizamos tu personalidad, tus valores, tus prioridades y lo que realmente necesitas para encontrar a alguien compatible contigo.", 11);
  parrafo("Porque encontrar pareja no debería ser cuestión de suerte, sino de conocerte y saber elegir.", 11);
  parrafo("En una sesión podemos comentar qué partes de este informe te representan y cuáles no, hablar de tus experiencias y aclarar qué buscas ahora. No tienes que traer todas las respuestas: podemos empezar por lo que te preocupa o por lo que te gustaría que fuera diferente en tu próxima relación.", 10.5, MUTED);
  parrafo("Tu próxima relación puede empezar aquí.", 17, GOLD, "italic");

  // ── PIE (todas menos la portada) ─────────
  const total = doc.getNumberOfPages();
  for (let i = 2; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(M, H - 16, W - M, H - 16);
    doc.setFont("times", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.setCharSpace(2);
    doc.text("AFÍN", M, H - 10);
    doc.setCharSpace(0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("Confidencial · personal e intransferible", W / 2, H - 10, { align: "center" });
    doc.text(`${i - 1} / ${total - 1}`, W - M, H - 10, { align: "right" });
  }

  doc.save(`informe-disc-${userName.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}
