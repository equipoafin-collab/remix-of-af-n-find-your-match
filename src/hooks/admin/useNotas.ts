import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { filtroBusqueda } from "@/lib/busqueda";
import { SECCIONES_RESUMEN } from "../../../supabase/functions/_shared/resumen";
import { registrarLectura } from "./useRgpd";

export function useNotas(perfilId: string) {
  return useQuery({
    queryKey: ["notas", perfilId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notas_privadas").select("*").eq("perfil_id", perfilId).order("created_at", { ascending: false });
      if (error) throw error;
      registrarLectura("leer_notas", [perfilId]); // T9.3
      return data;
    },
  });
}

const MAX_RESULTADOS = 50;
// Cada sección del resumen como texto (`->>` también da las listas, como texto JSON).
const CAMPOS_SESION = ["notas_brutas", "resumen_ia->>estado_emocional", ...SECCIONES_RESUMEN.map(({ clave }) => `resumen_ia->>${clave}`)];

/** T9.1 · Buscador global de notas privadas y resúmenes de sesión de todos los clientes; sin texto, los más recientes. */
export function useBuscarNotas(texto: string) {
  return useQuery({
    queryKey: ["notas", "busqueda", texto],
    queryFn: async () => {
      let notas = supabase.from("notas_privadas").select("*, perfil:perfiles!notas_privadas_perfil_id_fkey(id, nombre_completo)");
      let sesiones = supabase.from("sesiones").select("*, perfil:perfiles!sesiones_perfil_id_fkey(id, nombre_completo)");
      const enNotas = filtroBusqueda(texto, ["contenido"]);
      const enSesiones = filtroBusqueda(texto, CAMPOS_SESION);
      if (enNotas) notas = notas.or(enNotas);
      sesiones = enSesiones ? sesiones.or(enSesiones) : sesiones.not("resumen_ia", "is", null);
      const [n, s] = await Promise.all([
        notas.order("created_at", { ascending: false }).limit(MAX_RESULTADOS),
        sesiones.order("fecha_hora", { ascending: false }).limit(MAX_RESULTADOS),
      ]);
      if (n.error) throw n.error;
      if (s.error) throw s.error;
      // T9.3: queda constancia de cada cliente cuyas notas o resúmenes aparecen en el resultado.
      registrarLectura("leer_notas", n.data.map((x) => x.perfil_id));
      registrarLectura("leer_sesiones", s.data.map((x) => x.perfil_id));
      return { notas: n.data, sesiones: s.data };
    },
  });
}

// Crear una nota actualiza ultimo_seguimiento_at del perfil (trigger): se refrescan ambos.
function useInvalidarNotas() {
  const queryClient = useQueryClient();
  return () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["notas"] }),
    queryClient.invalidateQueries({ queryKey: ["perfiles"] }),
    queryClient.invalidateQueries({ queryKey: ["alertas"] }),
    queryClient.invalidateQueries({ queryKey: ["tareas"] }),
  ]);
}

export function useCrearNota() {
  const invalidar = useInvalidarNotas();
  return useMutation({
    mutationFn: async (nota: TablesInsert<"notas_privadas">) => {
      const { error } = await supabase.from("notas_privadas").insert(nota);
      if (error) throw error;
    },
    onSuccess: invalidar,
  });
}

export function useActualizarNota() {
  const invalidar = useInvalidarNotas();
  return useMutation({
    mutationFn: async ({ id, cambios }: { id: string; cambios: TablesUpdate<"notas_privadas"> }) => {
      const { error } = await supabase.from("notas_privadas").update(cambios).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidar,
  });
}

export function useBorrarNota() {
  const invalidar = useInvalidarNotas();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notas_privadas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidar,
  });
}
