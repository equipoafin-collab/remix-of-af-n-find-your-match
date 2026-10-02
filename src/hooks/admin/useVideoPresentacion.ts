import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subirConProgreso } from "@/lib/storage";
import { rutaVideoPresentacion } from "@/lib/video";
import type { Perfil } from "@/types/admin";

const BUCKET = "videos-sesiones";

function useInvalidarVideo() {
  const queryClient = useQueryClient();
  return (path: string | null) => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["perfiles"] }),
    // Firma nueva: si se reemplaza con la misma ruta, el navegador no reutiliza el vídeo anterior.
    path ? queryClient.resetQueries({ queryKey: ["signed-url", BUCKET, path] }) : undefined,
  ]);
}

export function useSubirVideo(perfil: Perfil) {
  const invalidar = useInvalidarVideo();
  const [progreso, setProgreso] = useState<number | null>(null);
  const mutation = useMutation({
    mutationFn: async ({ file, ext }: { file: File; ext: string }) => {
      const path = rutaVideoPresentacion(perfil.id, ext);
      setProgreso(0);
      await subirConProgreso(BUCKET, path, file, setProgreso);
      const { error } = await supabase.from("perfiles").update({ video_presentacion_path: path }).eq("id", perfil.id);
      if (error) throw error;
      // Al cambiar de .mp4 a .mov (o al revés) el anterior quedaría huérfano.
      const anterior = perfil.video_presentacion_path;
      if (anterior && anterior !== path) await supabase.storage.from(BUCKET).remove([anterior]);
      return path;
    },
    onSuccess: invalidar,
    onSettled: () => setProgreso(null),
  });
  return { ...mutation, progreso };
}

export function useEliminarVideo(perfil: Perfil) {
  const invalidar = useInvalidarVideo();
  return useMutation({
    mutationFn: async () => {
      const path = perfil.video_presentacion_path;
      if (!path) return null;
      const { error: errorStorage } = await supabase.storage.from(BUCKET).remove([path]);
      if (errorStorage) throw errorStorage;
      const { error } = await supabase.from("perfiles").update({ video_presentacion_path: null }).eq("id", perfil.id);
      if (error) throw error;
      return path;
    },
    onSuccess: invalidar,
  });
}
