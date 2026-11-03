// T10.3 · Direcciones externas en un solo sitio: las citas de cal.com (cuenta equipo-afin).

/** Sesión de descubrimiento, gratis: Precios, diálogo de planes, final del test DISC y final del cuestionario. */
export const RESERVA_DESCUBRIMIENTO = "https://cal.com/equipo-afin/descubrimiento";

/**
 * T17.2 · Cita de seguimiento ("Cita en Afín", oculta en cal.com): el cliente reserva sus sesiones desde su área y la
 * psicóloga, desde Pagos. Con T9.4, cada reserva entra sola en sus sesiones.
 */
export const RESERVA_SESIONES = "https://cal.com/equipo-afin/sesion";

/** El enlace de la cita con su nombre y su email ya puestos (parámetros `name` y `email` de cal.com). */
export function enlaceReserva(base: string, nombre: string, email: string | null) {
  const url = new URL(base);
  url.searchParams.set("name", nombre.trim());
  if (email?.trim()) url.searchParams.set("email", email.trim());
  return url.toString();
}

/** Sesiones que aún puede reservar: las que le quedan del plan menos las que ya tiene programadas. */
export const sesionesPorReservar = (pendientes: number, programadas: number) => Math.max(pendientes - programadas, 0);
