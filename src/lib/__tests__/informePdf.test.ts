import { describe, expect, it } from "vitest";
import { jsPDF } from "jspdf";
import { aWinAnsi } from "@/lib/informePdf";

describe("aWinAnsi", () => {
  it("conserva tildes y signos de WinAnsi y sustituye o quita lo demás", () => {
    expect(aWinAnsi("ñáü ¿¡ · • – “sí” … €")).toBe("ñáü ¿¡ · • – “sí” … €");
    expect(aWinAnsi("✓ a → b ≥ 3 😀")).toBe("+ a -> b >= 3 ");
  });

  it("jsPDF escribe el resultado en 8 bits (sin UTF-16 ilegible)", () => {
    const doc = new jsPDF({ compress: false });
    doc.text(aWinAnsi("✓ Plena coincidencia → valores ≥ 3 😀 “sí”"), 10, 10);
    // UTF-16 de jsPDF: el texto empieza por la marca þÿ y lleva un byte nulo antes de cada letra.
    const pdf = doc.output();
    expect(pdf).not.toContain("(þÿ");
    expect(pdf).not.toContain("\u0000P");
  });
});
