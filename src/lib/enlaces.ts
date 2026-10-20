// Direcciones externas en un solo sitio. T10.3 traerá aquí las demás de Calendly (Precios, diálogo de planes, final
// del test DISC, final del cuestionario y Pagos), que hoy están repartidas por la web.

/**
 * T17.2 · Calendly donde el cliente reserva sus sesiones de seguimiento desde su área. Vacío hasta tener el
 * calendario conectado: sin él, el botón "Reservar sesión" no sale.
 */
export const CALENDLY_SESIONES = "";

/** El enlace de Calendly con su nombre y su email ya puestos (parámetros `name` y `email` de Calendly). */
export function enlaceReserva(base: string, nombre: string, email: string | null) {
  const url = new URL(base);
  url.searchParams.set("name", nombre.trim());
  if (email?.trim()) url.searchParams.set("email", email.trim());
  return url.toString();
}

/** Sesiones que aún puede reservar: las que le quedan del plan menos las que ya tiene programadas. */
export const sesionesPorReservar = (pendientes: number, programadas: number) => Math.max(pendientes - programadas, 0);
