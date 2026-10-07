import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import type { Cliente, EstadoCliente } from "@/types/admin";

// ["perfiles"] es el prefijo común: invalidarlo refresca listado y fichas.
export function usePerfiles() {
  return useQuery({
    queryKey: ["perfiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("perfiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// Lee de v_clientes para tener también los contadores de sesiones y la próxima cita.
export function usePerfil(id: string | undefined) {
  return useQuery({
    queryKey: ["perfiles", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("v_clientes").select("*").eq("id", id as string).maybeSingle();
      if (error) throw error;
      return data as Cliente | null;
    },
    enabled: !!id,
  });
}

export function useUpdatePerfil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, cambios }: { id: string; cambios: TablesUpdate<"perfiles"> }) => {
      const { error } = await supabase.from("perfiles").update(cambios).eq("id", id);
      if (error) throw error;
    },
    // Plan, sesiones contratadas y fechas reevalúan alertas y tareas del cliente (T7.4).
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ["perfiles"] }),
      queryClient.invalidateQueries({ queryKey: ["alertas"] }),
      queryClient.invalidateQueries({ queryKey: ["tareas"] }),
    ]),
  });
}

// El estado no se cambia con un update directo: la función SQL aplica las reglas
// de Baja/Pausado/Finalizado y lo deja en auditoría.
export function useCambiarEstado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ perfilId, estado, motivo }: { perfilId: string; estado: EstadoCliente; motivo: string }) => {
      const { error } = await supabase.rpc("cambiar_estado_cliente", {
        _perfil_id: perfilId,
        _nuevo_estado: estado,
        _motivo: motivo,
      });
      if (error) throw error;
    },
    // La función deja también una nota automática.
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ["perfiles"] }),
      queryClient.invalidateQueries({ queryKey: ["notas"] }),
      queryClient.invalidateQueries({ queryKey: ["alertas"] }),
      queryClient.invalidateQueries({ queryKey: ["tareas"] }),
    ]),
  });
}
