/**
 * Algoritmo de compatibilidad multi-dimensional v3 — CRM matchmaking.
 *
 * Sin imports ni APIs de navegador o Deno: lo usan tal cual el admin (src/lib/profileMatching.ts lo reexporta)
 * y las Edge Functions (import "../_shared/profileMatching.ts"). Vitest lo prueba en src/lib/__tests__.
 *
 * FASE 1 (filtros excluyentes):
 *   - Candidato no activo (pausado, baja o finalizado) o en `excluirIds` (rechazado antes, match en curso)
 *   - Zonas distintas si ninguno acepta otras zonas ("Otra" o sin zona no excluye)
 *   - Género buscado ↔ género real
 *   - Rango de edad
 *   - Hijos: incompatible si uno NO quiere y otro tiene/quiere
 *   - Religión: si uno marca "importa" y la del otro no coincide → excluir
 *   - Política: si uno marca "importa" y la del otro no coincide → excluir
 *   Si entra en conflicto cualquiera → score = 0 (descartado).
 *
 * FASE 2 (puntuación 0-100, pesos por defecto; inyectables con `pesos` y `ajustes`):
 *   25% Objetivos de vida   (hijos, desea_casarse, tipo_relacion)
 *   20% Valores             (deseo_familia, religión, ideología, valores_importantes)
 *   20% Estilo de vida      (tabaco, alcohol, deporte, fin_de_semana)
 *   15% Personalidad        (DISC, social, independencia)
 *   10% Distancia geográfica (ciudad y zona)
 *   10% Preferencias        (vestir, tatuajes)
 */

export const VERSION_ALGORITMO = "v3";

export interface PerfilForMatching {
  id: string;
  nombre_completo: string;
  email: string | null;
  edad: number;
  ciudad: string;
  zona: string | null;
  acepta_otras_zonas: boolean;
  valores_importantes: string[];
  estado_cliente: string;
  genero: string | null;
  busca_genero: string | null;
  edad_min_busca: number | null;
  edad_max_busca: number | null;
  tipo_relacion: string;
  hijos: string;
  tabaco: string;
  alcohol?: string | null;
  desea_casarse?: string | null;
  religion?: string | null;
  religion_pareja?: string | null;
  importa_religion?: boolean | null;
  ideologia?: string | null;
  deseo_familia: number;
  ambicion_profesional: number;
  nivel_social: number;
  estilo_vida_activo: number;
  necesidad_independencia: number;
  fin_de_semana?: string | null;
  conflicto: string[] | null;
  sentirse_querido: string[] | null;
  disc_perfil: string | null;
  importa_vestir: boolean | null;
  estilo_vestir: string | null;
  estilo_vestir_pareja: string | null;
  importa_politica: boolean | null;
  politica_pareja: string | null;
  tiene_tatuajes: boolean | null;
  tatuajes_pareja: string | null;
  foto_url?: string | null;
}

/** Columnas de perfiles que necesita el algoritmo, para leer solo eso desde las Edge Functions. */
export const COLUMNAS_MATCHING = [
  "id", "nombre_completo", "email", "edad", "ciudad", "zona", "acepta_otras_zonas", "valores_importantes", "estado_cliente",
  "genero", "busca_genero", "edad_min_busca", "edad_max_busca", "tipo_relacion", "hijos", "tabaco", "alcohol",
  "desea_casarse", "religion", "religion_pareja", "importa_religion", "ideologia", "deseo_familia", "ambicion_profesional",
  "nivel_social", "estilo_vida_activo", "necesidad_independencia", "fin_de_semana", "conflicto", "sentirse_querido",
  "disc_perfil", "importa_vestir", "estilo_vestir", "estilo_vestir_pareja", "importa_politica", "politica_pareja",
  "tiene_tatuajes", "tatuajes_pareja",
];

export interface MatchSuggestion {
  perfilA: PerfilForMatching;
  perfilB: PerfilForMatching;
  score: number;
  breakdown: {
    filtros: boolean;
    objetivos: number;
    valores: number;
    estiloVida: number;
    personalidad: number;
    geografia: number;
    preferencias: number;
  };
  highlights: string[];
  warnings: string[];
  excluded?: string; // motivo si filtros duros fallan
}

export const WEIGHTS = {
  objetivos: 0.25,
  valores: 0.20,
  estiloVida: 0.20,
  personalidad: 0.15,
  geografia: 0.10,
  preferencias: 0.10,
};

export type Dimension = keyof typeof WEIGHTS;

