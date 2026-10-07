import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { TareaTipo } from "@/types/admin";
import { ordenarTareas } from "@/lib/tareas";

export interface FiltrosTareas {
  perfilId?: string;
  estado?: "pendiente" | "completada" | "cancelada";
  tipo?: TareaTipo;
}

// Una consulta para la pestaña de la ficha (perfilId) y el panel global; el vencimiento se filtra en la pantalla.
export function useTareas(filtros: FiltrosTareas = {}) {
  return useQuery({
    queryKey: ["tareas", filtros],
    queryFn: async () => {
      let q = supabase.from("tareas").select("*, perfil:perfiles!tareas_perfil_id_fkey(id, nombre_completo)");
      if (filtros.perfilId) q = q.eq("perfil_id", filtros.perfilId);
      if (filtros.estado) q = q.eq("estado", filtros.estado);
      if (filtros.tipo) q = q.eq("tipo", filtros.tipo);
      // ponytail: tope de 1.000 filas de PostgREST; paginar cuando haya tantas tareas abiertas a la vez.
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return ordenarTareas(data);
    },
  });
}
export type TareaConPerfil = NonNullable<ReturnType<typeof useTareas>["data"]>[number];

// Las tareas mueven el contador de v_clientes (cuelga de ["perfiles"]).
function useInvalidarTareas() {
  const queryClient = useQueryClient();
  return () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["tareas"] }),
    queryClient.invalidateQueries({ queryKey: ["perfiles"] }),
  ]);
}

export function useCrearTarea() {
  const invalidar = useInvalidarTareas();
  return useMutation({
    mutationFn: async (tarea: TablesInsert<"tareas">) => {
      const { error } = await supabase.from("tareas").insert({ ...tarea, origen: "manual" });
      if (error) throw error;
    },
    onSuccess: invalidar,
  });
}

/** Completar, cancelar o reabrir (completada_at lo sella un trigger). */
export function useActualizarTarea() {
  const invalidar = useInvalidarTareas();
  return useMutation({
    mutationFn: async ({ id, cambios }: { id: string; cambios: TablesUpdate<"tareas"> }) => {
      const { error } = await supabase.from("tareas").update(cambios).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidar,
  });
}
