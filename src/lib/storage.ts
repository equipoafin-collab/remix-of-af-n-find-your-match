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
