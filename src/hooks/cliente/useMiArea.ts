import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { MiArea } from "@/lib/areaCliente";

/** Sesión actual; undefined mientras se lee. Se actualiza al entrar, salir o caducar. */
export function useSesion() {
  const [sesion, setSesion] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSesion(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return sesion;
}

/** T15.2 · Resumen del área del cliente (mi_area): null si la cuenta no tiene perfil. Con la cuenta en la clave. */
export function useMiArea(userId: string | undefined) {
  return useQuery({
    queryKey: ["mi-area", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("mi_area");
      if (error) throw error;
      return data as unknown as MiArea | null;
    },
    enabled: !!userId,
  });
}

/** "Quiero renovar": tarea y aviso para la psicóloga. Devuelve false si ya estaba pedido. */
export function usePedirRenovacion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("pedir_renovacion");
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mi-area"] }),
  });
}
