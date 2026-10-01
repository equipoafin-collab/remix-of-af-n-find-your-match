import { useQuery } from "@tanstack/react-query";
import { getSignedUrl, SIGNED_URL_TTL_SECONDS } from "@/lib/storage";

export function useSignedUrl(bucket: string, path: string | null | undefined) {
  return useQuery({
    queryKey: ["signed-url", bucket, path],
    queryFn: () => getSignedUrl(bucket, path as string),
    enabled: !!path,
    // Se renueva antes de que caduque la firma.
    staleTime: (SIGNED_URL_TTL_SECONDS - 300) * 1000,
    gcTime: (SIGNED_URL_TTL_SECONDS - 300) * 1000,
  });
}
