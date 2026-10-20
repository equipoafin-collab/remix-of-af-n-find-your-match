import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/http.ts";

// T13.3 · Subida de documentos con el enlace personal (pública: el cliente no tiene cuenta). Valida el token de
// enlaces_subida y da una URL firmada para subir un PDF a antecedentes/<perfil_id>/. Al cliente solo le devuelve
// su nombre de pila, para saludarle.

const TOKEN = /^[0-9a-f]{64}$/;
const NO_VALIDO = "El enlace no es válido o ha caducado. Pide uno nuevo escribiendo a equipo.afin@gmail.com.";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token, accion } = await req.json();
    if (typeof token !== "string" || !TOKEN.test(token)) return json({ error: NO_VALIDO }, 404);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await supabase
      .from("enlaces_subida").select("perfil_id, caduca_at, perfil:perfiles(nombre_completo)").eq("token", token).maybeSingle();
    if (error) throw error;
    const enlace = data as unknown as { perfil_id: string; caduca_at: string; perfil: { nombre_completo: string } | null } | null;
    if (!enlace || new Date(enlace.caduca_at) <= new Date()) return json({ error: NO_VALIDO }, 404);

    if (accion === "info") {
      return json({ nombre: (enlace.perfil?.nombre_completo ?? "").trim().split(/\s+/)[0] ?? "", caduca_at: enlace.caduca_at });
    }

    if (accion === "subir") {
      const ruta = `${enlace.perfil_id}/${Date.now()}.pdf`;
      const { data: firmada, error: errorFirma } = await supabase.storage.from("antecedentes").createSignedUploadUrl(ruta);
      if (errorFirma) throw errorFirma;
      await supabase.from("auditoria").insert({ user_id: null, accion: "subida_documento", entidad: "perfiles", entidad_id: enlace.perfil_id });
      return json({ ruta, token: firmada.token });
    }

    return json({ error: "Acción no válida" }, 400);
  } catch (e) {
    console.error("subir-documento error:", e instanceof Error ? e.message : e);
    return json({ error: "No se pudo preparar la subida. Inténtalo de nuevo." }, 500);
  }
});
