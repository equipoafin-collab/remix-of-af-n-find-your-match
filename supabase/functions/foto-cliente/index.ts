import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/http.ts";
import { carpetaFotosCliente, esFotoDelCliente, extensionFoto } from "../_shared/acceso.ts";

// T16.2 · El cliente cambia su foto desde su área (con su sesión y el área abierta). `subir` da una URL firmada a
// fotos-perfil/clientes/<perfil_id>/<fecha>.<ext>; `confirmar` la pone en su perfil, borra la anterior (también la
// del cuestionario) y las subidas sin confirmar, y avisa a la psicóloga. Así no quedan copias sueltas de sus fotos.
// El bucket ya limita a imágenes de 5 MB (T0.2).

const BUCKET = "fotos-perfil";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: errorClaims } = await anon.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (errorClaims || !claims?.claims) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: perfil, error: errorPerfil } = await supabase
      .from("perfiles").select("id, foto_url").eq("user_id", claims.claims.sub as string).maybeSingle();
    if (errorPerfil) throw errorPerfil;
    if (!perfil) return json({ error: "Esta cuenta no tiene área de cliente." }, 403);
    const { data: conArea, error: errorArea } = await supabase.rpc("perfil_tiene_area", { _perfil_id: perfil.id });
    if (errorArea) throw errorArea;
    if (!conArea) return json({ error: "Tu área no está activa." }, 403);

    const { accion, tipo, ruta } = await req.json();
    const carpeta = carpetaFotosCliente(perfil.id);

    if (accion === "subir") {
      const extension = extensionFoto(tipo);
      if (!extension) return json({ error: "Sube una foto en JPG, PNG o WebP." }, 400);
      const nueva = `${carpeta}${Date.now()}.${extension}`;
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(nueva);
      if (error) throw error;
      return json({ ruta: nueva, token: data.token });
    }

    if (accion === "confirmar") {
      if (!esFotoDelCliente(ruta, perfil.id)) return json({ error: "Foto no válida." }, 400);
      const { data: ficheros, error: errorLista } = await supabase.storage.from(BUCKET).list(carpeta.slice(0, -1));
      if (errorLista) throw errorLista;
      if (!ficheros.some((f) => `${carpeta}${f.name}` === ruta)) return json({ error: "No encontramos la foto. Vuelve a subirla." }, 404);

      const { error: errorFoto } = await supabase.from("perfiles").update({ foto_url: ruta }).eq("id", perfil.id);
      if (errorFoto) throw errorFoto;

      // La anterior (sea del cuestionario o de aquí) y las subidas que no se confirmaron.
      const sobrantes = [
        ...ficheros.map((f) => `${carpeta}${f.name}`).filter((r) => r !== ruta),
        ...(perfil.foto_url && perfil.foto_url !== ruta && !perfil.foto_url.startsWith(carpeta) ? [perfil.foto_url] : []),
      ];
      if (sobrantes.length) {
        const { error } = await supabase.storage.from(BUCKET).remove(sobrantes);
        if (error) console.error("foto-cliente: no se pudieron borrar las fotos anteriores:", error.message);
      }

      const { error: errorAviso } = await supabase.rpc("perfil_cambiado_por_cliente", { _perfil_id: perfil.id, _que: "foto", _matching: false });
      if (errorAviso) throw errorAviso;
      await supabase.from("auditoria").insert({
        user_id: claims.claims.sub, accion: "cliente_cambia_perfil", entidad: "perfiles", entidad_id: perfil.id, detalle: { campos: ["foto"] },
      });
      return json({ foto_url: ruta });
    }

    return json({ error: "Acción no válida" }, 400);
  } catch (e) {
    console.error("foto-cliente error:", e instanceof Error ? e.message : e);
    return json({ error: "No se pudo cambiar tu foto. Inténtalo de nuevo en unos minutos." }, 500);
  }
});
