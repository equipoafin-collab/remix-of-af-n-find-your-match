import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { construirExportacion, nombreExportacion } from "@/lib/rgpd";
import { listarDocumentos } from "./useDocumentos";
import type { Perfil } from "@/types/admin";

type Lectura = "leer_notas" | "leer_sesiones" | "ver_video";
const REPETIR_TRAS_MS = 30 * 60_000;
const registradas = new Map<string, number>();

/**
 * T9.3 · Deja en auditoria que se han leído las notas, las sesiones (con sus resúmenes) o el vídeo de estos clientes:
 * una vez cada 30 min por cliente y tipo, para no llenar el registro con cada recarga. No bloquea la lectura.
 * ponytail: lo registra el navegador, así que una lectura directa por la API no queda; para garantizarlo,
 * servir estos datos con funciones SECURITY DEFINER que registren.
 */
export function registrarLectura(accion: Lectura, perfilIds: string[]) {
  const ahora = Date.now();
  const nuevos = [...new Set(perfilIds)].filter((id) => ahora - (registradas.get(`${accion}:${id}`) ?? 0) > REPETIR_TRAS_MS);
  if (!nuevos.length) return;
  nuevos.forEach((id) => registradas.set(`${accion}:${id}`, ahora));
  supabase.rpc("registrar_lecturas", { _accion: accion, _perfil_ids: nuevos }).then(({ error }) => {
    if (!error) return;
    nuevos.forEach((id) => registradas.delete(`${accion}:${id}`));
    console.warn("No se pudo registrar la lectura en auditoría:", error.message);
  });
}

interface Archivo { bucket: string; ruta: string }

/** Foto, vídeos y antecedentes del cliente en Storage. */
async function archivosDelCliente(perfil: Pick<Perfil, "id" | "email" | "nombre_completo" | "foto_url">): Promise<Archivo[]> {
  const { data: videos, error } = await supabase.storage.from("videos-sesiones").list(perfil.id);
  if (error) throw error;
  const documentos = await listarDocumentos(perfil);
  return [
    ...(perfil.foto_url ? [{ bucket: "fotos-perfil", ruta: perfil.foto_url }] : []),
    ...videos.filter((f) => !f.name.startsWith(".")).map((f) => ({ bucket: "videos-sesiones", ruta: `${perfil.id}/${f.name}` })),
    ...documentos.map((d) => ({ bucket: "antecedentes", ruta: d.path })),
  ];
}

/**
 * Los antecedentes se reconocen por la carpeta (email o nombre): si otro perfil se llama igual, al borrar
 * solo cuentan los de su email, para no llevarse los de la otra persona.
 */
async function archivosParaBorrar(perfil: Perfil): Promise<Archivo[]> {
  const { count, error } = await supabase
    .from("perfiles").select("id", { count: "exact", head: true })
    .ilike("nombre_completo", perfil.nombre_completo).neq("id", perfil.id);
  if (error) throw error;
  return archivosDelCliente(count ? { ...perfil, nombre_completo: "" } : perfil);
}

const descargar = (contenido: string, nombre: string) => {
  const url = URL.createObjectURL(new Blob([contenido], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: nombre });
  a.click();
  URL.revokeObjectURL(url);
};

/** El test DISC vinculado y los hechos con el mismo email (como borra suprimir_cliente). */
async function testsDisc(perfil: Perfil) {
  // ilike sin comodines: % y _ escapados para que sea una comparación exacta sin distinguir mayúsculas.
  const email = perfil.email?.trim().replace(/[\\%_]/g, "\\$&");
  const [porId, porEmail] = await Promise.all([
    perfil.disc_result_id ? supabase.from("disc_results").select("*").eq("id", perfil.disc_result_id) : null,
    email ? supabase.from("disc_results").select("*").ilike("email", email) : null,
  ]);
  for (const r of [porId, porEmail]) if (r?.error) throw r.error;
  const todos = [...(porId?.data ?? []), ...(porEmail?.data ?? [])];
  return todos.filter((d, i) => todos.findIndex((x) => x.id === d.id) === i);
}

/** T9.3 · Descarga en JSON todo lo del cliente (acceso y portabilidad) y lo deja en auditoría. */
export function useExportarCliente() {
  return useMutation({
    mutationFn: async (perfil: Perfil) => {
      const id = perfil.id;
      const [p, pagos, sesiones, notas, aprendizaje, sugerencias, matches] = await Promise.all([
        supabase.from("perfiles").select("*").eq("id", id).single(),
        supabase.from("pagos").select("*").eq("perfil_id", id),
        supabase.from("sesiones").select("*").eq("perfil_id", id).order("fecha_hora"),
        supabase.from("notas_privadas").select("*").eq("perfil_id", id).order("created_at"),
        supabase.from("perfil_aprendizaje").select("*").eq("perfil_id", id).maybeSingle(),
        supabase.from("match_sugerencias").select("*").or(`perfil_id.eq.${id},candidato_id.eq.${id}`),
        supabase.from("matches").select("*").or(`perfil_a.eq.${id},perfil_b.eq.${id}`),
      ]);
      for (const r of [p, pagos, sesiones, notas, aprendizaje, sugerencias, matches]) if (r.error) throw r.error;
      const exportacion = construirExportacion({
        perfil: p.data!,
        disc: await testsDisc(perfil),
        pagos: pagos.data ?? [],
        sesiones: sesiones.data ?? [],
        notas: notas.data ?? [],
        aprendizaje: aprendizaje.data,
        sugerencias: sugerencias.data ?? [],
        matches: matches.data ?? [],
        archivos: await archivosDelCliente(perfil),
      });
      descargar(JSON.stringify(exportacion, null, 2), nombreExportacion(perfil.nombre_completo));
      const { error } = await supabase.rpc("registrar_auditoria", { _accion: "exportar_datos", _entidad: "perfiles", _entidad_id: id });
      if (error) console.warn("No se pudo registrar la exportación en auditoría:", error.message);
    },
  });
}

/** Lo que se borrará de Storage, para enseñarlo antes de confirmar. */
export function useArchivosParaBorrar(perfil: Perfil, activo: boolean) {
  return useQuery({ queryKey: ["rgpd-archivos", perfil.id], queryFn: () => archivosParaBorrar(perfil), enabled: activo });
}

export interface ResultadoSupresion { sesiones: number; notas: number; matches: number; pagos_conservados: number; tests_disc: number; archivos: number }

/**
 * T9.3 · Derecho de supresión: primero los ficheros de Storage (si falla alguno, se para antes de tocar la base de
 * datos) y después suprimir_cliente, que borra el perfil y lo suyo en una transacción y deja constancia en auditoría.
 */
export function useSuprimirCliente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (perfil: Perfil): Promise<ResultadoSupresion> => {
      const archivos = await archivosParaBorrar(perfil);
      for (const bucket of new Set(archivos.map((a) => a.bucket))) {
        const rutas = archivos.filter((a) => a.bucket === bucket).map((a) => a.ruta);
        const { data, error } = await supabase.storage.from(bucket).remove(rutas);
        // Sin permiso, Storage no da error: simplemente no borra. Por eso se cuentan.
        if (error || data.length < rutas.length) {
          throw new Error(`No se pudieron borrar los ficheros de ${bucket}${error ? `: ${error.message}` : ""}. La base de datos no se ha tocado.`);
        }
      }
      const { data, error } = await supabase.rpc("suprimir_cliente", { _perfil_id: perfil.id });
      if (error) throw error;
      return { ...(data as unknown as Omit<ResultadoSupresion, "archivos">), archivos: archivos.length };
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