/** Nombre de cada dimensión para mostrarla (ficha, aprendizaje). */
export const NOMBRES_DIMENSION: Record<Dimension, string> = {
  objetivos: "Objetivos",
  valores: "Valores",
  estiloVida: "Estilo de vida",
  personalidad: "Personalidad",
  geografia: "Geografía",
  preferencias: "Preferencias",
};
export type Pesos = Record<Dimension, number>;

export interface OpcionesMatching {
  /** Pesos base (configuracion.pesos_algoritmo). Por defecto, WEIGHTS. */
  pesos?: Pesos;
  /** Multiplicadores aprendidos para el cliente (perfil_aprendizaje.ajustes_pesos, T5.3): 1 = sin cambio. */
  ajustes?: Partial<Pesos>;
  /** Candidatos que no se pueden proponer: rechazados antes o con un match en curso con el cliente. */
  excluirIds?: string[];
}

const normalizar = (s: string | null | undefined) => s?.trim().toLowerCase() || null;
// "Otra" (fuera de España o sin provincia en la lista) no dice nada de la distancia.
const zonaConocida = (p: PerfilForMatching) => (p.zona === "Otra" ? null : normalizar(p.zona));

// ──────── Filtros duros (a = cliente, b = candidato) ────────
function hardFilterReason(a: PerfilForMatching, b: PerfilForMatching, excluirIds: string[] = []): string | null {
  if (b.estado_cliente !== "activo") return `Candidato no activo (${b.estado_cliente})`;
  if (excluirIds.includes(b.id)) return "Descartado antes o con un match en curso";

  // Zona
  const za = zonaConocida(a), zb = zonaConocida(b);
  if (za && zb && za !== zb && !a.acepta_otras_zonas && !b.acepta_otras_zonas)
    return "Zonas distintas y ninguno acepta otras zonas";

  // Género
  if (a.busca_genero && a.busca_genero !== "Ambos" && b.genero && a.busca_genero !== b.genero)
    return "Género buscado no coincide";
  if (b.busca_genero && b.busca_genero !== "Ambos" && a.genero && b.busca_genero !== a.genero)
    return "Género buscado no coincide";

  // Edad
  if (a.edad_min_busca && b.edad < a.edad_min_busca) return "Edad fuera de rango";
  if (a.edad_max_busca && b.edad > a.edad_max_busca) return "Edad fuera de rango";
  if (b.edad_min_busca && a.edad < b.edad_min_busca) return "Edad fuera de rango";
  if (b.edad_max_busca && a.edad > b.edad_max_busca) return "Edad fuera de rango";

  // Hijos incompatibles
  const noQuiere = (h: string) => h === "No quiero tener";
  const tieneOQuiere = (h: string) => h === "Tengo" || h === "Quiero tener";
  if ((noQuiere(a.hijos) && tieneOQuiere(b.hijos)) || (noQuiere(b.hijos) && tieneOQuiere(a.hijos)))
    return "Conflicto en hijos (uno no quiere, el otro sí)";

  // Religión
  if (a.importa_religion && a.religion_pareja && b.religion && a.religion_pareja !== b.religion)
    return `Religión incompatible (A requiere ${a.religion_pareja})`;
  if (b.importa_religion && b.religion_pareja && a.religion && b.religion_pareja !== a.religion)
    return `Religión incompatible (B requiere ${b.religion_pareja})`;

  // Política
  if (a.importa_politica && a.politica_pareja && b.ideologia && a.politica_pareja !== b.ideologia)
    return `Ideología incompatible (A requiere ${a.politica_pareja})`;
  if (b.importa_politica && b.politica_pareja && a.ideologia && b.politica_pareja !== a.ideologia)
    return `Ideología incompatible (B requiere ${b.politica_pareja})`;

  return null;
}

// ──────── Subscores 0-100 ────────
function scoreObjetivos(a: PerfilForMatching, b: PerfilForMatching): number {
  let p = 0, max = 0;
  // Tipo de relación
  max += 40;
  if (a.tipo_relacion === b.tipo_relacion) p += 40;
  else if (
    (a.tipo_relacion === "Matrimonio" && b.tipo_relacion === "Relación estable") ||
    (b.tipo_relacion === "Matrimonio" && a.tipo_relacion === "Relación estable")
  ) p += 25;
  // Hijos
  max += 35;
  if (a.hijos === b.hijos) p += 35;
  else {
    const tQ = (h: string) => h === "Tengo" || h === "Quiero tener";
    if (tQ(a.hijos) && tQ(b.hijos)) p += 25;
    else p += 10;
  }
  // Casarse
  max += 25;
  if (a.desea_casarse && b.desea_casarse) {
    if (a.desea_casarse === b.desea_casarse) p += 25;
    else if (a.desea_casarse === "Me da igual" || b.desea_casarse === "Me da igual") p += 18;
    else p += 5;
  } else p += 15; // sin datos: neutral
  return Math.round((p / max) * 100);
}

