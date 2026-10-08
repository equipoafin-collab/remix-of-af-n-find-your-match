import { describe, expect, it } from "vitest";
import { CONFIGURACION_POR_DEFECTO, construirConfiguracion, validarConfiguracion } from "@/lib/configuracion";

describe("construirConfiguracion", () => {
  it("sin filas devuelve los valores por defecto", () => {
    expect(construirConfiguracion([])).toEqual(CONFIGURACION_POR_DEFECTO);
  });

  it("los valores guardados sustituyen a los por defecto y el resto se conserva", () => {
    const config = construirConfiguracion([
      { clave: "dias_sin_seguimiento", valor: 30 },
      { clave: "sesiones_por_plan", valor: { esencial: 2, premium: 4 } },
    ]);
    expect(config.dias_sin_seguimiento).toBe(30);
    expect(config.sesiones_por_plan).toEqual({ esencial: 2, premium: 4 });
    expect(config.umbral_alta_compatibilidad).toBe(80);
  });

  it("ignora claves desconocidas", () => {
    expect(construirConfiguracion([{ clave: "otra_cosa", valor: 1 }])).not.toHaveProperty("otra_cosa");
  });

  it("los pesos por defecto suman 1", () => {
    const suma = Object.values(CONFIGURACION_POR_DEFECTO.pesos_algoritmo).reduce((a, b) => a + b, 0);
    expect(suma).toBeCloseTo(1);
  });
});

describe("validarConfiguracion", () => {
  const valida = CONFIGURACION_POR_DEFECTO;

  it("los valores por defecto son válidos", () => {
    expect(validarConfiguracion(valida)).toEqual([]);
  });

  it("rechaza enteros fuera de rango o con decimales, y campos vacíos (NaN)", () => {
    expect(validarConfiguracion({ ...valida, dias_sin_seguimiento: 0 })).toHaveLength(1);
    expect(validarConfiguracion({ ...valida, umbral_alta_compatibilidad: 101 })).toHaveLength(1);
    expect(validarConfiguracion({ ...valida, dias_feedback: 2.5 })).toHaveLength(1);
    expect(validarConfiguracion({ ...valida, num_sugerencias: NaN })).toHaveLength(1);
    expect(validarConfiguracion({ ...valida, sesiones_por_plan: { esencial: 1, premium: 9 } })).toHaveLength(1);
  });

  it("el peso de la IA va de 0 a 1 y los pesos del algoritmo suman 1", () => {
    expect(validarConfiguracion({ ...valida, peso_ia: 1.2 })).toHaveLength(1);
    expect(validarConfiguracion({ ...valida, peso_ia: 0 })).toEqual([]);
    expect(validarConfiguracion({ ...valida, pesos_algoritmo: { ...valida.pesos_algoritmo, objetivos: 0.3 } })).toEqual(["Pesos del algoritmo: deben sumar 100 %."]);
    expect(validarConfiguracion({ ...valida, pesos_algoritmo: { ...valida.pesos_algoritmo, objetivos: 0.45, valores: 0 } })).toEqual([]);
    expect(validarConfiguracion({ ...valida, pesos_algoritmo: { ...valida.pesos_algoritmo, objetivos: 0.5, valores: -0.05 } })).toHaveLength(1);
  });
});
