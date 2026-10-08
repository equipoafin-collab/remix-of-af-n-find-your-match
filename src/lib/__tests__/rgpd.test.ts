import { describe, expect, it } from "vitest";
import { construirExportacion, nombreExportacion, type DatosCliente } from "@/lib/rgpd";

const ANA = "11111111-1111-1111-1111-111111111111";
const BEA = "22222222-2222-2222-2222-222222222222";

const datos = {
  perfil: { id: ANA, nombre_completo: "Ana Pérez" },
  disc: [],
  pagos: [],
  sesiones: [],
  notas: [],
  aprendizaje: null,
  sugerencias: [
    { perfil_id: ANA, candidato_id: BEA, score: 80, motivos: ["Valores"], riesgos: [], estado: "rechazada", motivo_decision: "Distancia" },
    { perfil_id: BEA, candidato_id: ANA, score: 70, motivos: ["Bea busca a alguien activo"], riesgos: ["Bea fuma"], estado: "rechazada", motivo_decision: "Físico" },
  ],
  matches: [
    { perfil_a: BEA, perfil_b: ANA, estado: "cita_realizada", feedback_a: "Bea opina", feedback_b: "Ana opina", valoracion_a: 2, valoracion_b: 5, quiere_repetir_a: false, quiere_repetir_b: true },
  ],
  archivos: [{ bucket: "fotos-perfil", ruta: "perfiles/x.jpg" }],
} as unknown as DatosCliente;

describe("construirExportacion", () => {
  const exportado = construirExportacion(datos, new Date("2026-10-08T10:00:00Z"));
  const texto = JSON.stringify(exportado);

  it("no incluye a la otra persona ni lo que dijo o se decidió por ella", () => {
    expect(texto).not.toContain(BEA);
    expect(texto).not.toContain("Bea opina");
    expect(texto).not.toContain("Físico");
    expect(texto).not.toContain("Bea busca");
    expect(texto).not.toContain("Bea fuma");
  });

  it("de cada match deja el lado del cliente", () => {
    expect(exportado.matches[0]).toMatchObject({ estado: "cita_realizada", feedback: "Ana opina", valoracion: 5, quiere_repetir: true });
  });

  it("marca el rol en las sugerencias y conserva el motivo de las suyas", () => {
    expect(exportado.sugerencias.map((s) => [s.rol, s.motivo_decision])).toEqual([["cliente", "Distancia"], ["candidato", null]]);
  });

  it("nombre de fichero sin tildes ni espacios", () => {
    expect(nombreExportacion("Ana Pérez", new Date("2026-10-08T10:00:00Z"))).toBe("afin-datos-ana_perez-2026-10-08.json");
  });
});
