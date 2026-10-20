import { describe, expect, it } from "vitest";
import { errorContrasena, esFotoDelCliente, extensionFoto, pasoCuenta, primerNombre, TOKEN_ACCESO } from "../../../supabase/functions/_shared/acceso";

describe("errorContrasena", () => {
  it("pide al menos 8 caracteres", () => {
    expect(errorContrasena("1234567")).toMatch(/8 caracteres/);
    expect(errorContrasena("12345678")).toBeNull();
  });

  it("no admite más de 72 bytes (límite de Auth), contando tildes como 2", () => {
    expect(errorContrasena("a".repeat(72))).toBeNull();
    expect(errorContrasena("a".repeat(73))).toMatch(/larga/);
    expect(errorContrasena("á".repeat(37))).toMatch(/larga/);
  });
});

describe("pasoCuenta", () => {
  const suelta = { id: "u2", esAdmin: false, otroPerfil: false };

  it("si el perfil ya tiene cuenta, le pone la contraseña nueva aunque haya otra con su email", () => {
    expect(pasoCuenta("u1", null)).toEqual({ paso: "actualizar", userId: "u1" });
    expect(pasoCuenta("u1", suelta)).toEqual({ paso: "actualizar", userId: "u1" });
  });

  it("sin cuenta con su email, la crea", () => {
    expect(pasoCuenta(null, null)).toEqual({ paso: "crear" });
  });

  it("una cuenta suelta con su email es suya: la enlaza", () => {
    expect(pasoCuenta(null, suelta)).toEqual({ paso: "actualizar", userId: "u2" });
  });

  it("nunca toca la cuenta de una administradora ni la de otro perfil", () => {
    expect(pasoCuenta(null, { ...suelta, esAdmin: true }).paso).toBe("error");
    expect(pasoCuenta(null, { ...suelta, otroPerfil: true }).paso).toBe("error");
  });
});

describe("token y nombre", () => {
  it("el token son 64 hexadecimales, como los de la base de datos", () => {
    expect(TOKEN_ACCESO.test("ab".repeat(32))).toBe(true);
    expect(TOKEN_ACCESO.test("ab".repeat(31))).toBe(false);
    expect(TOKEN_ACCESO.test("AB".repeat(32))).toBe(false);
  });

  it("saluda por el nombre de pila", () => {
    expect(primerNombre("  Lucía Martín ")).toBe("Lucía");
    expect(primerNombre(null)).toBe("");
  });
});

describe("fotos del cliente (T16.2)", () => {
  it("solo imágenes JPG, PNG o WebP", () => {
    expect(extensionFoto("image/jpeg")).toBe("jpg");
    expect(extensionFoto("image/webp")).toBe("webp");
    expect(extensionFoto("image/svg+xml")).toBeNull();
    expect(extensionFoto(undefined)).toBeNull();
  });

  it("solo rutas de su carpeta: nunca la foto de otra persona", () => {
    expect(esFotoDelCliente("clientes/p1/1729000000000.jpg", "p1")).toBe(true);
    expect(esFotoDelCliente("clientes/p2/1729000000000.jpg", "p1")).toBe(false);
    expect(esFotoDelCliente("perfiles/otra.jpg", "p1")).toBe(false);
    expect(esFotoDelCliente("clientes/p1/../p2/x.jpg", "p1")).toBe(false);
    expect(esFotoDelCliente("clientes/p1/sub/x.jpg", "p1")).toBe(false);
    expect(esFotoDelCliente(42, "p1")).toBe(false);
  });
});
