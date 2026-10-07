// Sin dependencias de Deno: contextoCliente.ts lo rellena con datos de la BD y Vitest lo prueba.
import { PREGUNTAS_CLAVE, type RespuestasClave } from "./preguntasClave.ts";
import type { ResumenSesion } from "./resumen.ts";

/** Respuestas del cuestionario útiles para el matching. Sin nombre, email ni teléfono: la IA no los necesita (RGPD). */
export type CuestionarioContexto = RespuestasClave & {
  edad: number;
  genero: string | null;
  busca_genero: string | null;
  desea_casarse: string | null;
  religion: string | null;
  importa_religion: boolean | null;
  religion_pareja: string | null;
  ideologia: string | null;
  importa_politica: boolean | null;
  politica_pareja: string | null;
  tabaco: string;
  alcohol: string | null;
  deseo_familia: number;
  ambicion_profesional: number;
  nivel_social: number;
  estilo_vida_activo: number;
  necesidad_independencia: number;
  conflicto: string[] | null;
  sentirse_querido: string[] | null;
  relacion_sana: string;
  vida_en_10_anios: string;
  aprendizaje_ultima_relacion: string;
  fin_de_semana: string | null;
  hobbies: string | null;
  disc_perfil: string | null;
};

export interface CandidatoResumido {
  edad: number;
  genero: string | null;
  zona: string | null;
  ciudad: string;
  tipo_relacion: string;
  hijos: string;
  valores_importantes: string[];
  disc_perfil: string | null;
}

export interface DatosContexto {
  perfil: CuestionarioContexto;
  disc: { principal: string; secundario: string; fortalezas: string[]; a_mejorar: string[] } | null;
  /** perfil_aprendizaje.preferencias (las destila T5.3). */
  preferencias: { valora?: string[]; evita?: string[]; notas?: string } | null;
  resumenes: { fecha: string; resumen: ResumenSesion }[];
  notas: { fecha: string; contenido: string }[];
  decisiones: { fecha: string; estado: string; motivo: string | null; score: number; candidato: CandidatoResumido | null }[];
  /** Lo que el propio cliente contó tras cada cita (T6.5). */
  citas: { fecha: string; con: CandidatoResumido | null; valoracion: number | null; repetir: boolean | null; feedback: string }[];
}

const CARACTERES_POR_TOKEN = 4; // aproximación para español
const MAX_TEXTO_LIBRE = 300; // respuestas abiertas del cuestionario
const MAX_NOTA = 800;

const recortar = (s: string, max: number) => (s.length > max ? `${s.slice(0, max).trimEnd()}…` : s);
const dia = (iso: string) => iso.slice(0, 10);
const lista = (xs: string[] | null | undefined) => (xs ?? []).filter(Boolean).join("; ");
const linea = (etiqueta: string, valor: string | null | undefined) => (valor ? `- ${etiqueta}: ${valor}` : null);
const seccion = (titulo: string, lineas: (string | null)[]) => {
  const llenas = lineas.filter((l): l is string => !!l);
  return llenas.length ? `## ${titulo}\n${llenas.join("\n")}` : null;
};

function cuestionario(p: CuestionarioContexto) {
  const conPreferencia = (propia: string | null, importa: boolean | null, pareja: string | null) =>
    propia && `${propia}${importa && pareja ? ` (exige pareja: ${pareja})` : ""}`;
  return seccion("Cuestionario", [
    `- Edad: ${p.edad}${p.genero ? ` · Género: ${p.genero}` : ""}${p.busca_genero ? ` · Busca: ${p.busca_genero}` : ""}`,
    linea("Casarse", p.desea_casarse),
    linea("Religión", conPreferencia(p.religion, p.importa_religion, p.religion_pareja)),
    linea("Ideología", conPreferencia(p.ideologia, p.importa_politica, p.politica_pareja)),
    `- Tabaco: ${p.tabaco}${p.alcohol ? ` · Alcohol: ${p.alcohol}` : ""}`,
    `- Escalas 1-5: familia ${p.deseo_familia}, ambición ${p.ambicion_profesional}, vida social ${p.nivel_social}, vida activa ${p.estilo_vida_activo}, independencia ${p.necesidad_independencia}`,
    linea("En un conflicto", lista(p.conflicto)),
    linea("Para sentirse querido/a", lista(p.sentirse_querido)),
    ...([
      ["Relación sana", p.relacion_sana],
      ["Vida en 10 años", p.vida_en_10_anios],
      ["Aprendizaje de su última relación", p.aprendizaje_ultima_relacion],
      ["Fin de semana", p.fin_de_semana],
      ["Hobbies", p.hobbies],
    ] as const).map(([etiqueta, texto]) => linea(etiqueta, texto?.trim() && `"${recortar(texto.trim(), MAX_TEXTO_LIBRE)}"`)),
  ]);
}

