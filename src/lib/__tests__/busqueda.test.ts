import { describe, expect, it } from "vitest";
import { filtroBusqueda } from "@/lib/busqueda";

describe("filtroBusqueda", () => {
  it("busca en todas las columnas", () => {
    expect(filtroBusqueda(" ana ", ["nombre_completo", "email"])).toBe(
      'nombre_completo.ilike."%ana%",email.ilike."%ana%"',
    );
  });

  it("deja comas y paréntesis dentro de las comillas", () => {
    expect(filtroBusqueda("García, Ana (Madrid)", ["nombre_completo"])).toBe('nombre_completo.ilike."%García, Ana (Madrid)%"');
  });

  it("quita comillas y barras que cerrarían el valor", () => {
    expect(filtroBusqueda('a"),email.eq.x\\', ["nombre_completo"])).toBe('nombre_completo.ilike."%a),email.eq.x%"');
  });

  it("sin texto no filtra", () => {
    expect(filtroBusqueda('  " ', ["nombre_completo"])).toBeNull();
  });
});
