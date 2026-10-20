import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { mensajeDeFuncion } from "./mensajeDeFuncion";

export function usePagos() {
  return useQuery({
    queryKey: ["pagos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pagos").select("*").order("fecha", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

/** Los pagos de un cliente, para su ficha (T11.4). */
export function usePagosPerfil(perfilId: string) {
  return useQuery({
    queryKey: ["pagos", perfilId],
    queryFn: async () => {
      const { data, error } = await supabase.from("pagos").select("*").eq("perfil_id", perfilId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export interface EnlacePago { enlace: string; importe: number; caduca_at: string; reutilizado: boolean }

/** T11.2 · Enlace de pago de Stripe para el plan y los meses elegidos; deja un pago pendiente. */
export function useCrearEnlacePago() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ perfilId, plan, meses }: { perfilId: string; plan: string; meses: number }): Promise<EnlacePago> => {
      const { data, error } = await supabase.functions.invoke("stripe-checkout", { body: { perfil_id: perfilId, plan, meses } });
      if (error) throw new Error(await mensajeDeFuncion(error, "No se pudo crear el enlace de pago"));
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pagos"] }),
  });
}

// Un trigger copia el plan del pago al perfil: hay que refrescar también los perfiles.
function useInvalidarPagos() {
  const queryClient = useQueryClient();
  return () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["pagos"] }),
    queryClient.invalidateQueries({ queryKey: ["perfiles"] }),
  ]);
}

export function useCrearPago() {
  const invalidar = useInvalidarPagos();
  return useMutation({
    mutationFn: async (pago: TablesInsert<"pagos">) => {
      const { error } = await supabase.from("pagos").insert(pago);
      if (error) throw error;
    },
    onSuccess: invalidar,
  });
}

export function useActualizarPago() {
  const invalidar = useInvalidarPagos();
  return useMutation({
    mutationFn: async ({ id, cambios }: { id: string; cambios: TablesUpdate<"pagos"> }) => {
      const { error } = await supabase.from("pagos").update(cambios).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidar,
  });
}

export function useEliminarPago() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pagos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pagos"] }),
  });
}