const candidato = (c: CandidatoResumido | null) =>
  c
    ? `${c.genero ?? "persona"} de ${c.edad} años, ${c.zona ?? c.ciudad}, busca ${c.tipo_relacion}, hijos: ${c.hijos}` +
      `${c.valores_importantes.length ? `, valores: ${c.valores_importantes.join(", ")}` : ""}${c.disc_perfil ? `, DISC ${c.disc_perfil}` : ""}`
    : "perfil ya borrado";

function renderizar(d: DatosContexto) {
  const r = d.resumenes.map(({ fecha, resumen: s }) =>
    `- ${dia(fecha)} · Estado emocional: ${s.estado_emocional}` +
    [["Avances", s.avances], ["Objetivos", s.objetivos], ["Preferencias detectadas", s.preferencias_detectadas]]
      .map(([etiqueta, xs]) => (xs.length ? ` · ${etiqueta}: ${lista(xs as string[])}` : ""))
      .join(""),
  );
  return [
    seccion("Preguntas clave", PREGUNTAS_CLAVE.map((q) => `- ${q.etiqueta}: ${q.respuesta(d.perfil) ?? "—"}`)),
    cuestionario(d.perfil),
    seccion("Personalidad (DISC)", [
      d.disc
        ? `- Principal ${d.disc.principal}, secundario ${d.disc.secundario}${d.disc.fortalezas.length ? ` · Fortalezas: ${lista(d.disc.fortalezas)}` : ""}${d.disc.a_mejorar.length ? ` · A mejorar: ${lista(d.disc.a_mejorar)}` : ""}`
        : linea("Perfil", d.perfil.disc_perfil),
    ]),
    seccion("Preferencias aprendidas", [
      linea("Valora", lista(d.preferencias?.valora)),
      linea("Evita", lista(d.preferencias?.evita)),
      linea("Notas", d.preferencias?.notas?.trim()),
    ]),
    seccion("Resúmenes de sesión revisados (más reciente primero)", r),
    seccion("Notas de la psicóloga (más reciente primero)", d.notas.map((n) => `- ${dia(n.fecha)}: ${recortar(n.contenido.trim(), MAX_NOTA)}`)),
    seccion(
      "Feedback del cliente tras sus citas (más reciente primero)",
      d.citas.map((c) =>
        `- ${dia(c.fecha)} · con ${candidato(c.con)}` +
        `${c.valoracion ? ` · valoración ${c.valoracion}/5` : ""}${c.repetir === null ? "" : ` · quiere volver a verle: ${c.repetir ? "sí" : "no"}`}` +
        `: ${recortar(c.feedback.trim(), MAX_NOTA)}`,
      ),
    ),
    seccion(
      "Decisiones sobre candidatos (más reciente primero)",
      d.decisiones.map((x) => `- ${dia(x.fecha)} · ${x.estado}${x.motivo ? ` (${x.motivo})` : ""}: ${candidato(x.candidato)} · ${x.score} %`),
    ),
  ].filter(Boolean).join("\n\n");
}

const porFechaDesc = <T extends { fecha: string }>(xs: T[]) => [...xs].sort((a, b) => b.fecha.localeCompare(a.fecha));

/**
 * Texto estructurado con lo que la IA necesita saber del cliente (T5.1). Si pasa de `maxTokens`, quita
 * resúmenes, notas, feedback de citas y decisiones empezando por el más antiguo; el cuestionario se queda siempre.
 */
export function formatearContexto(d: DatosContexto, maxTokens = 6000): string {
  const datos = {
    ...d,
    resumenes: porFechaDesc(d.resumenes),
    notas: porFechaDesc(d.notas),
    decisiones: porFechaDesc(d.decisiones),
    citas: porFechaDesc(d.citas),
  };
  let texto = renderizar(datos);
  while (texto.length / CARACTERES_POR_TOKEN > maxTokens) {
    const listas = [datos.resumenes, datos.notas, datos.decisiones, datos.citas].filter((xs) => xs.length);
    if (!listas.length) break;
    // El último de cada lista es su más antiguo: se quita el más antiguo de todos.
    const masAntigua = listas.reduce((a, b) => (a[a.length - 1].fecha <= b[b.length - 1].fecha ? a : b));
    masAntigua.pop();
    texto = renderizar(datos);
  }
  return texto;
}
