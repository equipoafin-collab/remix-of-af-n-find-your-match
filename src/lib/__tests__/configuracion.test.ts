import { describe, expect, it } from "vitest";
import { CONFIGURACION_POR_DEFECTO, construirConfiguracion } from "@/lib/configuracion";

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
