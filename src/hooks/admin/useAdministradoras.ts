import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mensajeDeFuncion } from "./mensajeDeFuncion";

export interface Administradora {
  user_id: string;
  email: string | null;
  ultimo_acceso: string | null;
  invitada_at: string | null;
  /** La que tiene la sesión abierta: no puede quitarse el acceso. */
  yo: boolean;
}

// T9.2 · Todo pasa por la Edge Function administradoras: los emails viven en auth.users, fuera del alcance del navegador.
async function llamar<T>(body: Record<string, unknown>, porDefecto: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke("administradoras", { body });
  if (error) throw new Error(await mensajeDeFuncion(error, porDefecto));
  return data;
}

export function useAdministradoras() {
  return useQuery({
    queryKey: ["administradoras"],
    queryFn: () => llamar<{ administradoras: Administradora[] }>({ accion: "listar" }, "No se pudieron cargar las administradoras")
      .then((r) => r.administradoras),
  });
}

/** invitada = false si el email ya tenía cuenta: recupera el acceso y entra con su contraseña, sin email. */
export function useInvitarAdministradora() {
  const queryClient = useQueryClient();
  return useMutation({
    // El enlace del email lleva a /admin, donde se le pide elegir contraseña (AdminLayout).
    mutationFn: (email: string) =>
      llamar<{ invitada: boolean }>({ accion: "invitar", email, redirect_to: `${window.location.origin}/admin` }, "No se pudo invitar"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["administradoras"] }),
  });
}

export function useQuitarAdministradora() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => llamar({ accion: "quitar", user_id: userId }, "No se pudo quitar el acceso"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["administradoras"] }),
  });
}
