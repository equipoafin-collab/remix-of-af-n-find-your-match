// Sin dependencias: la usan la ficha (src/lib/preguntasClave.ts la reexporta) y el contexto de la IA (contexto.ts).

export const TIPO_RELACION = ["Matrimonio", "Relación estable", "Relación sin convivencia", "Casual"];
export const HIJOS = ["Tengo", "No tengo", "Quiero tener", "No quiero tener"];

/** Provincias de España (más Ceuta y Melilla), por orden alfabético de la palabra principal, y "Otra" para el resto. */
export const PROVINCIAS = [
  "Álava", "Albacete", "Alicante", "Almería", "Asturias", "Ávila", "Badajoz", "Baleares", "Barcelona", "Bizkaia",
  "Burgos", "Cáceres", "Cádiz", "Cantabria", "Castellón", "Ceuta", "Ciudad Real", "Córdoba", "A Coruña", "Cuenca",
  "Gipuzkoa", "Girona", "Granada", "Guadalajara", "Huelva", "Huesca", "Jaén", "León", "Lleida", "Lugo",
  "Madrid", "Málaga", "Melilla", "Murcia", "Navarra", "Ourense", "Palencia", "Las Palmas", "Pontevedra", "La Rioja",
  "Salamanca", "Santa Cruz de Tenerife", "Segovia", "Sevilla", "Soria", "Tarragona", "Teruel", "Toledo", "Valencia", "Valladolid",
  "Zamora", "Zaragoza", "Otra",
];

export const VALORES_IMPORTANTES = [
  "Familia", "Honestidad", "Fe/espiritualidad", "Ambición", "Libertad",
  "Estabilidad", "Humor", "Cultura", "Salud/deporte", "Compromiso social",
];
export const MAX_VALORES = 3;

/** Campos del perfil que responden a las preguntas clave (un Perfil completo también encaja). */
export type RespuestasClave = {
  tipo_relacion: string;
  hijos: string;
  edad_min_busca: number | null;
  edad_max_busca: number | null;
  zona: string | null;
  ciudad: string;
  acepta_otras_zonas: boolean;
  valores_importantes: string[];
};

/** Las 5 preguntas clave (sección 2.3 del plan): base del matching y lo primero que ve la psicóloga en la ficha. */
export const PREGUNTAS_CLAVE: {
  clave: "tipo_relacion" | "hijos" | "rango_edad" | "zona" | "valores_importantes";
  etiqueta: string;
  opciones?: string[];
  respuesta: (p: RespuestasClave) => string | null;
}[] = [
  { clave: "tipo_relacion", etiqueta: "Tipo de relación", opciones: TIPO_RELACION, respuesta: (p) => p.tipo_relacion },
  { clave: "hijos", etiqueta: "Hijos", opciones: HIJOS, respuesta: (p) => p.hijos },
  {
    clave: "rango_edad",
    etiqueta: "Rango de edad que busca",
    respuesta: (p) => (p.edad_min_busca && p.edad_max_busca ? `${p.edad_min_busca} - ${p.edad_max_busca}` : null),
  },
  {
    clave: "zona",
    etiqueta: "Zona",
    opciones: PROVINCIAS,
    // Los perfiles anteriores a T4.2 sin provincia reconocible solo tienen la ciudad.
    respuesta: (p) => `${p.zona ?? p.ciudad}${p.acepta_otras_zonas ? " · abierto/a a otras zonas" : ""}`,
  },
  {
    clave: "valores_importantes",
    etiqueta: "Valores importantes",
    opciones: VALORES_IMPORTANTES,
    respuesta: (p) => p.valores_importantes.join(", ") || null,
  },
];
