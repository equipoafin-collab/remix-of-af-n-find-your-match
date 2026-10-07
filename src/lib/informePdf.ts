import jsPDF from "jspdf";
import type { InformeCompatibilidad } from "../../supabase/functions/_shared/informe";

// La Helvetica de jsPDF solo admite WinAnsi (Latin-1 + estos de cp1252): un carácter de fuera
// (✓, →, un emoji de la IA) hace que jsPDF escriba la línea entera en UTF-16 y salga ilegible.
const CP1252 = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
const SUSTITUTOS: Record<string, string> = { "✓": "+", "→": "->", "≥": ">=", "≤": "<=" };

export const aWinAnsi = (t: string) =>
  [...t].map((c) => (c.charCodeAt(0) < 256 || CP1252.includes(c) ? c : SUSTITUTOS[c] ?? "")).join("");

/** PDF del informe de compatibilidad (T6.3; antes en la página /compatibilidad). */
export function exportarInformePdf(informe: InformeCompatibilidad, nombreA: string, nombreB: string) {
  const doc = new jsPDF();
  const margen = 20;
  const ancho = doc.internal.pageSize.getWidth() - margen * 2;
  let y = 20;

  const texto = (t: string, tam: number, negrita = false, color: [number, number, number] = [30, 30, 30]) => {
    doc.setFontSize(tam);
    doc.setFont("helvetica", negrita ? "bold" : "normal");
    doc.setTextColor(...color);
    const lineas = doc.splitTextToSize(aWinAnsi(t), ancho);
    if (y + lineas.length * tam * 0.5 > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(lineas, margen, y);
    y += lineas.length * tam * 0.45 + 4;
  };
  const lista = (titulo: string, color: [number, number, number], puntos: string[], marca: (i: number) => string) => {
    if (!puntos.length) return;
    texto(titulo, 14, true, color);
    puntos.forEach((p, i) => texto(`  ${marca(i)}  ${p}`, 10));
    y += 4;
  };

  texto("Informe de compatibilidad · Afín", 18, true, [180, 140, 60]);
  y += 4;
  texto(`${nombreA}  ×  ${nombreB}`, 13, false, [100, 100, 100]);
  y += 6;
  texto(`Compatibilidad: ${informe.score}% — ${informe.nivel}`, 22, true);
  y += 2;
  texto(informe.resumen, 11);
  y += 6;
  lista("Fortalezas", [16, 185, 129], informe.fortalezas, () => "+");
  lista("Posibles fricciones", [251, 146, 60], informe.fricciones, () => "•");
  lista("Preguntas para la primera cita", [180, 140, 60], informe.preguntas_sugeridas, (i) => `${i + 1}.`);
  if (informe.analisis_detallado) {
    texto("Análisis", 14, true);
    texto(informe.analisis_detallado, 10);
  }

  doc.save(`informe-afin-${nombreA}-${nombreB}.pdf`.replace(/\s+/g, "-").toLowerCase());
}