function scoreValores(a: PerfilForMatching, b: PerfilForMatching): number {
  let p = 0, max = 0;
  max += 40;
  p += 40 - Math.abs(a.deseo_familia - b.deseo_familia) * 10;
  max += 30;
  if (a.religion && b.religion) {
    if (a.religion === b.religion) p += 30;
    else p += 10;
  } else p += 20;
  max += 30;
  if (a.ideologia && b.ideologia) {
    if (a.ideologia === b.ideologia) p += 30;
    else if (
      (a.ideologia === "Centro" || b.ideologia === "Centro")
    ) p += 18;
    else p += 5;
  } else p += 20;
  max += 30;
  if (a.valores_importantes.length && b.valores_importantes.length) p += 30 * jaccard(a.valores_importantes, b.valores_importantes);
  else p += 20;
  return Math.max(0, Math.round((p / max) * 100));
}

/** Parecido entre dos conjuntos: elementos comunes / elementos distintos entre los dos (0-1). */
function jaccard(a: string[], b: string[]): number {
  const union = new Set([...a, ...b]).size;
  return union ? a.filter((x) => b.includes(x)).length / union : 0;
}

function scoreEstiloVida(a: PerfilForMatching, b: PerfilForMatching): number {
  let p = 0, max = 0;
  max += 30;
  if (a.tabaco === b.tabaco) p += 30;
  else if (a.tabaco === "Ocasional" || b.tabaco === "Ocasional") p += 18;
  else p += 5;
  max += 25;
  if (a.alcohol && b.alcohol) {
    if (a.alcohol === b.alcohol) p += 25;
    else p += 10;
  } else p += 15;
  max += 25;
  p += 25 - Math.abs(a.estilo_vida_activo - b.estilo_vida_activo) * 6;
  max += 20;
  if (a.fin_de_semana && b.fin_de_semana && a.fin_de_semana === b.fin_de_semana) p += 20;
  else p += 10;
  return Math.max(0, Math.round((p / max) * 100));
}

const DISC_COMPAT: Record<string, Record<string, number>> = {
  D: { D: 50, I: 75, S: 85, C: 70 },
  I: { D: 75, I: 60, S: 80, C: 65 },
  S: { D: 85, I: 80, S: 55, C: 75 },
  C: { D: 70, I: 65, S: 75, C: 55 },
};

function scorePersonalidad(a: PerfilForMatching, b: PerfilForMatching): number {
  const da = a.disc_perfil || "S";
  const db = b.disc_perfil || "S";
  const disc = DISC_COMPAT[da]?.[db] ?? 60;
  const social = 100 - Math.abs(a.nivel_social - b.nivel_social) * 25;
  const indep = 100 - Math.abs(a.necesidad_independencia - b.necesidad_independencia) * 25;
  return Math.round(disc * 0.6 + social * 0.2 + indep * 0.2);
}

function scoreGeografia(a: PerfilForMatching, b: PerfilForMatching): number {
  const ca = normalizar(a.ciudad), cb = normalizar(b.ciudad);
  if (ca && ca === cb) return 100;
  const za = zonaConocida(a);
  if (za && za === zonaConocida(b)) return 80;
  if (!ca || !cb) return 50;
  return 30;
}

function scorePreferencias(a: PerfilForMatching, b: PerfilForMatching): number {
  let p = 0, max = 0;
  if (a.importa_vestir && b.estilo_vestir) {
    max += 30;
    if (a.estilo_vestir_pareja === b.estilo_vestir) p += 30; else p += 10;
  }
  if (b.importa_vestir && a.estilo_vestir) {
    max += 30;
    if (b.estilo_vestir_pareja === a.estilo_vestir) p += 30; else p += 10;
  }
  if (a.tatuajes_pareja && b.tiene_tatuajes !== null) {
    max += 20;
    if (a.tatuajes_pareja === "Me da igual") p += 20;
    else if ((a.tatuajes_pareja === "Sí" && b.tiene_tatuajes) || (a.tatuajes_pareja === "No" && !b.tiene_tatuajes)) p += 20;
    else p += 5;
  }
  return max > 0 ? Math.round((p / max) * 100) : 70;
}

