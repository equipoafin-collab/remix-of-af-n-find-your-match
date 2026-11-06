import { describe, expect, it } from "vitest";
import { PRECIOS_PUBLICOS } from "../preciosPublicos";

describe("Precios publicados", () => {
  it("fija Esencial en 69 euros", () => {
    expect(PRECIOS_PUBLICOS.esencial).toBe(69);
  });
  it("fija Premium en 120 euros", () => {
    expect(PRECIOS_PUBLICOS.premium).toBe(120);
  });
});