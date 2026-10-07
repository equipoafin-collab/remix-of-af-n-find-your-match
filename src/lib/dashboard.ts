// T8.2 · Fechas del Dashboard en hora local (la psicóloga está en Madrid, como dashboard_resumen) y filtros por URL.

const inicioDelDia = (ahora: Date) => {
  const d = new Date(ahora);
  d.setHours(0, 0, 0, 0);
  return d;
};

/** [inicio de hoy, inicio de mañana) para la agenda. */
export function rangoDeHoy(ahora = new Date()) {
  const desde = inicioDelDia(ahora);
  const hasta = new Date(desde);
  hasta.setDate(hasta.getDate() + 1);
  return { desde: desde.toISOString(), hasta: hasta.toISOString() };
}

/** Desde cuándo un cliente es "nuevo" (30 días): la fecha para plan_inicio y el instante para el alta. */
export function inicioNuevos(ahora = new Date()) {
  const d = inicioDelDia(ahora);
  d.setDate(d.getDate() - 30);
  const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { fecha, instante: d.toISOString() };
}

/** Filtro que llega por la URL (enlaces del Dashboard), solo si es uno de los válidos. */
export function valorDeUrl<T extends string>(params: URLSearchParams, clave: string, validos: readonly T[]): T | undefined {
  const valor = params.get(clave);
  return validos.includes(valor as T) ? (valor as T) : undefined;
}
