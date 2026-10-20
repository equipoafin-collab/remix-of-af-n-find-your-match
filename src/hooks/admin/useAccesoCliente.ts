import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** T15.1 · Enlace personal (7 días, un solo uso) para que el cliente cree la contraseña de su área. Anula los anteriores. */
export function useCrearAccesoCliente() {
  return useMutation({
    mutationFn: async (perfilId: string) => {
      const { data, error } = await supabase.from("accesos_cliente").insert({ perfil_id: perfilId }).select("token, caduca_at").single();
      if (error) throw error;
      return { enlace: `${window.location.origin}/mi-area/acceso?t=${data.token}`, caduca_at: data.caduca_at };
    },
  });
}
