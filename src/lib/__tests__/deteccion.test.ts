import { describe, expect, it } from "vitest";
import { detectarCompatibles, planificarDeteccion } from "../../../supabase/functions/_shared/deteccion";
import { ana, luis } from "./fixtures";

// Ana es el perfil nuevo; los clientes son hombres que buscan mujer.
const clientes = [
  { ...luis, id: "muy" },
  { ...luis, id: "poco", ciudad: "Sevilla", tipo_relacion: "Casual", desea_casarse: "No", tabaco: "Sí" },
  { ...luis, id: "excluido", edad_min_busca: 40 },
];

describe("detectarCompatibles", () => {
  it("devuelve solo los clientes que superan el umbral y pasan los filtros, con el nuevo como candidato", () => {
    const d = detectarCompatibles(ana, clientes, 80);
    expect(d.map((m) => m.perfilA.id)).toEqual(["muy"]);
    expect(d[0].perfilB.id).toBe("ana");
    expect(d[0].score).toBeGreaterThanOrEqual(80);
  });

  it("con umbral bajo entran más, ordenados de mayor a menor", () => {
    const d = detectarCompatibles(ana, clientes, 0);
    expect(d.map((m) => m.perfilA.id)).toEqual(["muy", "poco"]);
  });

  it("usa los pesos y ajustes de cada cliente", () => {
    const sinGeografia = { pesos: { objetivos: 0, valores: 0, estiloVida: 0, personalidad: 0, geografia: 1, preferencias: 0 } };
    const d = detectarCompatibles(ana, clientes, 0, (id) => (id === "poco" ? sinGeografia : {}));
    expect(d.find((m) => m.perfilA.id === "poco")?.score).toBe(30); // solo cuenta la geografía: Sevilla vs Madrid
  });

  it("un perfil no se detecta como compatible consigo mismo", () => {
    expect(detectarCompatibles(ana, [ana], 0)).toEqual([]);
  });
});

describe("planificarDeteccion", () => {
  it("inserta los pares nuevos, actualiza pendientes y caducadas y no toca decisiones", () => {
    const d = detectarCompatibles(ana, [
      { ...luis, id: "nuevo" }, { ...luis, id: "pend" }, { ...luis, id: "cad" }, { ...luis, id: "acep" }, { ...luis, id: "rech" },
    ], 0);
    const estados = new Map([["pend", "pendiente"], ["cad", "caducada"], ["acep", "aceptada"], ["rech", "rechazada"]] as const);
    const plan = planificarDeteccion(new Map(estados), d);
    expect(plan.nuevas.map((m) => m.perfilA.id)).toEqual(["nuevo"]);
    expect(plan.actualizar.map((m) => m.perfilA.id).sort()).toEqual(["cad", "pend"]);
  });
});
