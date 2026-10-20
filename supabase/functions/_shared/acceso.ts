// T15.1 · Reglas del acceso del cliente a su área, compartidas por la Edge Function acceso-cliente y la página
// /mi-area/acceso. Sin dependencias de Deno: también las importa el navegador y los tests.

/** Token de accesos_cliente: dos uuid sin guiones (como enlaces_subida, T13.3). */
export const TOKEN_ACCESO = /^[0-9a-f]{64}$/;

/** Error de la contraseña elegida, o null si vale. Auth (bcrypt) no admite más de 72 bytes. */
export function errorContrasena(contrasena: string): string | null {
  if (contrasena.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (new TextEncoder().encode(contrasena).length > 72) return "La contraseña es demasiado larga.";
  return null;
}

export const primerNombre = (nombreCompleto: string | null) => (nombreCompleto ?? "").trim().split(/\s+/)[0] ?? "";

/** Lo que hay en Auth con el email del perfil. */
export interface CuentaExistente {
  id: string;
  esAdmin: boolean;
  /** Otro perfil ya enlazado a esta cuenta. */
  otroPerfil: boolean;
}

export type PasoCuenta =
  | { paso: "actualizar"; userId: string } // ya tenía cuenta (o es la suya sin enlazar): nueva contraseña
  | { paso: "crear" }
  | { paso: "error"; mensaje: string };

/**
 * Qué hacer con la cuenta al activar el enlace. El registro público está desactivado (Auth → disable_signup), así
 * que una cuenta suelta con su email solo pudo crearla Afín: es de la misma persona y se enlaza. Nunca se toca la
 * de una administradora ni la que ya usa otro perfil.
 */
export function pasoCuenta(userIdDelPerfil: string | null, existente: CuentaExistente | null): PasoCuenta {
  if (userIdDelPerfil) return { paso: "actualizar", userId: userIdDelPerfil };
  if (!existente) return { paso: "crear" };
  if (existente.esAdmin || existente.otroPerfil) {
    return { paso: "error", mensaje: "Ese email ya se usa en otra cuenta de Afín. Habla con tu psicóloga." };
  }
  return { paso: "actualizar", userId: existente.id };
}

// T16.2 · Fotos que sube el cliente desde su área: en fotos-perfil/clientes/<perfil_id>/, solo imágenes.
const EXTENSIONES_FOTO: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export const extensionFoto = (tipo: unknown) => (typeof tipo === "string" ? EXTENSIONES_FOTO[tipo] ?? null : null);

export const carpetaFotosCliente = (perfilId: string) => `clientes/${perfilId}/`;

/** ¿Es una foto subida a su carpeta (un solo nivel, sin "..")? Así nunca apunta a la foto de otra persona. */
export const esFotoDelCliente = (ruta: unknown, perfilId: string): ruta is string =>
  typeof ruta === "string" && /^[\w-]+\.(jpg|png|webp)$/.test(ruta.slice(carpetaFotosCliente(perfilId).length)) &&
  ruta.startsWith(carpetaFotosCliente(perfilId));
