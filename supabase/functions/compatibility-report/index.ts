import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json } from "../_shared/http.ts";
import { exigirAdmin } from "../_shared/auth.ts";
import { ErrorIA, pedirJSON } from "../_shared/ia.ts";

interface DiscResumen {
  primary_style: string;
  secondary_style: string;
  percent_d: number;
  percent_i: number;
  percent_s: number;
  percent_c: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = await exigirAdmin(req);
    if (admin instanceof Response) return admin;
    const { supabase } = admin;

    const { profile_id_1, profile_id_2 } = await req.json();
    if (!profile_id_1 || !profile_id_2) {
      return json({ error: "Two profile IDs required" }, 400);
    }

    // Fetch both profiles
    const { data: profiles, error: fetchError } = await supabase
      .from("perfiles")
      .select("*")
      .in("id", [profile_id_1, profile_id_2]);

    if (fetchError || !profiles || profiles.length !== 2) {
      return json({ error: "Could not fetch profiles" }, 404);
    }

    const p1 = profiles.find((p) => p.id === profile_id_1);
    const p2 = profiles.find((p) => p.id === profile_id_2);

    // Fetch DISC results for both profiles (match by email or name)
    const emails = [p1.email, p2.email].filter(Boolean);
    const names = [p1.nombre_completo, p2.nombre_completo];

    const { data: discResults } = await supabase
      .from("disc_results")
      .select("*")
      .or(
        [
          ...(emails.length ? [`email.in.(${emails.join(",")})`] : []),
          `name.in.(${names.join(",")})`,
        ].join(",")
      );

    const findDisc = (perfil: { email: string | null; nombre_completo: string }) =>
      discResults?.find(
        (d) => (perfil.email && d.email === perfil.email) || d.name === perfil.nombre_completo
      );

    const disc1 = findDisc(p1);
    const disc2 = findDisc(p2);

    const formatDisc = (d?: DiscResumen) => {
      if (!d) return "No ha completado el test DISC.";
      return `Perfil DISC: Principal=${d.primary_style} (${d.percent_d}% D, ${d.percent_i}% I, ${d.percent_s}% S, ${d.percent_c}% C), Secundario=${d.secondary_style}`;
    };

    const systemPrompt = `Eres un especialista en relaciones de pareja de la empresa Afín. Tu trabajo es analizar dos perfiles de personas y generar un informe de compatibilidad detallado y profesional.

INSTRUCCIONES:
1. Verifica FILTROS DUROS primero:
   - Si el tipo de relación buscado es incompatible, marca score bajo
   - Si la posición sobre hijos es contradictoria (uno quiere/tiene y otro no quiere), marca como fricción importante
   - Si el tabaco es un factor de fricción notable
   - Si las edades no están en el rango buscado por el otro

2. Compara ESCALAS NUMÉRICAS (1-5):
   - Calcula la diferencia absoluta en cada escala
   - Una diferencia <=1 es muy compatible, 2 es compatible, 3+ es fricción

3. Analiza PERFIL EMOCIONAL:
   - Compara estilos de conflicto y necesidades de amor
   - Identifica complementariedades y posibles fricciones

4. Analiza RESPUESTAS ABIERTAS:
   - Busca coherencia en proyecto de vida
   - Identifica afinidad emocional y valores compartidos

5. Analiza PERFIL DISC (si disponible):
   - D (Dominancia): Directo, decidido, orientado a resultados
   - I (Influencia): Sociable, entusiasta, motivador
   - S (Estabilidad): Paciente, estable, confiable
   - C (Cumplimiento): Analítico, detallista, cuidadoso
   - Combinaciones complementarias: D+S, I+C suelen complementarse bien
   - Combinaciones similares: D+D pueden generar conflictos de poder, S+S pueden estancarse
   - Analiza cómo interactúan los estilos primarios y secundarios de cada perfil

Debes responder EXCLUSIVAMENTE con un JSON válido (sin markdown, sin backticks) con esta estructura exacta:
{
  "score": <número 0-100>,
  "nivel": "<Bajo|Medio|Alto|Muy Alto>",
  "resumen": "<1-2 frases resumen>",
  "fortalezas": ["<fortaleza 1>", "<fortaleza 2>", ...],
  "fricciones": ["<fricción 1>", "<fricción 2>", ...],
  "preguntas_sugeridas": ["<pregunta 1>", "<pregunta 2>", "<pregunta 3>"],
  "analisis_detallado": "<párrafo de 3-5 frases con análisis narrativo incluyendo dinámica DISC>"
}`;

