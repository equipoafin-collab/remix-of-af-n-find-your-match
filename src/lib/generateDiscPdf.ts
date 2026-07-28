import jsPDF from "jspdf";

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

// Brand colors
const GOLD: [number, number, number] = [191, 155, 80];
const DARK: [number, number, number] = [28, 25, 23];
const CREAM: [number, number, number] = [250, 247, 240];
const MUTED: [number, number, number] = [120, 113, 108];

const DISC_COLORS: Record<DiscType, [number, number, number]> = {
  D: [220, 60, 60],
  I: [217, 165, 32],
  S: [46, 160, 100],
  C: [60, 105, 200],
};

const DISC_LABELS: Record<DiscType, string> = {
  D: "Dominante",
  I: "Influyente",
  S: "Estable",
  C: "Concienzudo",
};

function checkPage(doc: jsPDF, y: number, needed = 30): number {
  if (y + needed > 275) {
    doc.addPage();
    return 25;
  }
  return y;
}

function drawSectionHeader(doc: jsPDF, title: string, y: number, pageW: number): number {
  y = checkPage(doc, y, 20);
  // Gold accent bar
  doc.setFillColor(...GOLD);
  doc.roundedRect(15, y - 1, 4, 10, 2, 2, "F");
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(title, 24, y + 7);
  // Subtle line
  doc.setDrawColor(230, 225, 215);
  doc.setLineWidth(0.3);
  doc.line(24, y + 11, pageW - 15, y + 11);
  return y + 17;
}

function drawParagraph(doc: jsPDF, text: string, x: number, y: number, maxW: number, fontSize = 10): number {
  doc.setFontSize(fontSize);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK);
  const lines = doc.splitTextToSize(text, maxW);
  lines.forEach((line: string) => {
    y = checkPage(doc, y);
    doc.text(line, x, y);
    y += fontSize * 0.45 + 1.5;
  });
  return y + 2;
}

function drawBulletList(doc: jsPDF, items: string[], x: number, y: number, maxW: number, bulletColor: [number, number, number] = GOLD): number {
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK);
  items.forEach((item) => {
    y = checkPage(doc, y);
    doc.setFillColor(...bulletColor);
    doc.circle(x + 2, y - 1.2, 1.5, "F");
    const lines = doc.splitTextToSize(item, maxW - 10);
    lines.forEach((line: string, li: number) => {
      y = checkPage(doc, y);
      doc.text(line, x + 7, y);
      y += 5;
    });
    y += 1;
  });
  return y + 2;
}

