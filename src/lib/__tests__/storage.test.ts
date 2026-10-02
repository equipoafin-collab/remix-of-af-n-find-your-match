import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { claveSegura, esCarpetaDelPerfil } from "@/lib/storage";

describe("claveSegura", () => {
  it("quita tildes y cambia espacios por _", () => {
    expect(claveSegura("  José Pérez Núñez ")).toBe("Jose_Perez_Nunez");
  });

  it("conserva un email tal cual", () => {
    expect(claveSegura("maria.lopez@gmail.com")).toBe("maria.lopez@gmail.com");
  });

  it("no deja barras ni símbolos que cambien la carpeta", () => {
    expect(claveSegura("../otro/dir?x")).toBe(".._otro_dir_x");
  });
});

describe("esCarpetaDelPerfil", () => {
  const perfil = { email: "Maria.Lopez@gmail.com", nombre_completo: "María López" };

  it("reconoce la carpeta por email aunque cambien las mayúsculas", () => {
    expect(esCarpetaDelPerfil("user_maria.lopez@GMAIL.com", perfil)).toBe(true);
  });

  it("reconoce la carpeta por nombre sin tildes", () => {
    expect(esCarpetaDelPerfil("user_Maria_Lopez", perfil)).toBe(true);
  });

  it("no confunde la carpeta de otra persona ni la de un perfil sin email", () => {
    expect(esCarpetaDelPerfil("user_maria", perfil)).toBe(false);
    expect(esCarpetaDelPerfil("user_", { email: null, nombre_completo: " " })).toBe(false);
  });
});
