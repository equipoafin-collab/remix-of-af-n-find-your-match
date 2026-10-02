import { supabase } from "@/integrations/supabase/client";

export const SIGNED_URL_TTL_SECONDS = 60 * 60;

/** URL temporal para leer un fichero de un bucket privado (requiere sesión admin). */
export async function getSignedUrl(bucket: string, path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}

/** Storage solo acepta claves ASCII: quita tildes y cambia símbolos por "_". */
export const claveSegura = (texto: string) =>
  texto.trim().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.@-]+/g, "_");

/**
 * ¿Es de este perfil la carpeta de antecedentes? /perfil/documentos sube a
 * `user_<claveSegura(email o nombre)>/` con lo que escriba la persona, así que se compara sin mayúsculas.
 */
export function esCarpetaDelPerfil(carpeta: string, perfil: { email: string | null; nombre_completo: string }) {
  return [perfil.email, perfil.nombre_completo]
    .filter((v): v is string => !!v?.trim())
    .some((v) => `user_${claveSegura(v)}`.toLowerCase() === carpeta.toLowerCase());
}

/**
 * Sube (o reemplaza) un fichero a Storage informando del progreso (0-1).
 * supabase-js no da progreso, así que se usa la API REST con XMLHttpRequest y la sesión actual.
 */
export async function subirConProgreso(bucket: string, path: string, file: File, onProgreso: (fraccion: number) => void) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("La sesión ha caducado: vuelve a entrar.");

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/${bucket}/${path}`);
    xhr.setRequestHeader("authorization", `Bearer ${session.access_token}`);
    xhr.setRequestHeader("apikey", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
    xhr.setRequestHeader("content-type", file.type);
    xhr.setRequestHeader("cache-control", "max-age=3600");
    xhr.setRequestHeader("x-upsert", "true");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgreso(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let mensaje = `Error ${xhr.status} al subir el fichero`;
      try {
        mensaje = JSON.parse(xhr.responseText).message ?? mensaje;
      } catch {
        // respuesta sin JSON: se queda el mensaje genérico
      }
      // 413: supera el límite de subida del proyecto, que puede ser menor que el del bucket.
      reject(new Error(xhr.status === 413 ? `${mensaje}. Supera el tamaño máximo de subida del proyecto.` : mensaje));
    };
    xhr.onerror = () => reject(new Error("Fallo de red al subir el fichero"));
    xhr.send(file);
  });
}
