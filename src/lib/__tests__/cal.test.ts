import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { leerAvisoCal, verificarFirmaCal } from "../../../supabase/functions/_shared/cal";

const reserva = {
  uid: "uid-nueva",
  startTime: "2026-11-10T17:00:00.000Z",
  endTime: "2026-11-10T18:00:00.000Z",
  length: 60,
  attendees: [{ name: " Lucía Martín ", email: " Lucia@X.es " }],
};

describe("leerAvisoCal", () => {
  it("una reserva nueva crea la sesión con el email normalizado", () => {
    expect(leerAvisoCal({ triggerEvent: "BOOKING_CREATED", payload: reserva })).toEqual({
      accion: "crear", uid: "uid-nueva", uidAnterior: null, email: "lucia@x.es", nombre: "Lucía Martín",
      inicio: "2026-11-10T17:00:00.000Z", duracionMin: 60,
    });
  });

  it("al mover, trae la reserva a la que sustituye; sin length, la duración sale del final", () => {
    const { length: _, ...sinDuracion } = reserva;
    const r = leerAvisoCal({ triggerEvent: "BOOKING_RESCHEDULED", payload: { ...sinDuracion, endTime: "2026-11-10T17:50:00.000Z", rescheduleUid: "uid-vieja" } });
    expect(r).toMatchObject({ accion: "mover", uid: "uid-nueva", uidAnterior: "uid-vieja", duracionMin: 50 });
  });

  it("cancelar no necesita email", () => {
    expect(leerAvisoCal({ triggerEvent: "BOOKING_CANCELLED", payload: { ...reserva, attendees: [] } })).toMatchObject({ accion: "cancelar", uid: "uid-nueva" });
  });

  it("ignora el ping, otros avisos y reservas sin uid, fecha o email", () => {
    expect(leerAvisoCal({ triggerEvent: "PING", payload: {} })).toBeNull();
    expect(leerAvisoCal({ triggerEvent: "MEETING_ENDED", payload: reserva })).toBeNull();
    expect(leerAvisoCal({ triggerEvent: "BOOKING_CREATED", payload: { ...reserva, uid: undefined } })).toBeNull();
    expect(leerAvisoCal({ triggerEvent: "BOOKING_CREATED", payload: { ...reserva, startTime: "mañana" } })).toBeNull();
    expect(leerAvisoCal({ triggerEvent: "BOOKING_CREATED", payload: { ...reserva, attendees: [{ name: "Ana" }] } })).toBeNull();
    expect(leerAvisoCal(null)).toBeNull();
  });
});

describe("verificarFirmaCal", () => {
  const cuerpo = JSON.stringify({ triggerEvent: "BOOKING_CREATED", payload: reserva });
  const firma = createHmac("sha256", "secreto").update(cuerpo).digest("hex");

  it("acepta el HMAC-SHA256 en hex del cuerpo tal cual llega", async () => {
    expect(await verificarFirmaCal(cuerpo, firma, "secreto")).toBe(true);
    expect(await verificarFirmaCal(cuerpo, firma.toUpperCase(), "secreto")).toBe(true);
  });

  it("rechaza otro secreto, un cuerpo cambiado o sin firma", async () => {
    expect(await verificarFirmaCal(cuerpo, firma, "otro")).toBe(false);
    expect(await verificarFirmaCal(cuerpo.replace("17:00", "18:00"), firma, "secreto")).toBe(false);
    expect(await verificarFirmaCal(cuerpo, null, "secreto")).toBe(false);
    expect(await verificarFirmaCal(cuerpo, "no-secret-provided", "secreto")).toBe(false);
  });
});
