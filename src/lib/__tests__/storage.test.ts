import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { claveSegura } from "@/lib/storage";

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
