import type { Tables } from "@/integrations/supabase/types";
import { claveSegura } from "@/lib/storage";

/** T9.3 · Versión del texto de consentimiento del cuestionario y de la política de privacidad; se guarda en el perfil. */
export const VERSION_CONSENTIMIENTO = "2026-10-08";

export interface DatosCliente {
  perfil: Tables<"perfiles">;
  /** El test vinculado y los hechos con el mismo email. */
  disc: Tables<"disc_results">[];
  pagos: Tables<"pagos">[];
  sesiones: Tables<"sesiones">[];
  notas: Tables<"notas_privadas">[];
  aprendizaje: Tables<"perfil_aprendizaje"> | null;
  /** Las suyas y en las que es candidata para otros clientes. */
  sugerencias: Tables<"match_sugerencias">[];
  matches: Tables<"matches">[];
  archivos: { bucket: string; ruta: string }[];
}

/**
 * T9.3 · Exportación de todo lo del cliente (derechos de acceso y portabilidad). De sugerencias y matches se
 * quita lo que es de la otra persona: quién es, su feedback y, cuando esta persona era la candidata, los motivos,
 * riesgos y decisión, que la IA y la psicóloga escriben desde el otro cliente (citan su cuestionario y sus sesiones).
 * Fuera quedan tareas, alertas y auditoría (gestión interna).
 */
export function construirExportacion(d: DatosCliente, ahora = new Date()) {
  const id = d.perfil.id;
  return {
    exportado_at: ahora.toISOString(),
    perfil: d.perfil,
    tests_disc: d.disc,
    pagos: d.pagos,
    sesiones: d.sesiones,
    notas_privadas: d.notas,
    aprendizaje_ia: d.aprendizaje,
    sugerencias: d.sugerencias.map((s) => {
      const propia = s.perfil_id === id;
      return {
        rol: propia ? "cliente" : "candidato",
        score: s.score,
        score_reglas: s.score_reglas,
        score_ia: s.score_ia,
        motivos: propia ? s.motivos : [],
        riesgos: propia ? s.riesgos : [],
        estado: s.estado,
        motivo_decision: propia ? s.motivo_decision : null,
        calculado_at: s.calculado_at,
        decidido_at: s.decidido_at,
      };
    }),
    matches: d.matches.map((m) => {
      const lado = m.perfil_a === id ? "a" : "b";
      return {
        estado: m.estado,
        fecha_cita: m.fecha_cita,
        lugar: m.lugar,
        informe: m.informe,
        informe_enviado_at: m.informe_enviado_at,
        created_at: m.created_at,
        feedback: m[`feedback_${lado}`],
        valoracion: m[`valoracion_${lado}`],
        quiere_repetir: m[`quiere_repetir_${lado}`],
      };
    }),
    archivos: d.archivos,
  };
}

export const nombreExportacion = (nombre: string, ahora = new Date()) =>
  `afin-datos-${claveSegura(nombre).toLowerCase()}-${ahora.toISOString().slice(0, 10)}.json`;
