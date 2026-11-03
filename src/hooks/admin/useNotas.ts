import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export function useNotas(perfilId: string) {
  return useQuery({
    queryKey: ["notas", perfilId],
    queryFn: async () => {
      // Solo con leer_notas, que deja la lectura en auditoría (T14.3).
      const { data, error } = await supabase.rpc("leer_notas", { _perfil_id: perfilId });
      if (error) throw error;
      return data;
    },
  });
}

type ConCliente<T> = T & { perfil: { id: string; nombre_completo: string } | null };

/**
 * T9.1 · Buscador global de notas privadas y resúmenes de sesión de todos los clientes; sin texto, los más recientes.
 * buscar_notas (T14.3) busca en el servidor (50 de cada) y deja en auditoría cada cliente que sale.
 */
export function useBuscarNotas(texto: string) {
  return useQuery({
    queryKey: ["notas", "busqueda", texto],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("buscar_notas", { _texto: texto });
      if (error) throw error;
      return data as unknown as { notas: ConCliente<Tables<"notas_privadas">>[]; sesiones: ConCliente<Tables<"sesiones">>[] };
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
