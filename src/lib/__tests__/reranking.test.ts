import { describe, expect, it } from "vitest";
import { findMatchesFor } from "@/lib/profileMatching";
import { parsearJSON } from "../../../supabase/functions/_shared/json";
import { combinarConIA, describirCandidato, promptReranking, validarReranking } from "../../../supabase/functions/_shared/reranking";
import { ana, luis } from "./fixtures";

const pool = [
  { ...luis, id: "a", nombre_completo: "Luis García", email: "luis@example.com", hobbies: "Escalada" },
  { ...luis, id: "b", ciudad: "Sevilla" },
  { ...luis, id: "c", ciudad: "Valencia", tipo_relacion: "Casual" },
];
const top = findMatchesFor(ana, pool);

describe("describirCandidato / promptReranking", () => {
  it("usa ids cortos y no envía nombre ni email del candidato", () => {
    const texto = promptReranking("## Preguntas clave\n- Zona: Madrid", top);
    expect(texto).toContain("CONTEXTO DEL CLIENTE\n## Preguntas clave");
    expect(texto).toMatch(/^C1: /m);
    expect(texto).toMatch(/^C3: /m);
    expect(texto).not.toContain("Luis");
    expect(texto).not.toContain("example.com");
  });

  it("incluye los datos que permiten personalizar y la puntuación por reglas", () => {
    const i = top.findIndex((m) => m.perfilB.id === "a");
    const texto = describirCandidato(top[i], i);
    expect(texto).toContain("Hobbies: \"Escalada\"");
    expect(texto).toContain(`Reglas: ${top[i].score}/100`);
  });
});

describe("validarReranking", () => {
  it("lee la respuesta de la IA aunque venga envuelta en markdown", () => {
    const raw = parsearJSON('```json\n{"candidatos":[{"id":"C2","score_ia":81.6,"motivos":[" Ambos aman el monte ",""],"riesgos":["Distancia"]}]}\n```');
    expect(validarReranking(raw, 3).get(1)).toEqual({ score_ia: 82, motivos: ["Ambos aman el monte"], riesgos: ["Distancia"] });
  });

  it("ignora candidatos que no se enviaron, repetidos o sin score, y acota listas y score", () => {
    const v = validarReranking({
      candidatos: [
        { id: "C1", score_ia: 150, motivos: ["1", "2", "3", "4", "5"], riesgos: ["a", "b", "c", "d"] },
        { id: "C1", score_ia: 10 },
        { id: "C4", score_ia: 70 },
        { id: "C2", score_ia: "mucho" },
        { id: "X3", score_ia: 50 },
      ],
    }, 3);
    expect([...v.keys()]).toEqual([0]);
    expect(v.get(0)).toEqual({ score_ia: 100, motivos: ["1", "2", "3", "4"], riesgos: ["a", "b", "c"] });
  });

  it("una respuesta sin la estructura esperada no da valoraciones", () => {
    expect(validarReranking(null, 3).size).toBe(0);
    expect(validarReranking({ resultado: [] }, 3).size).toBe(0);
  });
});

describe("combinarConIA", () => {
  it("mezcla reglas e IA según el peso, reordena y usa los motivos de la IA", () => {
    const ia = new Map([[2, { score_ia: 100, motivos: ["Encajan en lo que ella busca"], riesgos: [] }]]);
    const r = combinarConIA(top, ia, 0.5);
    const conIA = r.find((s) => s.match === top[2])!;
    expect(conIA.score).toBe(Math.round(0.5 * top[2].score + 50));
    expect(conIA.score_ia).toBe(100);
    expect(conIA.motivos).toEqual(["Encajan en lo que ella busca"]);
    expect(conIA.riesgos).toEqual(top[2].warnings); // lista vacía de la IA → se quedan los de reglas
    expect(r.map((s) => s.score)).toEqual([...r.map((s) => s.score)].sort((a, b) => b - a));
  });

  it("sin valoración de la IA un candidato queda solo con reglas", () => {
    const r = combinarConIA(top, new Map(), 0.5);
    expect(r.every((s) => s.score_ia === null && s.score === s.match.score)).toBe(true);
  });

  it("el peso se limita a 0-1", () => {
    const ia = new Map([[0, { score_ia: 0, motivos: [], riesgos: [] }]]);
    expect(combinarConIA(top, ia, 5).find((s) => s.match === top[0])!.score).toBe(0);
    expect(combinarConIA(top, ia, -1).find((s) => s.match === top[0])!.score).toBe(top[0].score);
  });
});
