import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export function useSesiones(perfilId: string) {
  return useQuery({
    queryKey: ["sesiones", perfilId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sesiones").select("*").eq("perfil_id", perfilId).order("fecha_hora", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// uq_sesiones_una_primera: solo una primera sesión no cancelada por cliente.
const errorSesion = (error: PostgrestError) =>
  error.code === "23505" ? new Error("Este cliente ya tiene una primera sesión. Cancélala para programar otra.") : error;

// Las sesiones mueven los contadores de v_clientes y el seguimiento del perfil, y reevalúan alertas y tareas (T7.4).
function useInvalidarSesiones() {
  const queryClient = useQueryClient();
  return () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["sesiones"] }),
    queryClient.invalidateQueries({ queryKey: ["perfiles"] }),
    queryClient.invalidateQueries({ queryKey: ["alertas"] }),
    queryClient.invalidateQueries({ queryKey: ["tareas"] }),
  ]);
}

export function useCrearSesion() {
  const invalidar = useInvalidarSesiones();
  return useMutation({
    mutationFn: async (sesion: TablesInsert<"sesiones">) => {
      const { error } = await supabase.from("sesiones").insert(sesion);
      if (error) throw errorSesion(error);
    },
    onSuccess: invalidar,
  });
}

export function useActualizarSesion() {
  const invalidar = useInvalidarSesiones();
  return useMutation({
    mutationFn: async ({ id, cambios }: { id: string; cambios: TablesUpdate<"sesiones"> }) => {
      const { error } = await supabase.from("sesiones").update(cambios).eq("id", id);
      if (error) throw errorSesion(error);
    },
    onSuccess: invalidar,
  });
}
