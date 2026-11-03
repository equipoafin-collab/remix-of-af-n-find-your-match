import { describe, expect, it } from "vitest";
import { enlaceReserva, RESERVA_SESIONES, sesionesPorReservar } from "../enlaces";

describe("enlaceReserva", () => {
  it("rellena nombre y email, codificados", () => {
    const url = new URL(enlaceReserva(RESERVA_SESIONES, " Lucía Martín ", "lucia+afin@x.es"));
    expect(url.origin + url.pathname).toBe("https://cal.com/equipo-afin/sesion");
    expect(url.searchParams.get("name")).toBe("Lucía Martín");
    expect(url.searchParams.get("email")).toBe("lucia+afin@x.es");
  });

  it("sin email, solo el nombre; respeta los parámetros que ya traiga", () => {
    const url = new URL(enlaceReserva("https://cal.com/x/y?embed=true", "Ana", null));
    expect(url.searchParams.get("embed")).toBe("true");
    expect(url.searchParams.has("email")).toBe(false);
  });
});

describe("sesionesPorReservar", () => {
  it("las que le quedan menos las ya programadas, nunca negativo", () => {
    expect(sesionesPorReservar(3, 1)).toBe(2);
    expect(sesionesPorReservar(1, 1)).toBe(0);
    expect(sesionesPorReservar(0, 2)).toBe(0);
  });
});
