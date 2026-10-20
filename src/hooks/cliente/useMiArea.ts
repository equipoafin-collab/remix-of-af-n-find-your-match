import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { MiArea } from "@/lib/areaCliente";
import type { MiPerfil, Preferencias } from "@/lib/cuestionario";
import { extensionFoto } from "../../../supabase/functions/_shared/acceso";
import { llamarFuncion } from "./accesoCliente";

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

/** T16.1 · Sus respuestas del cuestionario (mi_perfil): null con el área cerrada. */
export function useMiPerfil(userId: string | undefined) {
  return useQuery({
    queryKey: ["mi-perfil", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("mi_perfil");
      if (error) throw error;
      return data as unknown as MiPerfil | null;
    },
    enabled: !!userId,
  });
}

/** T16.2 · Guarda sus preferencias (actualizar_mi_perfil valida todo). Devuelve lo que cambió. */
export function useActualizarMiPerfil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cambios: Preferencias) => {
      const { data, error } = await supabase.rpc("actualizar_mi_perfil", { _cambios: cambios });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mi-perfil"] }),
  });
}

/** T16.2 · Cambia su foto: URL firmada de foto-cliente, subida y confirmación (borra la anterior). */
export function useCambiarFoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fichero: File) => {
      if (!extensionFoto(fichero.type)) throw new Error("Sube una foto en JPG, PNG o WebP.");
      if (fichero.size > 5 * 1024 * 1024) throw new Error("La foto no puede pasar de 5 MB.");
      const fallo = "No se pudo cambiar tu foto.";
      const subida = await llamarFuncion<{ ruta: string; token: string }>("foto-cliente", { accion: "subir", tipo: fichero.type }, fallo);
      const { error } = await supabase.storage.from("fotos-perfil").uploadToSignedUrl(subida.ruta, subida.token, fichero, { contentType: fichero.type });
      if (error) throw error;
      await llamarFuncion("foto-cliente", { accion: "confirmar", ruta: subida.ruta }, fallo);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mi-perfil"] }),
  });
}
