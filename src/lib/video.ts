// Mismos límites que el bucket videos-sesiones (T0.2): mp4/mov hasta 500 MB.
export const VIDEO_MAX_MB = 500;
const EXTENSION: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov" };

/** Extensión con la que se guarda el vídeo, o el motivo por el que no se puede subir. */
export function validarVideo(file: { type: string; size: number }): { ext: string } | { error: string } {
  const ext = EXTENSION[file.type];
  if (!ext) return { error: "Formato no admitido: sube un vídeo .mp4 o .mov." };
  if (file.size > VIDEO_MAX_MB * 1024 * 1024) return { error: `El vídeo supera los ${VIDEO_MAX_MB} MB.` };
  return { ext };
}

/** videos-sesiones/<perfil_id>/presentacion.<ext> */
export const rutaVideoPresentacion = (perfilId: string, ext: string) => `${perfilId}/presentacion.${ext}`;