export function generateDiscPdf({ userName, primary, secondary, percents, pri, sec }: PdfParams) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let y = 0;

  // ═══════════════════════════════════════
  // PAGE 1 — COVER
  // ═══════════════════════════════════════

  // Dark header block
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, 75, "F");

  // Gold accent line
  doc.setFillColor(...GOLD);
  doc.rect(0, 73, pageW, 3, "F");

  // Brand name
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("AFÍN", 15, 20);

  // Decorative dots
  doc.setFontSize(10);
  doc.setTextColor(...GOLD);
  doc.text("◆  ◆  ◆", pageW / 2, 20, { align: "center" });

  // Date
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  doc.text(
    new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }),
    pageW - 15, 20, { align: "right" }
  );

  // Title
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Informe de Personalidad", pageW / 2, 42, { align: "center" });

  // Subtitle
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GOLD);
  doc.text(`Perfil DISC de ${userName}`, pageW / 2, 55, { align: "center" });

  // Tagline
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.text("Tu guía personalizada para el amor consciente", pageW / 2, 65, { align: "center" });

  y = 90;

  // ═══════════════════════════════════════
  // PRIMARY PROFILE CARD
  // ═══════════════════════════════════════
  const priColor = DISC_COLORS[primary];

  // Card background
  doc.setFillColor(priColor[0], priColor[1], priColor[2]);
  doc.roundedRect(15, y, pageW - 30, 35, 4, 4, "F");

  // Overlay for readability
  doc.setFillColor(0, 0, 0);
  doc.setGState(doc.GState({ opacity: 0.25 }));
  doc.roundedRect(15, y, pageW - 30, 35, 4, 4, "F");
  doc.setGState(doc.GState({ opacity: 1 }));

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(255, 255, 255);
  doc.text("TU PERFIL PRINCIPAL", 25, y + 12);

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(`${pri.title}  —  ${percents[primary]}%`, 25, y + 26);

  y += 45;

  // Quote
  doc.setFontSize(12);
  doc.setFont("helvetica", "bolditalic");
  doc.setTextColor(...GOLD);
  doc.text(pri.frase, pageW / 2, y, { align: "center" });
  y += 10;

  // Description
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK);
  const descLines = doc.splitTextToSize(pri.description, pageW - 40);
  doc.text(descLines, 20, y);
  y += descLines.length * 5 + 8;

  // ═══════════════════════════════════════
  // DISC DISTRIBUTION BARS
  // ═══════════════════════════════════════
  y = drawSectionHeader(doc, "Distribución DISC", y, pageW);

  const barMaxW = pageW - 80;
  (["D", "I", "S", "C"] as DiscType[]).forEach((type) => {
    y = checkPage(doc, y, 12);
    const col = DISC_COLORS[type];
    const pct = percents[type];
    const isPrimary = type === primary;

    // Label
    doc.setFontSize(isPrimary ? 11 : 10);
    doc.setFont("helvetica", isPrimary ? "bold" : "normal");
    doc.setTextColor(...(isPrimary ? DARK : MUTED));
    doc.text(`${type} — ${DISC_LABELS[type]}`, 20, y + 1);

    // Bar background
    doc.setFillColor(235, 232, 225);
    doc.roundedRect(55, y - 4, barMaxW, 7, 3, 3, "F");

    // Bar filled
    const fillW = Math.max((pct / 100) * barMaxW, 5);
    doc.setFillColor(...col);
    doc.roundedRect(55, y - 4, fillW, 7, 3, 3, "F");

    // Percentage
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...col);
    doc.text(`${pct}%`, 55 + barMaxW + 4, y + 1);

    y += 13;
  });
  y += 4;

  // ═══════════════════════════════════════
  // SECONDARY PROFILE
  // ═══════════════════════════════════════
  y = checkPage(doc, y, 30);
  const secColor = DISC_COLORS[secondary];
  doc.setFillColor(secColor[0], secColor[1], secColor[2]);
  doc.setGState(doc.GState({ opacity: 0.12 }));
  doc.roundedRect(15, y, pageW - 30, 22, 3, 3, "F");
  doc.setGState(doc.GState({ opacity: 1 }));

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...secColor);
  doc.text(`PERFIL SECUNDARIO: ${sec.title.toUpperCase()} — ${percents[secondary]}%`, 22, y + 9);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  const secDesc = doc.splitTextToSize(sec.description, pageW - 50);
  doc.text(secDesc[0] || "", 22, y + 16);
  y += 28;

  // ═══════════════════════════════════════
  // PAGE 2+ — DEEP DIVE
  // ═══════════════════════════════════════

  // FORTALEZAS
  y = drawSectionHeader(doc, "✦  Tus fortalezas", y, pageW);
  y = drawBulletList(doc, pri.fortalezas, 20, y, pageW - 35, [46, 160, 100]);

  // ÁREAS DE MEJORA
  y = drawSectionHeader(doc, "⚡  Áreas de mejora", y, pageW);
  y = drawBulletList(doc, pri.mejoras, 20, y, pageW - 35, [217, 165, 32]);

  // EN PAREJA
  y = drawSectionHeader(doc, `💛  ${userName}, así eres en pareja`, y, pageW);
  y = drawParagraph(doc, pri.enPareja, 20, y, pageW - 35);

  // Expanded couple narrative
  const coupleNarrative = `Como perfil ${pri.title}, tu forma de amar se caracteriza por ${primary === "D" ? "la intensidad, la protección y las decisiones firmes" : primary === "I" ? "la calidez emocional, la espontaneidad y el entusiasmo" : primary === "S" ? "la constancia, la paciencia y una lealtad inquebrantable" : "la profundidad, la reflexión y el cuidado en cada detalle"}. Tu pareja ideal es alguien que aprecie estas cualidades y, al mismo tiempo, te ayude a equilibrar tu perfil secundario ${sec.title} (${percents[secondary]}%), que aporta ${secondary === "D" ? "determinación adicional" : secondary === "I" ? "chispa y conexión social" : secondary === "S" ? "estabilidad emocional" : "estructura y análisis"} a tu forma de relacionarte.`;
  y = drawParagraph(doc, coupleNarrative, 20, y, pageW - 35);

  // LENGUAJE DEL AMOR
  y = drawSectionHeader(doc, "❤️  Tu lenguaje del amor", y, pageW);
  y = drawParagraph(doc, pri.amor, 20, y, pageW - 35);

  // NECESIDADES AFECTIVAS
  y = drawSectionHeader(doc, "🌟  Necesidades afectivas", y, pageW);
  y = drawBulletList(doc, pri.necesidades, 20, y, pageW - 35);

  // Additional context
  const needsContext = `Cuando estas necesidades se satisfacen, te sientes seguro/a y en tu mejor versión emocional. Si alguna de ellas falta, puedes experimentar frustración, distanciamiento o el deseo de protegerte cerrándote emocionalmente. Comunicar estas necesidades de forma abierta es clave.`;
  y = drawParagraph(doc, needsContext, 20, y, pageW - 35, 9);

  // GESTIÓN DE CONFLICTOS
  y = drawSectionHeader(doc, "🔥  Gestión de conflictos", y, pageW);
  y = drawParagraph(doc, pri.conflicto, 20, y, pageW - 35);

  // Secondary conflict influence
  y = checkPage(doc, y, 15);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...MUTED);
  doc.text("Influencia del perfil secundario:", 20, y);
  y += 5;
  y = drawParagraph(doc, sec.conflicto, 20, y, pageW - 35, 9);

  // COMPATIBILIDAD
  y = drawSectionHeader(doc, "🤝  Compatibilidad ideal", y, pageW);
  y = drawParagraph(doc, pri.compatibility, 20, y, pageW - 35);

  // COMUNICACIÓN
  y = drawSectionHeader(doc, "💬  Comunicación en pareja", y, pageW);
  y = drawParagraph(doc, pri.comunicacion, 20, y, pageW - 35);

  // ACTIVIDADES
  y = drawSectionHeader(doc, "🎯  Actividades sugeridas", y, pageW);
  y = drawParagraph(doc, pri.actividades, 20, y, pageW - 35);

  // ═══════════════════════════════════════
  // PRACTICAL TIPS
  // ═══════════════════════════════════════
  y = drawSectionHeader(doc, "📋  Consejos prácticos para tu relación", y, pageW);
  const tips = [
    "Establece acuerdos claros y revisadlos juntos periódicamente para mantener la confianza.",
    "Dedica tiempo de calidad semanal sin distracciones para reforzar vuestra conexión.",
    "Practica la escucha activa: antes de responder en un conflicto, repite lo que has entendido.",
    "Celebra los avances pequeños: las relaciones sanas se construyen con gestos cotidianos.",
    "Identifica y comunica tus necesidades sin esperar que tu pareja las adivine.",
    "Respeta los ritmos emocionales del otro: no todos procesan al mismo tiempo.",
  ];
  y = drawBulletList(doc, tips, 20, y, pageW - 35, GOLD);

  // ═══════════════════════════════════════
  // CLOSING MESSAGE
  // ═══════════════════════════════════════
  y = checkPage(doc, y, 45);
  // Gold card
  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.setGState(doc.GState({ opacity: 0.1 }));
  doc.roundedRect(15, y, pageW - 30, 35, 4, 4, "F");
  doc.setGState(doc.GState({ opacity: 1 }));

  doc.setFillColor(...GOLD);
  doc.roundedRect(15, y, 4, 35, 2, 2, "F");

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(`${userName}, tu perfil es una guía para amar mejor 💛`, 25, y + 14);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.text("Este informe es el punto de partida. En tu sesión con nuestro especialista", 25, y + 22);
  doc.text("profundizaremos en cada aspecto y diseñaremos un camino personalizado para ti.", 25, y + 28);
  y += 42;

  // ═══════════════════════════════════════
  // PLANES — ESENCIAL & PREMIUM
  // ═══════════════════════════════════════
  y = checkPage(doc, y, 120);
  if (y > 25) { doc.addPage(); y = 25; }

  // Section title
  doc.setFillColor(...GOLD);
  doc.roundedRect(15, y - 1, 4, 10, 2, 2, "F");
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("Nuestros planes", 24, y + 7);
  y += 17;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  const introP1 = doc.splitTextToSize(
    `${userName}, ahora que conoces tu perfil, el siguiente paso es trabajar con uno de nuestros especialistas en`,
    pageW - 40
  );
  doc.text(introP1, 20, y);
  y += introP1.length * 5;

  // Bold highlight
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("SESIONES PERSONALES", 20, y);
  const boldW = doc.getTextWidth("SESIONES PERSONALES ");
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.text("para conocer a la persona ideal para ti.", 20 + boldW, y);
  y += 6;

  const introP2 = doc.splitTextToSize("Elige el plan que mejor se adapte a ti:", pageW - 40);
  doc.text(introP2, 20, y);
  y += introP2.length * 5 + 8;

  // --- Plan Esencial ---
  const planCardH = 62;
  const cardW = (pageW - 45) / 2;

  // Esencial card
  doc.setFillColor(245, 242, 235);
  doc.roundedRect(15, y, cardW, planCardH, 4, 4, "F");
  doc.setDrawColor(220, 215, 205);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, y, cardW, planCardH, 4, 4, "S");

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("Esencial", 15 + cardW / 2, y + 12, { align: "center" });

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GOLD);
  doc.text("160€", 15 + cardW / 2, y + 24, { align: "center" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.text("/mes", 15 + cardW / 2 + 18, y + 24);

  const esencialFeatures = [
    "1 sesión mensual de 60 min",
    "Presentaciones compatibles",
    "Feedback personal tras la cita",
  ];
  let fy = y + 33;
  esencialFeatures.forEach((f) => {
    doc.setFillColor(...GOLD);
    doc.circle(22, fy - 1, 1.2, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK);
    doc.text(f, 26, fy);
    fy += 8;
  });

  // Premium card
  const px = 15 + cardW + 15;
  doc.setFillColor(...DARK);
  doc.roundedRect(px, y, cardW, planCardH, 4, 4, "F");
  // Gold border
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.roundedRect(px, y, cardW, planCardH, 4, 4, "S");

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Premium", px + cardW / 2, y + 12, { align: "center" });

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GOLD);
  doc.text("250€", px + cardW / 2, y + 24, { align: "center" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 180, 180);
  doc.text("/mes", px + cardW / 2 + 18, y + 24);

  const premiumFeatures = [
    "2 sesiones mensuales",
    "Presentaciones prioritarias",
    "Verificación de antecedentes",
  ];
  fy = y + 33;
  premiumFeatures.forEach((f) => {
    doc.setFillColor(...GOLD);
    doc.circle(px + 7, fy - 1, 1.2, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(220, 220, 220);
    doc.text(f, px + 11, fy);
    fy += 8;
  });

  // Recommended badge on Premium
  doc.setFillColor(...GOLD);
  doc.roundedRect(px + cardW / 2 - 20, y - 5, 40, 10, 5, 5, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("RECOMENDADO", px + cardW / 2, y, { align: "center" });

  y += planCardH + 10;

  // CTA text
  y = checkPage(doc, y, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  const ctaText = doc.splitTextToSize(
    "Reserva tu primera sesión gratuita de 15 minutos y descubre cómo nuestros especialistas pueden ayudarte a encontrar a tu persona.",
    pageW - 40
  );
  doc.text(ctaText, 20, y);
  y += ctaText.length * 5 + 4;

  // ═══════════════════════════════════════
  // FOOTER (all pages)
  // ═══════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    // Footer line
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.5);
    doc.line(15, pageH - 15, pageW - 15, pageH - 15);
    // Footer text
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text("Generado por Afín", 15, pageH - 9);
    doc.text(`Página ${i} de ${totalPages}`, pageW - 15, pageH - 9, { align: "right" });
    // Confidential
    doc.setFontSize(7);
    doc.setTextColor(190, 185, 175);
    doc.text("CONFIDENCIAL — Este documento es personal e intransferible", pageW / 2, pageH - 9, { align: "center" });
  }

  doc.save(`informe-disc-${userName.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}
