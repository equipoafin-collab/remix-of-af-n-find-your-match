import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { esCarpetaDelPerfil } from "@/lib/storage";
import type { Perfil } from "@/types/admin";

export interface Documento {
  path: string;
  subidoAt: string | null;
}

type PerfilDocumentos = Pick<Perfil, "id" | "email" | "nombre_completo">;

/** Certificados de antecedentes que la persona subió desde /perfil/documentos (también para exportar y suprimir, T9.3). */
export async function listarDocumentos(perfil: Omit<PerfilDocumentos, "id">): Promise<Documento[]> {
  const bucket = supabase.storage.from("antecedentes");
  // ponytail: lista hasta 1.000 carpetas; con más, guardar la carpeta en el perfil al subir.
  const { data: carpetas, error } = await bucket.list("", { limit: 1000 });
  if (error) throw error;
  const suyas = carpetas.filter((c) => esCarpetaDelPerfil(c.name, perfil));
  const porCarpeta = await Promise.all(
    suyas.map(async (c) => {
      const { data, error } = await bucket.list(c.name, { sortBy: { column: "created_at", order: "desc" } });
      if (error) throw error;
      return data
        .filter((f) => !f.name.startsWith(".")) // .emptyFolderPlaceholder de Storage
        .map((f) => ({ path: `${c.name}/${f.name}`, subidoAt: f.created_at }));
    }),
  );
  return porCarpeta.flat();
}

export function useDocumentos(perfil: PerfilDocumentos) {
  return useQuery({
    queryKey: ["documentos", perfil.id],
    queryFn: () => listarDocumentos(perfil),
  });
}
