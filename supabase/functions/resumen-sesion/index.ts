import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json } from "../_shared/http.ts";
import { exigirAdmin } from "../_shared/auth.ts";
import { ErrorIA, pedirJSON } from "../_shared/ia.ts";
import { validarResumen } from "../_shared/resumen.ts";

// T3.2 · Borrador del resumen de una sesión a partir de las notas (o transcripción) de la psicóloga.
// Datos de salud: no se registra en logs nada del contenido.

const SYSTEM_PROMPT = `Eres la asistente de una psicóloga de Afín, un servicio de matchmaking profesional. Recibes las notas (o la transcripción) que ella ha tomado en una sesión con un cliente y redactas un borrador de resumen que ella revisará antes de guardarlo.

REGLAS:
- Escribe en español, con frases breves, en tercera persona ("el cliente", "ella", "él").
- Usa solo lo que aparece en las notas. No inventes ni diagnostiques. Si algo no aparece, deja la lista vacía.
- Si hay resúmenes de sesiones anteriores, úsalos para señalar la evolución (en "avances" y "estado_emocional").
- "preferencias_detectadas" son preferencias sobre la pareja o la relación que ayuden al matching (qué busca, qué evita). Vacía si no hay.

Responde EXCLUSIVAMENTE con un JSON válido (sin markdown, sin backticks) con esta estructura:
{
  "estado_emocional": "<1-2 frases>",
  "temas_tratados": ["<tema>", ...],
  "avances": ["<avance respecto a sesiones anteriores o durante la sesión>", ...],
  "objetivos": ["<objetivo del cliente>", ...],
  "proximos_pasos": ["<acción acordada o recomendada>", ...],
  "preferencias_detectadas": ["<preferencia>", ...]
}`;

const lineas = (titulo: string, valores: string[] | null | undefined) =>
  valores?.length ? `${titulo}: ${valores.join("; ")}` : "";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = await exigirAdmin(req);
    if (admin instanceof Response) return admin;
    const { supabase, userId } = admin;

    const { sesion_id } = await req.json();
    if (!sesion_id) return json({ error: "Falta sesion_id" }, 400);

    const { data: sesion } = await supabase
      .from("sesiones").select("id, perfil_id, fecha_hora, tipo, notas_brutas").eq("id", sesion_id).maybeSingle();
    if (!sesion) return json({ error: "No existe la sesión" }, 404);
    if (!sesion.notas_brutas?.trim()) {
      return json({ error: "La sesión no tiene notas: pega tus notas o la transcripción antes de generar el resumen." }, 400);
    }

    const { data: perfil } = await supabase
      .from("perfiles")
      .select("nombre_completo, edad, genero, busca_genero, tipo_relacion, hijos, edad_min_busca, edad_max_busca, zona, ciudad, valores_importantes")
      .eq("id", sesion.perfil_id).single();

    // Los 3 últimos resúmenes revisados, para medir la evolución.
    const { data: previos } = await supabase
      .from("sesiones")
      .select("fecha_hora, resumen_ia")
      .eq("perfil_id", sesion.perfil_id).eq("resumen_estado", "revisado").neq("id", sesion.id)
      .order("fecha_hora", { ascending: false }).limit(3);

    const historial = (previos ?? [])
      .map((p) => `- ${p.fecha_hora.slice(0, 10)}: ${JSON.stringify(p.resumen_ia)}`)
      .join("\n");

    const userPrompt = [
      `CLIENTE: ${perfil?.nombre_completo}, ${perfil?.edad} años, ${perfil?.genero ?? ""}, busca ${perfil?.busca_genero ?? "—"}.`,
      `Busca: ${perfil?.tipo_relacion}. Hijos: ${perfil?.hijos}. Rango de edad: ${perfil?.edad_min_busca ?? "?"}-${perfil?.edad_max_busca ?? "?"}. Zona: ${perfil?.zona ?? perfil?.ciudad}.`,
      lineas("Valores importantes", perfil?.valores_importantes),
      "",
      `SESIÓN DEL ${sesion.fecha_hora.slice(0, 10)} (${sesion.tipo === "primera" ? "primera sesión" : "seguimiento"}).`,
      historial ? `RESÚMENES REVISADOS ANTERIORES (más reciente primero):\n${historial}` : "Es la primera sesión con resumen.",
      "",
      `NOTAS DE LA PSICÓLOGA:\n${sesion.notas_brutas}`,
    ].filter((l) => l !== "").join("\n");

    const resumen = validarResumen(await pedirJSON(SYSTEM_PROMPT, userPrompt));
    if (!resumen) return json({ error: "La IA devolvió un resumen incompleto. Prueba a regenerarlo." }, 502);

    const { error: updateError } = await supabase
      .from("sesiones").update({ resumen_ia: resumen, resumen_estado: "borrador" }).eq("id", sesion.id);
    if (updateError) throw updateError;

    // Notas de salud enviadas al proveedor de IA: queda constancia (RGPD).
    await supabase.from("auditoria").insert({ user_id: userId, accion: "generar_resumen_ia", entidad: "sesiones", entidad_id: sesion.id });

    return json({ resumen });
  } catch (e) {
    if (e instanceof ErrorIA) return json({ error: e.message }, e.status);
    console.error("resumen-sesion error:", e instanceof Error ? e.message : e);
    return json({ error: e instanceof Error ? e.message : "Error desconocido" }, 500);
  }
});
