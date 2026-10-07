import { describe, expect, it } from "vitest";
import { findMatchesFor, VERSION_ALGORITMO } from "@/lib/profileMatching";
import {
  candidatosDecididos,
  filaSugerencia,
  planificarSugerencias,
  soloReglas,
  type SugerenciaExistente,
} from "../../../supabase/functions/_shared/sugerencias";
import { ana, luis } from "./fixtures";

const pool = ["a", "b", "c", "d"].map((id) => ({ ...luis, id }));
const top = (excluirIds: string[] = []) => findMatchesFor(ana, pool, 20, { excluirIds }).map(soloReglas);
const ids = (ss: ReturnType<typeof top>) => ss.map((s) => s.match.perfilB.id).sort();

describe("planificarSugerencias", () => {
  it("la primera vez inserta todo el top", () => {
    const plan = planificarSugerencias([], top());
    expect(ids(plan.nuevas)).toEqual(["a", "b", "c", "d"]);
    expect(plan.actualizar).toEqual([]);
    expect(plan.caducar).toEqual([]);
  });

  it("recalcular con lo mismo no inserta nada: solo actualiza las pendientes", () => {
    const existentes: SugerenciaExistente[] = ["a", "b", "c", "d"].map((candidato_id) => ({ candidato_id, estado: "pendiente" }));
    const plan = planificarSugerencias(existentes, top());
    expect(plan.nuevas).toEqual([]);
    expect(ids(plan.actualizar)).toEqual(["a", "b", "c", "d"]);
  });

  it("las decididas no se vuelven a proponer ni se tocan", () => {
    const existentes: SugerenciaExistente[] = [
      { candidato_id: "a", estado: "aceptada" },
      { candidato_id: "b", estado: "rechazada" },
    ];
    expect(candidatosDecididos(existentes)).toEqual(["a", "b"]);
    const plan = planificarSugerencias(existentes, top(candidatosDecididos(existentes)));
    expect(ids(plan.nuevas)).toEqual(["c", "d"]);
    expect(plan.actualizar).toEqual([]);
    expect(plan.caducar).toEqual([]);
  });

  it("caduca las pendientes que salen del top y reactiva las caducadas que vuelven", () => {
    const existentes: SugerenciaExistente[] = [
      { candidato_id: "a", estado: "caducada" },
      { candidato_id: "fuera", estado: "pendiente" },
      { candidato_id: "vieja", estado: "caducada" },
    ];
    const plan = planificarSugerencias(existentes, top());
    expect(ids(plan.actualizar)).toEqual(["a"]);
    expect(ids(plan.nuevas)).toEqual(["b", "c", "d"]);
    expect(plan.caducar).toEqual(["fuera"]);
  });
});

describe("filaSugerencia", () => {
  it("solo reglas: score y motivos de reglas, sin score_ia, como pendiente", () => {
    const [s] = top();
    const m = s.match;
    const fila = filaSugerencia("ana", s, VERSION_ALGORITMO, "2026-10-07T10:00:00Z");
    expect(fila).toMatchObject({
      perfil_id: "ana",
      candidato_id: m.perfilB.id,
      score: m.score,
      score_reglas: m.score,
      score_ia: null,
      estado: "pendiente",
      version_algoritmo: "v3",
      calculado_at: "2026-10-07T10:00:00Z",
    });
    expect(fila.motivos).toEqual(m.highlights);
    expect(fila.riesgos).toEqual(m.warnings);
  });

  it("con IA guarda su score y sus motivos, y conserva los de reglas en el desglose", () => {
    const [s] = top();
    const fila = filaSugerencia("ana", { ...s, score: 90, score_ia: 95, motivos: ["Los dos quieren hijos pronto"], riesgos: [] }, "v3", "2026-10-07T10:00:00Z");
    expect(fila).toMatchObject({ score: 90, score_reglas: s.match.score, score_ia: 95, motivos: ["Los dos quieren hijos pronto"], riesgos: [] });
    expect(fila.desglose).toEqual({ ...s.match.breakdown, motivos_reglas: s.match.highlights, riesgos_reglas: s.match.warnings });
  });
});
