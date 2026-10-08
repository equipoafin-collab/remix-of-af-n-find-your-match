import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mensajeDeFuncion } from "./mensajeDeFuncion";

export interface Administradora {
  user_id: string;
  email: string | null;
  ultimo_acceso: string | null;
  /** Invitada que aún no ha elegido contraseña. */
  pendiente: boolean;
  /** La que tiene la sesión abierta: no puede quitarse el acceso. */
  yo: boolean;
}

// T9.2 · Todo pasa por la Edge Function administradoras: los emails viven en auth.users, fuera del alcance del navegador.
async function llamar<T>(body: Record<string, unknown>, porDefecto: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke("administradoras", { body });
  if (error) throw new Error(await mensajeDeFuncion(error, porDefecto));
  return data;
}

interface Token { token_hash: string; tipo: string }

/** Enlace a /admin/acceso en este mismo origen: el token solo se gasta al pulsar "Entrar" en esa página. */
const enlaceDeAcceso = ({ token_hash, tipo }: Token) =>
  `${window.location.origin}/admin/acceso?${new URLSearchParams({ token_hash, tipo })}`;

export function useAdministradoras() {
  return useQuery({
    queryKey: ["administradoras"],
    queryFn: () => llamar<{ administradoras: Administradora[] }>({ accion: "listar" }, "No se pudieron cargar las administradoras")
      .then((r) => r.administradoras),
  });
}

/** Crea la cuenta con rol admin (o se lo devuelve si ya existía) y da su enlace de acceso. */
export function useInvitarAdministradora() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => {
      const r = await llamar<Token & { nueva: boolean }>({ accion: "invitar", email }, "No se pudo invitar");
      return { nueva: r.nueva, enlace: enlaceDeAcceso(r) };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["administradoras"] }),
  });
}

/** Enlace nuevo para quien no llegó a entrar u olvidó la contraseña: al usarlo elige una contraseña nueva. */
export function useEnlaceAdministradora() {
  return useMutation({
    mutationFn: async (userId: string) => enlaceDeAcceso(await llamar<Token>({ accion: "enlace", user_id: userId }, "No se pudo crear el enlace")),
  });
}

export function useQuitarAdministradora() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => llamar({ accion: "quitar", user_id: userId }, "No se pudo quitar el acceso"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["administradoras"] }),
  });
}
