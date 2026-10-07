import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json } from "../_shared/http.ts";
import { exigirAdmin } from "../_shared/auth.ts";
import { leerConfiguracion } from "../_shared/configuracion.ts";
import { findMatchesFor, VERSION_ALGORITMO, type Pesos, type PerfilForMatching } from "../_shared/profileMatching.ts";
import { candidatosDecididos, filaSugerencia, planificarSugerencias, type SugerenciaExistente } from "../_shared/sugerencias.ts";

// T4.4 · Calcula por reglas las mejores sugerencias de un cliente y las guarda en match_sugerencias.
// Idempotente: no duplica pares, no toca las aceptadas/rechazadas y caduca las pendientes que ya no entran.

const VIGENCIA_MS = 24 * 60 * 60 * 1000;

// Las columnas de PerfilForMatching: el cuestionario completo no hace falta.
const COLUMNAS = [
  "id", "nombre_completo", "email", "edad", "ciudad", "zona", "acepta_otras_zonas", "valores_importantes", "estado_cliente",
  "genero", "busca_genero", "edad_min_busca", "edad_max_busca", "tipo_relacion", "hijos", "tabaco", "alcohol",
  "desea_casarse", "religion", "religion_pareja", "importa_religion", "ideologia", "deseo_familia", "ambicion_profesional",
  "nivel_social", "estilo_vida_activo", "necesidad_independencia", "fin_de_semana", "conflicto", "sentirse_querido",
  "disc_perfil", "importa_vestir", "estilo_vestir", "estilo_vestir_pareja", "importa_politica", "politica_pareja",
  "tiene_tatuajes", "tatuajes_pareja",
].join(", ");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = await exigirAdmin(req);
    if (admin instanceof Response) return admin;
    const { supabase } = admin;

    const { perfil_id, forzar = false } = await req.json();
    if (!perfil_id) return json({ error: "Falta perfil_id" }, 400);

    const { data: cliente, error: clienteError } = await supabase.from("perfiles").select(COLUMNAS).eq("id", perfil_id).maybeSingle();
    if (clienteError) throw clienteError;
    if (!cliente) return json({ error: "No existe el perfil" }, 404);
    // Pausado, Finalizado o Baja: conserva lo que tenga, pero no recibe sugerencias nuevas.
    if (cliente.estado_cliente !== "activo") return json({ recalculado: false, motivo: "El cliente no está activo" });

    const { data: existentes, error: existentesError } = await supabase
      .from("match_sugerencias").select("candidato_id, estado, calculado_at").eq("perfil_id", perfil_id);
    if (existentesError) throw existentesError;
    if (!forzar && existentes.some((e) => Date.now() - Date.parse(e.calculado_at) < VIGENCIA_MS)) {
      return json({ recalculado: false, motivo: "Sugerencias calculadas hace menos de 24 h" });
    }

    const config = await leerConfiguracion<{ num_sugerencias?: number; pesos_algoritmo?: Pesos }>(supabase);

    // ponytail: PostgREST devuelve como mucho 1.000 filas; paginar con .range() cuando haya más perfiles activos.
    const { data: pool, error: poolError } = await supabase
      .from("perfiles").select(COLUMNAS).eq("estado_cliente", "activo").neq("id", perfil_id);
    if (poolError) throw poolError;

    // AMPLIAR EN T6.1: excluir también los candidatos con un match en curso con este cliente (en cualquier orden).
    const top = findMatchesFor(cliente as PerfilForMatching, pool as PerfilForMatching[], config.num_sugerencias ?? 10, {
      pesos: config.pesos_algoritmo,
      excluirIds: candidatosDecididos(existentes as SugerenciaExistente[]),
    });
    const plan = planificarSugerencias(existentes as SugerenciaExistente[], top);
    const ahora = new Date().toISOString();
    const fila = (m: (typeof top)[number]) => filaSugerencia(perfil_id, m, VERSION_ALGORITMO, ahora);

    // Las escrituras llevan su propia condición por si la psicóloga decide mientras tanto: no se pisa un aceptar/rechazar.
    if (plan.nuevas.length) {
      const { error } = await supabase
        .from("match_sugerencias").upsert(plan.nuevas.map(fila), { onConflict: "perfil_id,candidato_id", ignoreDuplicates: true });
      if (error) throw error;
    }
    const actualizaciones = await Promise.all(plan.actualizar.map((m) =>
      supabase.from("match_sugerencias").update(fila(m))
        .eq("perfil_id", perfil_id).eq("candidato_id", m.perfilB.id).in("estado", ["pendiente", "caducada"])
    ));
    const errorActualizar = actualizaciones.find((r) => r.error)?.error;
    if (errorActualizar) throw errorActualizar;
    if (plan.caducar.length) {
      const { error } = await supabase
        .from("match_sugerencias").update({ estado: "caducada", calculado_at: ahora })
        .eq("perfil_id", perfil_id).eq("estado", "pendiente").in("candidato_id", plan.caducar);
      if (error) throw error;
    }

    return json({ recalculado: true, pendientes: top.length, nuevas: plan.nuevas.length, caducadas: plan.caducar.length });
  } catch (e) {
    console.error("sugerencias-calcular error:", e instanceof Error ? e.message : e);
    return json({ error: e instanceof Error ? e.message : "Error desconocido" }, 500);
  }
});
