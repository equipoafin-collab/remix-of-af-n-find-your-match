import { describe, expect, it } from "vitest";
import { findMatchesFor } from "@/lib/profileMatching";
import {
  calcularAjustes,
  chipsDelMotivo,
  validarPreferencias,
  type Decision,
} from "../../../supabase/functions/_shared/aprendizaje";
import { ana, luis } from "./fixtures";

// Desglose típico de un candidato lejano que encaja en lo demás.
const lejano = { objetivos: 80, valores: 75, estiloVida: 70, personalidad: 85, geografia: 30, preferencias: 70 };
const rechazo = (motivo: string | null, desglose = lejano): Decision => ({ estado: "rechazada", motivo, desglose });

describe("chipsDelMotivo", () => {
  it("lee los chips antes de ' — ' e ignora el texto libre", () => {
    expect(chipsDelMotivo("Distancia, Edad — vive lejos, valores distintos")).toEqual(["Distancia", "Edad"]);
    expect(chipsDelMotivo("Valores")).toEqual(["Valores"]);
    expect(chipsDelMotivo("no me convence, distancia")).toEqual([]);
    expect(chipsDelMotivo(null)).toEqual([]);
  });
});

describe("calcularAjustes", () => {
  it("con menos de 3 decisiones no ajusta nada", () => {
    expect(calcularAjustes([rechazo("Distancia"), rechazo("Distancia")])).toEqual({});
  });

  it("rechazar varios por distancia sube el peso de geografía y baja el de lo que sí encajaba", () => {
    const a = calcularAjustes([rechazo("Distancia"), rechazo("Distancia"), rechazo("Distancia — muy lejos")]);
    expect(a.geografia).toBe(1.3);
    expect(a.personalidad).toBeLessThan(1);
    expect(Object.values(a).every((f) => f >= 0.7 && f <= 1.3)).toBe(true);
  });

  it("lo que destaca en los aceptados gana peso", () => {
    const acepta = (desglose: Decision["desglose"]): Decision => ({ estado: "aceptada", motivo: null, desglose });
    const a = calcularAjustes([
      acepta({ objetivos: 95, valores: 60, estiloVida: 60, personalidad: 60, geografia: 60, preferencias: 60 }),
      acepta({ objetivos: 90, valores: 65, estiloVida: 60, personalidad: 55, geografia: 60, preferencias: 60 }),
      acepta({ objetivos: 92, valores: 60, estiloVida: 65, personalidad: 60, geografia: 55, preferencias: 60 }),
    ]);
    expect(a.objetivos).toBeGreaterThan(1);
    expect(a.geografia).toBeLessThan(1);
  });

  it("aplicados al matching, cambian el ranking", () => {
    // Con el límite de ±30 % el efecto es de unos pocos puntos: decide entre candidatos parecidos (89 vs 90 → 90 vs 88).
    // El peso grande del aprendizaje está en la IA, que lee decisiones y preferencias (T5.2).
    const cerca = { ...luis, id: "cerca", desea_casarse: "No", alcohol: "Nunca" };
    const lejos = { ...luis, id: "lejos", ciudad: "Sevilla" };
    expect(findMatchesFor(ana, [cerca, lejos])[0].perfilB.id).toBe("lejos");
    const ajustes = calcularAjustes([rechazo("Distancia"), rechazo("Distancia"), rechazo("Distancia")]);
    expect(findMatchesFor(ana, [cerca, lejos], 20, { ajustes })[0].perfilB.id).toBe("cerca");
  });
});

describe("validarPreferencias", () => {
  it("limpia y acota lo que devuelve la IA", () => {
    const p = validarPreferencias({ valora: [" Calma ", "", 3, ...Array(10).fill("x")], evita: ["Fumadores"], notas: "  Le pesa la distancia " });
    expect(p).toEqual({ valora: ["Calma", ...Array(7).fill("x")], evita: ["Fumadores"], notas: "Le pesa la distancia" });
  });

  it("rechaza lo que no tiene la forma esperada", () => {
    expect(validarPreferencias(null)).toBeNull();
    expect(validarPreferencias({ valora: "calma", evita: [] })).toBeNull();
    expect(validarPreferencias({ valora: [], evita: [] })).toEqual({ valora: [], evita: [], notas: "" });
  });
});
