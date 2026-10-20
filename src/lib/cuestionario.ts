// T16.1 · Las respuestas del cuestionario (/perfil) tal como las ve el cliente en su área: por los pasos del
// cuestionario y con sus mismas preguntas. Solo lo que devuelve mi_perfil(): nada del CRM.
import type { Perfil } from "@/types/admin";
import type { DiscType } from "./disc";

/** Columnas de perfiles que devuelve mi_perfil(): las mismas que su lista en la migración T16.1 (lo comprueba un test). */
export const CAMPOS_MI_PERFIL = [
  "nombre_completo", "email", "telefono", "edad", "ciudad", "zona", "acepta_otras_zonas", "estatura", "peso", "genero",
  "foto_url", "tipo_relacion", "busca_genero", "hijos", "tabaco", "edad_min_busca", "edad_max_busca", "importa_vestir",
  "estilo_vestir", "estilo_vestir_pareja", "importa_politica", "politica_pareja", "tiene_tatuajes", "tatuajes_pareja",
  "religion", "importa_religion", "religion_pareja", "ideologia", "alcohol", "desea_casarse", "valores_importantes",
  "deseo_familia", "ambicion_profesional", "nivel_social", "estilo_vida_activo", "necesidad_independencia", "conflicto",
  "sentirse_querido", "relacion_sana", "fin_de_semana", "hobbies", "aprendizaje_ultima_relacion", "vida_en_10_anios",
  "disc_respuestas",
] as const satisfies readonly (keyof Perfil)[];

/** Lo que devuelve mi_perfil(). */
export type MiPerfil = Omit<Pick<Perfil, (typeof CAMPOS_MI_PERFIL)[number]>, "disc_respuestas"> & {
  disc_respuestas: Record<string, DiscType> | null;
};

export interface Campo {
  etiqueta: string;
  valor: (p: MiPerfil) => string | number | null | undefined;
  /** Escala de 1 a 5. */
  escala?: boolean;
}

const siNo = (v: boolean | null) => (v == null ? null : v ? "Sí" : "No");
const lista = (v: string[] | null) => (v?.length ? v.join(", ") : null);
const con = (v: number | null, unidad: string) => (v ? `${v} ${unidad}` : null);

export const SECCIONES_PERFIL: { titulo: string; campos: Campo[] }[] = [
  {
    titulo: "Datos básicos",
    campos: [
      { etiqueta: "Nombre completo", valor: (p) => p.nombre_completo },
      { etiqueta: "Email", valor: (p) => p.email },
      { etiqueta: "Teléfono", valor: (p) => p.telefono },
      { etiqueta: "Edad", valor: (p) => con(p.edad, "años") },
      { etiqueta: "Ciudad", valor: (p) => p.ciudad },
      { etiqueta: "Provincia", valor: (p) => p.zona },
      { etiqueta: "¿Aceptas personas de otras provincias?", valor: (p) => siNo(p.acepta_otras_zonas) },
      { etiqueta: "Estatura", valor: (p) => con(p.estatura, "cm") },
      { etiqueta: "Peso", valor: (p) => con(p.peso, "kg") },
      { etiqueta: "¿Cuál es tu género?", valor: (p) => p.genero },
    ],
  },
  {
    titulo: "Lo que buscas",
    campos: [
      { etiqueta: "¿Qué tipo de relación buscas?", valor: (p) => p.tipo_relacion },
      { etiqueta: "¿A quién buscas?", valor: (p) => p.busca_genero },
      { etiqueta: "Rango de edad que buscas", valor: (p) => (p.edad_min_busca && p.edad_max_busca ? `De ${p.edad_min_busca} a ${p.edad_max_busca} años` : null) },
      { etiqueta: "Hijos", valor: (p) => p.hijos },
      { etiqueta: "Tabaco", valor: (p) => p.tabaco },
    ],
  },
  {
    titulo: "Preferencias",
    campos: [
      { etiqueta: "¿Te importa la forma de vestir?", valor: (p) => siNo(p.importa_vestir) },
      { etiqueta: "¿Cómo te gusta vestirte normalmente?", valor: (p) => p.estilo_vestir },
      { etiqueta: "¿Cómo te gustaría que se vistiera tu pareja?", valor: (p) => p.estilo_vestir_pareja },
      { etiqueta: "¿Te importa la ideología política de tu pareja?", valor: (p) => siNo(p.importa_politica) },
      { etiqueta: "¿Qué ideales te gustaría que tuviera tu pareja?", valor: (p) => p.politica_pareja },
      { etiqueta: "¿Cómo describirías tu ideología?", valor: (p) => p.ideologia },
      { etiqueta: "¿Tienes tatuajes?", valor: (p) => siNo(p.tiene_tatuajes) },
      { etiqueta: "¿Te gustaría que tu pareja tuviera tatuajes?", valor: (p) => p.tatuajes_pareja },
      { etiqueta: "¿Cuál es tu religión o creencia?", valor: (p) => p.religion },
      { etiqueta: "¿Te importa que tu pareja comparta tu religión?", valor: (p) => siNo(p.importa_religion) },
      { etiqueta: "¿Qué religión prefieres en tu pareja?", valor: (p) => p.religion_pareja },
      { etiqueta: "¿Cuál es tu relación con el alcohol?", valor: (p) => p.alcohol },
      { etiqueta: "¿Deseas casarte?", valor: (p) => p.desea_casarse },
    ],
  },
  {
    titulo: "Escala de valores",
    campos: [
      { etiqueta: "¿Qué valores son más importantes para ti?", valor: (p) => lista(p.valores_importantes) },
      { etiqueta: "Deseo de formar familia", valor: (p) => p.deseo_familia, escala: true },
      { etiqueta: "Ambición profesional", valor: (p) => p.ambicion_profesional, escala: true },
      { etiqueta: "Nivel social", valor: (p) => p.nivel_social, escala: true },
      { etiqueta: "Estilo de vida activo", valor: (p) => p.estilo_vida_activo, escala: true },
      { etiqueta: "Necesidad de independencia", valor: (p) => p.necesidad_independencia, escala: true },
    ],
  },
  {
    titulo: "Perfil emocional",
    campos: [
      { etiqueta: "En un conflicto tiendo a…", valor: (p) => lista(p.conflicto) },
      { etiqueta: "Para sentirme querido/a necesito…", valor: (p) => lista(p.sentirse_querido) },
    ],
  },
  {
    titulo: "Reflexiones",
    campos: [
      { etiqueta: "¿Qué significa para ti una relación sana?", valor: (p) => p.relacion_sana },
      { etiqueta: "¿Cómo sería un fin de semana normal para ti?", valor: (p) => p.fin_de_semana },
      { etiqueta: "¿Cuáles son tus hobbies e intereses?", valor: (p) => p.hobbies },
      { etiqueta: "¿Qué aprendiste de tu última relación?", valor: (p) => p.aprendizaje_ultima_relacion },
      { etiqueta: "¿Cómo te ves dentro de 10 años?", valor: (p) => p.vida_en_10_anios },
    ],
  },
];

/** Los campos con respuesta, con su valor (las preguntas que no contestó no se enseñan). */
export function respondidos(campos: Campo[], p: MiPerfil) {
  return campos
    .map((c) => ({ ...c, v: c.valor(p) }))
    .filter((c): c is Campo & { v: string | number } => c.v !== null && c.v !== undefined && String(c.v).trim() !== "");
}