    const userPrompt = `PERFIL A - ${p1.nombre_completo}:
- Edad: ${p1.edad}, Ciudad: ${p1.ciudad}
- Busca: ${p1.tipo_relacion}, Rango edad: ${p1.edad_min_busca}-${p1.edad_max_busca}
- Hijos: ${p1.hijos}, Tabaco: ${p1.tabaco}
- Escalas: Familia=${p1.deseo_familia}, Ambición=${p1.ambicion_profesional}, Social=${p1.nivel_social}, Activo=${p1.estilo_vida_activo}, Independencia=${p1.necesidad_independencia}
- En conflicto: ${(p1.conflicto || []).join(", ")}
- Se siente querido/a con: ${(p1.sentirse_querido || []).join(", ")}
- ${formatDisc(disc1)}
- Relación sana: ${p1.relacion_sana}
- Última relación: ${p1.aprendizaje_ultima_relacion}
- Vida en 10 años: ${p1.vida_en_10_anios}
${p1.fin_de_semana ? `- Fin de semana: ${p1.fin_de_semana}` : ""}
${p1.hobbies ? `- Hobbies: ${p1.hobbies}` : ""}

PERFIL B - ${p2.nombre_completo}:
- Edad: ${p2.edad}, Ciudad: ${p2.ciudad}
- Busca: ${p2.tipo_relacion}, Rango edad: ${p2.edad_min_busca}-${p2.edad_max_busca}
- Hijos: ${p2.hijos}, Tabaco: ${p2.tabaco}
- Escalas: Familia=${p2.deseo_familia}, Ambición=${p2.ambicion_profesional}, Social=${p2.nivel_social}, Activo=${p2.estilo_vida_activo}, Independencia=${p2.necesidad_independencia}
- En conflicto: ${(p2.conflicto || []).join(", ")}
- Se siente querido/a con: ${(p2.sentirse_querido || []).join(", ")}
- ${formatDisc(disc2)}
- Relación sana: ${p2.relacion_sana}
- Última relación: ${p2.aprendizaje_ultima_relacion}
- Vida en 10 años: ${p2.vida_en_10_anios}
${p2.fin_de_semana ? `- Fin de semana: ${p2.fin_de_semana}` : ""}
${p2.hobbies ? `- Hobbies: ${p2.hobbies}` : ""}

Genera el informe de compatibilidad.`;

    const report = await pedirJSON(systemPrompt, userPrompt);

    return json({
      report,
      profiles: {
        a: { id: p1.id, nombre: p1.nombre_completo, edad: p1.edad, ciudad: p1.ciudad, disc: disc1 ? { primary: disc1.primary_style, secondary: disc1.secondary_style, percent_d: disc1.percent_d, percent_i: disc1.percent_i, percent_s: disc1.percent_s, percent_c: disc1.percent_c } : null },
        b: { id: p2.id, nombre: p2.nombre_completo, edad: p2.edad, ciudad: p2.ciudad, disc: disc2 ? { primary: disc2.primary_style, secondary: disc2.secondary_style, percent_d: disc2.percent_d, percent_i: disc2.percent_i, percent_s: disc2.percent_s, percent_c: disc2.percent_c } : null },
      },
    });
  } catch (e) {
    if (e instanceof ErrorIA) return json({ error: e.message }, e.status);
    console.error("compatibility error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
