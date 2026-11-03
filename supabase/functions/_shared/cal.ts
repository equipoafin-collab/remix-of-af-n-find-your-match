// T9.4 · Avisos de cal.com (Edge Function cal-webhook): la firma y qué pide cada aviso.
// Sin dependencias de Deno: Vitest lo prueba (src/lib/__tests__/cal.test.ts).
import { hex, iguales } from "./stripe.ts";

export type AccionReserva = "crear" | "mover" | "cancelar";

export interface ReservaCal {
  accion: AccionReserva;
  /** uid de la reserva en cal.com (sesiones.reserva_uid). */
  uid: string;
  /** Al mover, la reserva a la que sustituye (cal.com crea otra con uid nuevo). */
  uidAnterior: string | null;
  email: string;
  nombre: string;
  /** Inicio en ISO (UTC). */
  inicio: string;
  duracionMin: number;
}

const ACCIONES: Record<string, AccionReserva> = {
  BOOKING_CREATED: "crear",
  BOOKING_RESCHEDULED: "mover",
  BOOKING_CANCELLED: "cancelar",
};

interface AvisoCal {
  triggerEvent?: string;
  payload?: {
    uid?: string;
    rescheduleUid?: string;
    startTime?: string;
    endTime?: string;
    length?: number;
    attendees?: { name?: string; email?: string }[];
  };
}

/** Qué pide un aviso de cal.com, o null si no es de una reserva (p. ej. el ping de prueba) o le falta lo necesario. */
export function leerAvisoCal(aviso: unknown): ReservaCal | null {
  const { triggerEvent, payload: p } = (aviso ?? {}) as AvisoCal;
  const accion = ACCIONES[triggerEvent ?? ""];
  const inicio = Date.parse(p?.startTime ?? "");
  if (!accion || !p?.uid || Number.isNaN(inicio)) return null;

  const asistente = p.attendees?.[0];
  const email = asistente?.email?.trim().toLowerCase() ?? "";
  const duracionMin = Math.round(p.length ?? (Date.parse(p.endTime ?? "") - inicio) / 60_000);
  if (accion !== "cancelar" && (!email || !(duracionMin > 0))) return null;

  return {
    accion,
    uid: p.uid,
    uidAnterior: accion === "mover" ? p.rescheduleUid ?? null : null,
    email,
    nombre: asistente?.name?.trim() ?? "",
    inicio: new Date(inicio).toISOString(),
    duracionMin: duracionMin > 0 ? duracionMin : 60,
  };
}

/** ¿El aviso viene de cal.com? Cabecera `x-cal-signature-256`: HMAC-SHA256 del cuerpo con el secreto del webhook, en hex. */
export async function verificarFirmaCal(cuerpo: string, firma: string | null, secreto: string): Promise<boolean> {
  if (!firma || !secreto) return false;
  const codificar = new TextEncoder();
  const clave = await crypto.subtle.importKey("raw", codificar.encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return iguales(firma.trim().toLowerCase(), hex(await crypto.subtle.sign("HMAC", clave, codificar.encode(cuerpo))));
}