// ──────── Insights ────────
function buildInsights(a: PerfilForMatching, b: PerfilForMatching, bd: MatchSuggestion["breakdown"]) {
  const highlights: string[] = [];
  const warnings: string[] = [];
  if (bd.objetivos >= 80) highlights.push("Objetivos de vida muy alineados");
  if (bd.valores >= 80) highlights.push("Valores compartidos");
  if (bd.estiloVida >= 80) highlights.push("Mismo estilo de vida");
  if (bd.personalidad >= 80) highlights.push("Personalidades complementarias");
  if (bd.geografia === 100) highlights.push("Misma ciudad");
  else if (bd.geografia === 80) highlights.push("Misma provincia");
  const comunes = a.valores_importantes.filter((v) => b.valores_importantes.includes(v));
  if (comunes.length) highlights.push(`Comparten valores: ${comunes.join(", ")}`);
  if (a.hijos === b.hijos) highlights.push(`Coinciden en hijos: ${a.hijos}`);
  if (a.desea_casarse && a.desea_casarse === b.desea_casarse) highlights.push(`Ambos sobre casarse: ${a.desea_casarse}`);

  if (bd.objetivos < 50) warnings.push("Objetivos de vida poco alineados");
  if (bd.valores < 50) warnings.push("Diferencias relevantes en valores");
  if (a.religion && b.religion && a.religion !== b.religion) warnings.push(`Religión distinta (${a.religion} vs ${b.religion})`);
  if (a.ideologia && b.ideologia && a.ideologia !== b.ideologia) warnings.push(`Ideología distinta (${a.ideologia} vs ${b.ideologia})`);
  if (a.tabaco !== b.tabaco) warnings.push("Diferente relación con el tabaco");
  if (Math.abs(a.edad - b.edad) > 10) warnings.push(`Diferencia de edad notable (${Math.abs(a.edad - b.edad)} años)`);
  if (bd.geografia < 50) warnings.push("Ciudades distintas");
  return { highlights, warnings };
}

export function matchProfiles(a: PerfilForMatching, b: PerfilForMatching, opciones: OpcionesMatching = {}): MatchSuggestion {
  const excluded = hardFilterReason(a, b, opciones.excluirIds);
  if (excluded) {
    return {
      perfilA: a, perfilB: b, score: 0, excluded,
      breakdown: { filtros: false, objetivos: 0, valores: 0, estiloVida: 0, personalidad: 0, geografia: 0, preferencias: 0 },
      highlights: [], warnings: [excluded],
    };
  }
  const objetivos = scoreObjetivos(a, b);
  const valores = scoreValores(a, b);
  const estiloVida = scoreEstiloVida(a, b);
  const personalidad = scorePersonalidad(a, b);
  const geografia = scoreGeografia(a, b);
  const preferencias = scorePreferencias(a, b);
  const breakdown = { filtros: true, objetivos, valores, estiloVida, personalidad, geografia, preferencias };
  const score = puntuar(breakdown, opciones);
  const { highlights, warnings } = buildInsights(a, b, breakdown);
  return { perfilA: a, perfilB: b, score, breakdown, highlights, warnings };
}

/** Media de las dimensiones con los pesos ajustados; se divide por su suma para seguir en 0-100 aunque no sumen 1. */
function puntuar(bd: MatchSuggestion["breakdown"], { pesos = WEIGHTS, ajustes = {} }: OpcionesMatching): number {
  let suma = 0, total = 0;
  for (const d of Object.keys(WEIGHTS) as Dimension[]) {
    const peso = Math.max(0, (pesos[d] ?? WEIGHTS[d]) * (ajustes[d] ?? 1));
    suma += bd[d] * peso;
    total += peso;
  }
  return total > 0 ? Math.round(suma / total) : 0;
}

/** Ranking de candidatos compatibles para un perfil concreto (excluye descartados por filtros duros). */
export function findMatchesFor(target: PerfilForMatching, pool: PerfilForMatching[], limit = 20, opciones: OpcionesMatching = {}): MatchSuggestion[] {
  return pool
    .filter((p) => p.id !== target.id)
    .map((p) => matchProfiles(target, p, opciones))
    .filter((m) => !m.excluded)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Compatibilidad cruzada entre todos los perfiles (descartados excluidos). */
export function generateAllMatches(perfiles: PerfilForMatching[]): MatchSuggestion[] {
  const results: MatchSuggestion[] = [];
  for (let i = 0; i < perfiles.length; i++) {
    for (let j = i + 1; j < perfiles.length; j++) {
      const m = matchProfiles(perfiles[i], perfiles[j]);
      if (!m.excluded) results.push(m);
    }
  }
  return results.sort((a, b) => b.score - a.score);
}
