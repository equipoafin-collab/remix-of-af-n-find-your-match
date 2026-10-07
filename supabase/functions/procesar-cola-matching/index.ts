import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json } from "../_shared/http.ts";
import { exigirAdmin } from "../_shared/auth.ts";
import { leerConfiguracion } from "../_shared/configuracion.ts";
import { detectarCompatibles, planificarDeteccion } from "../_shared/deteccion.ts";
import { COLUMNAS_MATCHING, VERSION_ALGORITMO, type MatchSuggestion, type Pesos, type PerfilForMatching } from "../_shared/profileMatching.ts";
import { filaSugerencia, soloReglas, type EstadoSugerencia } from "../_shared/sugerencias.ts";

// T5.4 · Procesa cola_matching: cada perfil nuevo o reactivado contra todos los clientes activos con plan,
// solo por reglas. Si es muy compatible con alguno (≥ umbral_alta_compatibilidad), le crea o actualiza la sugerencia
// y una alerta "info" (T7.1).

const LOTE = 50; // ponytail: perfiles por llamada; lo que no quepa sale en la siguiente
const COLUMNAS = COLUMNAS_MATCHING.join(", ");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // AMPLIAR EN T7.3: aceptar también la llamada del proceso programado (pg_cron), sin sesión de admin.
    const admin = await exigirAdmin(req);
    if (admin instanceof Response) return admin;
    const { supabase } = admin;

    const { data: cola, error: colaError } = await supabase
      .from("cola_matching").select("perfil_id, encolado_at").order("encolado_at").limit(LOTE);
    if (colaError) throw colaError;
    if (!cola.length) return json({ procesados: 0, detecciones: [] });
    const ids = cola.map((c) => c.perfil_id as string);

    const [nuevosRes, clientesRes, aprendizajeRes, existentesRes, config] = await Promise.all([
      supabase.from("perfiles").select(COLUMNAS).in("id", ids).eq("estado_cliente", "activo"),
      supabase.from("perfiles").select(COLUMNAS).eq("estado_cliente", "activo").not("plan", "is", null),
      supabase.from("perfil_aprendizaje").select("perfil_id, ajustes_pesos"),
      supabase.from("match_sugerencias").select("perfil_id, candidato_id, estado").in("candidato_id", ids),
      leerConfiguracion<{ umbral_alta_compatibilidad?: number; pesos_algoritmo?: Pesos }>(supabase),
    ]);
    for (const r of [nuevosRes, clientesRes, aprendizajeRes, existentesRes]) if (r.error) throw r.error;

    // Si dejó de estar activo antes de procesarlo, no se busca nada: solo sale de la cola.
    const nuevos = (nuevosRes.data ?? []) as unknown as PerfilForMatching[];
    const clientes = (clientesRes.data ?? []) as unknown as PerfilForMatching[];
    const ajustes = new Map(((aprendizajeRes.data ?? []) as unknown as { perfil_id: string; ajustes_pesos: Partial<Pesos> }[])
      .map((a) => [a.perfil_id, a.ajustes_pesos]));
    const existentes = (existentesRes.data ?? []) as unknown as { perfil_id: string; candidato_id: string; estado: EstadoSugerencia }[];
    const umbral = config.umbral_alta_compatibilidad ?? 80;
    const opcionesDe = (clienteId: string) => ({ pesos: config.pesos_algoritmo, ajustes: ajustes.get(clienteId) ?? {} });

    const ahora = new Date().toISOString();
    const fila = (m: MatchSuggestion) => filaSugerencia(m.perfilA.id, soloReglas(m), VERSION_ALGORITMO, ahora);
    const detectadas: { cliente_id: string; candidato_id: string; score: number }[] = [];

    for (const nuevo of nuevos) {
      const detecciones = detectarCompatibles(nuevo, clientes, umbral, opcionesDe);
      if (!detecciones.length) continue;
      const estados = new Map(existentes.filter((e) => e.candidato_id === nuevo.id).map((e) => [e.perfil_id, e.estado]));
      const plan = planificarDeteccion(estados, detecciones);

      // Mismas condiciones que sugerencias-calcular: no se duplica un par ni se pisa una decisión.
      if (plan.nuevas.length) {
        const { error } = await supabase
          .from("match_sugerencias").upsert(plan.nuevas.map(fila), { onConflict: "perfil_id,candidato_id", ignoreDuplicates: true });
        if (error) throw error;
      }
      const actualizaciones = await Promise.all(plan.actualizar.map((m) =>
        supabase.from("match_sugerencias").update(fila(m))
          .eq("perfil_id", m.perfilA.id).eq("candidato_id", nuevo.id).in("estado", ["pendiente", "caducada"])
      ));
      const errorActualizar = actualizaciones.find((r) => r.error)?.error;
      if (errorActualizar) throw errorActualizar;

      // Una alerta por cliente y perfil nuevo (clave_unica): reactivar el perfil no la repite. La lee el Dashboard (T8.2).
      const { error: alertasError } = await supabase.from("alertas").upsert(
        detecciones.map((m) => ({
          perfil_id: m.perfilA.id,
          tipo: "nuevo_compatible",
          severidad: "info",
          mensaje: `Nuevo perfil muy compatible con ${m.perfilA.nombre_completo}: ${nuevo.nombre_completo} (${m.score} %)`,
          clave_unica: `compatible:${m.perfilA.id}:${nuevo.id}`,
        })),
        { onConflict: "clave_unica", ignoreDuplicates: true },
      );
      if (alertasError) throw alertasError;
      detectadas.push(...detecciones.map((m) => ({ cliente_id: m.perfilA.id, candidato_id: nuevo.id, score: m.score })));
    }

    // Solo lo leído: si un perfil se volvió a encolar mientras tanto, se queda para la siguiente vuelta.
    const ultimo = cola[cola.length - 1].encolado_at as string;
    const { error: borrarError } = await supabase.from("cola_matching").delete().in("perfil_id", ids).lte("encolado_at", ultimo);
    if (borrarError) throw borrarError;

    return json({ procesados: ids.length, detecciones: detectadas });
  } catch (e) {
    console.error("procesar-cola-matching error:", e instanceof Error ? e.message : e);
    return json({ error: e instanceof Error ? e.message : "Error desconocido" }, 500);
  }
});
