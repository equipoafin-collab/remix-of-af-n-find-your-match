// T17.1 · Fichero .ics (iCalendar, RFC 5545) de una cita, para "Añadir a mi calendario": lo abren Google Calendar,
// el calendario de iPhone y Outlook. Sin dependencias. Horas en UTC, así no depende de la zona del teléfono.

export interface EventoIcs {
  uid: string;
  inicio: Date;
  duracionMin: number;
  titulo: string;
  descripcion?: string;
}

// 20261023T160000Z
const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

// Comas, puntos y comas, barras y saltos de línea van escapados.
const texto = (t: string) => t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

export function crearIcs(e: EventoIcs, ahora = new Date()) {
  const fin = new Date(e.inicio.getTime() + e.duracionMin * 60_000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Afín//Área del cliente//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.uid}@afin`,
    `DTSTAMP:${utc(ahora)}`,
    `DTSTART:${utc(e.inicio)}`,
    `DTEND:${utc(fin)}`,
    `SUMMARY:${texto(e.titulo)}`,
    ...(e.descripcion ? [`DESCRIPTION:${texto(e.descripcion)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

/** Descarga el .ics: el teléfono lo abre con su calendario. */
export function descargarIcs(e: EventoIcs, nombre = "cita-afin.ics") {
  const url = URL.createObjectURL(new Blob([crearIcs(e)], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
