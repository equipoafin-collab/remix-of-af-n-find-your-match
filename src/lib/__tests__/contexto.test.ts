import { describe, expect, it } from "vitest";
import { formatearContexto, type DatosContexto } from "../../../supabase/functions/_shared/contexto";

const resumen = (estado: string) => ({
  estado_emocional: estado,
  temas_tratados: ["trabajo"],
  avances: ["más confianza"],
  objetivos: ["conocer a alguien estable"],
  proximos_pasos: ["siguiente sesión"],
  preferencias_detectadas: ["busca alguien tranquilo"],
});

const base: DatosContexto = {
  perfil: {
    tipo_relacion: "Matrimonio", hijos: "Quiero tener", edad_min_busca: 30, edad_max_busca: 40,
    zona: "Madrid", ciudad: "Madrid", acepta_otras_zonas: false, valores_importantes: ["Familia", "Humor"],
    edad: 34, genero: "Mujer", busca_genero: "Hombre", desea_casarse: "Sí, lo deseo",
    religion: "Catolicismo", importa_religion: true, religion_pareja: "Catolicismo", ideologia: "Centro",
    importa_politica: false, politica_pareja: null, tabaco: "No", alcohol: "Social",
    deseo_familia: 5, ambicion_profesional: 3, nivel_social: 4, estilo_vida_activo: 2, necesidad_independencia: 3,
    conflicto: ["Dialogar"], sentirse_querido: ["Tiempo de calidad"],
    relacion_sana: "Confianza y respeto", vida_en_10_anios: "Con hijos", aprendizaje_ultima_relacion: "Comunicar antes",
    fin_de_semana: "Monte", hobbies: "Leer", disc_perfil: "S",
  },
  disc: null,
  preferencias: { valora: ["calma"], evita: ["fumadores"], notas: "Le pesa la distancia" },
  resumenes: [
    { fecha: "2026-09-01T10:00:00+00:00", resumen: resumen("Nerviosa") },
    { fecha: "2026-10-01T10:00:00+00:00", resumen: resumen("Tranquila") },
  ],
  notas: [{ fecha: "2026-10-02T09:00:00+00:00", contenido: "Prefiere citas de día" }],
  decisiones: [{
    fecha: "2026-10-03T12:00:00+00:00", estado: "rechazada", motivo: "Distancia", score: 71,
    candidato: { edad: 38, genero: "Hombre", zona: "Sevilla", ciudad: "Sevilla", tipo_relacion: "Matrimonio", hijos: "Tengo", valores_importantes: ["Familia"], disc_perfil: "D" },
  }],
  citas: [{
    fecha: "2026-10-04T20:00:00+00:00", valoracion: 4, repetir: true, feedback: "Se rieron mucho",
    con: { edad: 36, genero: "Hombre", zona: "Madrid", ciudad: "Madrid", tipo_relacion: "Matrimonio", hijos: "Quiero tener", valores_importantes: [], disc_perfil: null },
  }],
};

describe("formatearContexto", () => {
  it("incluye todas las secciones con lo más reciente primero", () => {
    const texto = formatearContexto(base);
    for (const titulo of ["Preguntas clave", "Cuestionario", "Personalidad (DISC)", "Preferencias aprendidas", "Resúmenes de sesión", "Notas de la psicóloga", "Feedback del cliente tras sus citas", "Decisiones sobre candidatos"]) {
      expect(texto).toContain(`## ${titulo}`);
    }
    expect(texto).toContain("- Zona: Madrid");
    expect(texto).toContain("Religión: Catolicismo (exige pareja: Catolicismo)");
    expect(texto).toContain("- Evita: fumadores");
    expect(texto.indexOf("Tranquila")).toBeLessThan(texto.indexOf("Nerviosa"));
    expect(texto).toContain("rechazada (Distancia): Hombre de 38 años, Sevilla, busca Matrimonio, hijos: Tengo, valores: Familia, DISC D · 71 %");
    expect(texto).toContain("- 2026-10-04 · con Hombre de 36 años, Madrid, busca Matrimonio, hijos: Quiero tener · valoración 4/5 · quiere volver a verle: sí: Se rieron mucho");
  });

  it("no envía datos de contacto ni secciones vacías", () => {
    const texto = formatearContexto({ ...base, preferencias: null, resumenes: [], notas: [], decisiones: [], citas: [] });
    expect(texto).not.toContain("Preferencias aprendidas");
    expect(texto).not.toContain("Notas de la psicóloga");
    expect(texto).not.toMatch(/email|teléfono/i);
  });

  it("usa el test DISC completo si lo hay", () => {
    const texto = formatearContexto({ ...base, disc: { principal: "S", secundario: "C", fortalezas: ["Paciente"], a_mejorar: ["Evita conflictos"] } });
    expect(texto).toContain("- Principal S, secundario C · Fortalezas: Paciente · A mejorar: Evita conflictos");
  });

  it("si no cabe, quita primero lo más antiguo y conserva el cuestionario", () => {
    const notas = Array.from({ length: 10 }, (_, i) => ({ fecha: `2026-10-${String(10 + i).padStart(2, "0")}T00:00:00Z`, contenido: `nota ${i} ${"x".repeat(700)}` }));
    const completo = formatearContexto({ ...base, notas });
    const acotado = formatearContexto({ ...base, notas }, 1500);
    expect(completo.length / 4).toBeGreaterThan(1500);
    expect(acotado.length / 4).toBeLessThanOrEqual(1500);
    expect(acotado).toContain("## Cuestionario");
    // Lo primero en caer son los resúmenes de septiembre y la nota más vieja; la más reciente se queda.
    expect(acotado).not.toContain("Nerviosa");
    expect(acotado).not.toContain("nota 0 ");
    expect(acotado).toContain("nota 9 ");
  });

  it("recorta las notas muy largas", () => {
    const texto = formatearContexto({ ...base, notas: [{ fecha: "2026-10-05T00:00:00Z", contenido: "y".repeat(5000) }] });
    expect(texto).toContain(`${"y".repeat(800)}…`);
    expect(texto).not.toContain("y".repeat(801));
  });
});
