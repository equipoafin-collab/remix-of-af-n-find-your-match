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
  amor: string;
  necesidades: string[];
  conflicto: string;
  frase: string;
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
const GOLD: RGB = [176, 141, 74];
const GOLD_SOFT: RGB = [226, 210, 175];
const INK: RGB = [33, 30, 28];
const MUTED: RGB = [118, 110, 102];
const IVORY: RGB = [251, 248, 242];
const LINE: RGB = [228, 220, 205];

const DISC_COLORS: Record<DiscType, RGB> = {
  D: [168, 72, 62],
  I: [190, 145, 60],
  S: [86, 128, 98],
  C: [72, 98, 140],
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
  let y = 0;
  let seccion = 0;

  const fondo = () => {
    doc.setFillColor(...IVORY);
    doc.rect(0, 0, W, H, "F");
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

  const lista = (items: string[], color: RGB = GOLD) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    items.forEach((item) => {
      const lineas = doc.splitTextToSize(t(item), textW - 8);
      espacio(lineas.length * 6 + 2);
      doc.setDrawColor(...color);
      doc.setLineWidth(0.6);
      doc.line(M, y - 1.4, M + 3.5, y - 1.4);
      doc.setTextColor(...INK);
      lineas.forEach((l: string) => {
        doc.text(l, M + 8, y);
        y += 5.6;
      });
      y += 1.6;
    });
    y += 3;
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
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.rect(12, 12, W - 24, H - 24);
  doc.setLineWidth(0.15);
  doc.rect(14, 14, W - 28, H - 28);

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
  doc.text(t(userName), W / 2, 121, { align: "center" });

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.line(W / 2 - 15, 131, W / 2 + 15, 131);

  // Estilo principal en la portada
  const priCol = DISC_COLORS[primary];
  doc.setDrawColor(...priCol);
  doc.setLineWidth(0.8);
  doc.circle(W / 2, 165, 18);
  doc.setFont("times", "normal");
  doc.setFontSize(30);
  doc.setTextColor(...priCol);
  doc.text(primary, W / 2, 169, { align: "center" });
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text(t(`${pri.title} · ${percents[primary]}%`), W / 2, 196, { align: "center" });
  doc.setFont("times", "italic");
  doc.setFontSize(12);
  doc.setTextColor(...MUTED);
  doc.splitTextToSize(t(pri.frase), W - 80).forEach((l: string, i: number) => doc.text(l, W / 2, 210 + i * 6, { align: "center" }));

  etiqueta(new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }), M + 4, H - 26);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("Tu guía para el amor consciente", W - M - 4, H - 26, { align: "right" });

  // ── RESUMEN ──────────────────────────────
  nuevaPagina();
  titulo("Tu estilo principal");
  doc.setFont("times", "normal");
  doc.setFontSize(24);
  doc.setTextColor(...priCol);
  doc.text(t(pri.title), M, y + 2);
  y += 10;
  parrafo(pri.description, 11);

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

  // ── ANÁLISIS ─────────────────────────────
  titulo("Tus fortalezas");
  lista(pri.fortalezas, DISC_COLORS.S);
  titulo("Áreas de crecimiento");
  lista(pri.mejoras, DISC_COLORS.I);

  titulo(`${userName}, así eres en pareja`);
  parrafo(pri.enPareja);
  parrafo(
    `Como perfil ${pri.title}, tu forma de amar se caracteriza por ${primary === "D" ? "la intensidad, la protección y las decisiones firmes" : primary === "I" ? "la calidez emocional, la espontaneidad y el entusiasmo" : primary === "S" ? "la constancia, la paciencia y una lealtad inquebrantable" : "la profundidad, la reflexión y el cuidado en cada detalle"}. Tu pareja ideal es alguien que aprecie estas cualidades y, al mismo tiempo, te ayude a equilibrar tu perfil secundario ${sec.title} (${percents[secondary]}%), que aporta ${secondary === "D" ? "determinación adicional" : secondary === "I" ? "chispa y conexión social" : secondary === "S" ? "estabilidad emocional" : "estructura y análisis"} a tu forma de relacionarte.`,
    10.5, MUTED,
  );

  titulo("Tu lenguaje del amor");
  parrafo(pri.amor);

  titulo("Necesidades afectivas");
  lista(pri.necesidades);
  parrafo("Cuando estas necesidades se satisfacen, te sientes seguro/a y en tu mejor versión emocional. Si alguna falta, puedes sentir frustración o distanciamiento. Comunicarlas de forma abierta es clave.", 9.5, MUTED);

  titulo("Gestión de conflictos");
  parrafo(pri.conflicto);
  espacio(14);
  etiqueta("Influencia del estilo secundario", M, y);
  y += 6;
  parrafo(sec.conflicto, 10, MUTED);

  titulo("Compatibilidad ideal");
  parrafo(pri.compatibility);
  titulo("Comunicación en pareja");
  parrafo(pri.comunicacion);
  titulo("Planes que os acercan");
  parrafo(pri.actividades);

  titulo("Consejos prácticos");
  lista([
    "Estableced acuerdos claros y revisadlos juntos de vez en cuando para mantener la confianza.",
    "Dedica tiempo de calidad semanal sin distracciones para reforzar vuestra conexión.",
    "Practica la escucha activa: antes de responder en un conflicto, repite lo que has entendido.",
    "Celebra los avances pequeños: las relaciones sanas se construyen con gestos cotidianos.",
    "Identifica y comunica tus necesidades sin esperar que tu pareja las adivine.",
    "Respeta los ritmos emocionales del otro: no todos procesan al mismo tiempo.",
  ]);

  // Cierre
  espacio(48);
  y += 6;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.line(W / 2 - 15, y, W / 2 + 15, y);
  y += 12;
  doc.setFont("times", "italic");
  doc.setFontSize(15);
  doc.setTextColor(...INK);
  doc.text(t(`${userName}, tu perfil es una guía para amar mejor.`), W / 2, y, { align: "center" });
  y += 9;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  doc.splitTextToSize(t("Este informe es el punto de partida. En tu sesión con nuestra especialista profundizaremos en cada aspecto y diseñaremos un camino personalizado para ti."), textW - 30)
    .forEach((l: string) => { doc.text(l, W / 2, y, { align: "center" }); y += 5; });

  // ── PLANES ───────────────────────────────
  nuevaPagina();
  titulo("Nuestros planes");
  parrafo(`${userName}, ahora que conoces tu perfil, el siguiente paso es trabajar con nuestra especialista en sesiones personales para conocer a la persona ideal para ti.`, 10.5, MUTED);
  y += 6;

  const cw = (textW - 10) / 2;
  const ch = 78;
  const planes = [
    { nombre: "Esencial", precio: "160€", x: M, destacado: false, items: ["1 sesión mensual de 60 min", "Presentaciones compatibles", "Feedback personal tras la cita"] },
    { nombre: "Premium", precio: "250€", x: M + cw + 10, destacado: true, items: ["2 sesiones mensuales", "Presentaciones prioritarias", "Verificación de antecedentes"] },
  ];
  planes.forEach((p) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...(p.destacado ? GOLD : LINE));
    doc.setLineWidth(p.destacado ? 0.6 : 0.3);
    doc.rect(p.x, y, cw, ch, "FD");
    const cx = p.x + cw / 2;
    if (p.destacado) etiqueta("Recomendado", cx - 9, y + 10, GOLD);
    doc.setFont("times", "normal");
    doc.setFontSize(17);
    doc.setTextColor(...INK);
    doc.text(p.nombre, cx, y + 22, { align: "center" });
    doc.setFontSize(28);
    doc.setTextColor(...GOLD);
    doc.text(t(p.precio), cx, y + 38, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("al mes", cx, y + 44, { align: "center" });
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(p.x + 10, y + 50, p.x + cw - 10, y + 50);
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    p.items.forEach((it, i) => doc.text(t(it), cx, y + 58 + i * 6.5, { align: "center" }));
  });
  y += ch + 14;
  parrafo("Reserva tu primera sesión gratuita de 15 minutos y descubre cómo podemos ayudarte a encontrar a tu persona.", 10.5, MUTED, "italic");

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
