import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json } from "../_shared/http.ts";
import { exigirAdmin } from "../_shared/auth.ts";
import { leerConfiguracion } from "../_shared/configuracion.ts";
import { construirContextoCliente } from "../_shared/contextoCliente.ts";
import { pedirJSON } from "../_shared/ia.ts";
import { findMatchesFor, VERSION_ALGORITMO, type Pesos, type PerfilForMatching } from "../_shared/profileMatching.ts";
import { combinarConIA, promptReranking, SYSTEM_RERANKING, validarReranking } from "../_shared/reranking.ts";
import {
  candidatosDecididos, filaSugerencia, planificarSugerencias, soloReglas, type SugerenciaCalculada, type SugerenciaExistente,
} from "../_shared/sugerencias.ts";

// T4.4 · Calcula las mejores sugerencias de un cliente y las guarda en match_sugerencias.
// Idempotente: no duplica pares, no toca las aceptadas/rechazadas y caduca las pendientes que ya no entran.
// T5.2 · El top por reglas pasa por la IA con el contexto del cliente; si la IA falla, se queda con las reglas.

const VIGENCIA_MS = 24 * 60 * 60 * 1000;

// Las columnas de PerfilForMatching y los hobbies (para que la IA personalice): el cuestionario completo no hace falta.
const COLUMNAS = [
  "id", "nombre_completo", "email", "edad", "ciudad", "zona", "acepta_otras_zonas", "valores_importantes", "estado_cliente",
  "genero", "busca_genero", "edad_min_busca", "edad_max_busca", "tipo_relacion", "hijos", "tabaco", "alcohol",
  "desea_casarse", "religion", "religion_pareja", "importa_religion", "ideologia", "deseo_familia", "ambicion_profesional",
  "nivel_social", "estilo_vida_activo", "necesidad_independencia", "fin_de_semana", "conflicto", "sentirse_querido",
  "disc_perfil", "importa_vestir", "estilo_vestir", "estilo_vestir_pareja", "importa_politica", "politica_pareja",
  "tiene_tatuajes", "tatuajes_pareja", "hobbies",
].join(", ");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = await exigirAdmin(req);
    if (admin instanceof Response) return admin;
    const { supabase, userId } = admin;

    const { perfil_id, forzar = false } = await req.json();
    if (!perfil_id) return json({ error: "Falta perfil_id" }, 400);

    const { data: clienteData, error: clienteError } = await supabase.from("perfiles").select(COLUMNAS).eq("id", perfil_id).maybeSingle();
    if (clienteError) throw clienteError;
    if (!clienteData) return json({ error: "No existe el perfil" }, 404);
    const cliente = clienteData as unknown as PerfilForMatching;
    // Pausado, Finalizado o Baja: conserva lo que tenga, pero no recibe sugerencias nuevas.
    if (cliente.estado_cliente !== "activo") return json({ recalculado: false, motivo: "El cliente no está activo" });

    const { data: existentes, error: existentesError } = await supabase
      .from("match_sugerencias").select("candidato_id, estado, calculado_at").eq("perfil_id", perfil_id);
    if (existentesError) throw existentesError;
    // Solo cuentan las pendientes: actualizar-aprendizaje (T5.3) las deja con fecha antigua para forzar el recálculo.
    const vigente = (e: { estado: string; calculado_at: string }) => e.estado === "pendiente" && Date.now() - Date.parse(e.calculado_at) < VIGENCIA_MS;
    if (!forzar && existentes.some(vigente)) {
      return json({ recalculado: false, motivo: "Sugerencias calculadas hace menos de 24 h" });
    }

    const { data: aprendizaje, error: aprendizajeError } = await supabase
      .from("perfil_aprendizaje").select("ajustes_pesos").eq("perfil_id", perfil_id).maybeSingle();
    if (aprendizajeError) throw aprendizajeError;

    const config = await leerConfiguracion<{
      num_sugerencias?: number; num_candidatos_ia?: number; peso_ia?: number; pesos_algoritmo?: Pesos;
    }>(supabase);
    const numSugerencias = config.num_sugerencias ?? 10;

    // ponytail: PostgREST devuelve como mucho 1.000 filas; paginar con .range() cuando haya más perfiles activos.
    const { data: pool, error: poolError } = await supabase
      .from("perfiles").select(COLUMNAS).eq("estado_cliente", "activo").neq("id", perfil_id);
    if (poolError) throw poolError;
    const perfiles = pool as unknown as PerfilForMatching[];

    // AMPLIAR EN T6.1: excluir también los candidatos con un match en curso con este cliente (en cualquier orden).
    const reglas = findMatchesFor(cliente, perfiles, Math.max(config.num_candidatos_ia ?? 15, numSugerencias), {
      pesos: config.pesos_algoritmo,
      ajustes: (aprendizaje as unknown as { ajustes_pesos: Partial<Pesos> } | null)?.ajustes_pesos ?? {},
      excluirIds: candidatosDecididos(existentes as SugerenciaExistente[]),
    });

    let calculadas: SugerenciaCalculada[] = reglas.map(soloReglas);
    let ia = false;
    if (reglas.length) {
      try {
        const contexto = await construirContextoCliente(supabase, perfil_id);
        // El contexto lleva resúmenes y notas (datos de salud) camino del proveedor de IA: queda constancia (RGPD).
        await supabase.from("auditoria").insert({ user_id: userId, accion: "rerank_sugerencias_ia", entidad: "perfiles", entidad_id: perfil_id });
        const valoraciones = validarReranking(await pedirJSON(SYSTEM_RERANKING, promptReranking(contexto, reglas)), reglas.length);
        if (valoraciones.size) {
          calculadas = combinarConIA(reglas, valoraciones, config.peso_ia ?? 0.5);
          ia = true;
        }
      } catch (e) {
        // La ficha no se bloquea nunca por la IA: se guardan las de reglas (score_ia null, "solo reglas" en la UI).
        console.error("sugerencias-calcular: IA no disponible, solo reglas:", e instanceof Error ? e.message : e);
      }
    }

    const top = calculadas.slice(0, numSugerencias);
    const plan = planificarSugerencias(existentes as SugerenciaExistente[], top);
    const ahora = new Date().toISOString();
    const fila = (s: SugerenciaCalculada) => filaSugerencia(perfil_id, s, VERSION_ALGORITMO, ahora);

    // Las escrituras llevan su propia condición por si la psicóloga decide mientras tanto: no se pisa un aceptar/rechazar.
    if (plan.nuevas.length) {
      const { error } = await supabase
        .from("match_sugerencias").upsert(plan.nuevas.map(fila), { onConflict: "perfil_id,candidato_id", ignoreDuplicates: true });
      if (error) throw error;
    }
    const actualizaciones = await Promise.all(plan.actualizar.map((s) =>
      supabase.from("match_sugerencias").update(fila(s))
        .eq("perfil_id", perfil_id).eq("candidato_id", s.match.perfilB.id).in("estado", ["pendiente", "caducada"])
    ));
    const errorActualizar = actualizaciones.find((r) => r.error)?.error;
    if (errorActualizar) throw errorActualizar;
    if (plan.caducar.length) {
      const { error } = await supabase
        .from("match_sugerencias").update({ estado: "caducada", calculado_at: ahora })
        .eq("perfil_id", perfil_id).eq("estado", "pendiente").in("candidato_id", plan.caducar);
      if (error) throw error;
    }

    return json({ recalculado: true, ia, pendientes: top.length, nuevas: plan.nuevas.length, caducadas: plan.caducar.length });
  } catch (e) {
    console.error("sugerencias-calcular error:", e instanceof Error ? e.message : e);
    return json({ error: e instanceof Error ? e.message : "Error desconocido" }, 500);
  }
});
