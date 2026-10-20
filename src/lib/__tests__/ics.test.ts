import { describe, expect, it } from "vitest";
import { crearIcs } from "../ics";

describe("crearIcs", () => {
  const ics = crearIcs(
    { uid: "s1", inicio: new Date("2026-10-23T16:00:00Z"), duracionMin: 50, titulo: "Cita en Afín", descripcion: "Sesión de seguimiento, con tu psicóloga; online\nTraer dudas" },
    new Date("2026-10-20T10:00:00Z"),
  );
  const lineas = ics.split("\r\n");

  it("es un VCALENDAR con un VEVENT y líneas CRLF", () => {
    expect(lineas[0]).toBe("BEGIN:VCALENDAR");
    expect(lineas).toContain("BEGIN:VEVENT");
    expect(lineas).toContain("END:VCALENDAR");
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("inicio y fin en UTC con la duración", () => {
    expect(lineas).toContain("DTSTART:20261023T160000Z");
    expect(lineas).toContain("DTEND:20261023T165000Z");
    expect(lineas).toContain("DTSTAMP:20261020T100000Z");
    expect(lineas).toContain("UID:s1@afin");
  });

  it("escapa comas, puntos y comas y saltos de línea", () => {
    expect(lineas).toContain("DESCRIPTION:Sesión de seguimiento\\, con tu psicóloga\\; online\\nTraer dudas");
  });
});
