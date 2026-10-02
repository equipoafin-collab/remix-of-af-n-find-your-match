import { useRef } from "react";
import { Video, Upload, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useSignedUrl } from "@/hooks/admin/useSignedUrl";
import { useEliminarVideo, useSubirVideo } from "@/hooks/admin/useVideoPresentacion";
import { VIDEO_MAX_MB, validarVideo } from "@/lib/video";
import type { Perfil } from "@/types/admin";

const onError = (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" });

/** Vídeo de la primera sesión: bucket privado, reproducción con URL firmada de 1 h. */
const VideoPresentacion = ({ perfil }: { perfil: Perfil }) => {
  const input = useRef<HTMLInputElement>(null);
  const subir = useSubirVideo(perfil);
  const eliminar = useEliminarVideo(perfil);
  const { data: url, isLoading: firmando } = useSignedUrl("videos-sesiones", perfil.video_presentacion_path);
  const ocupado = subir.isPending || eliminar.isPending;

  const elegir = (file: File | undefined) => {
    if (input.current) input.current.value = ""; // permite volver a elegir el mismo fichero
    if (!file) return;
    const v = validarVideo(file);
    if ("error" in v) return toast({ title: "No se puede subir", description: v.error, variant: "destructive" });
    subir.mutate(
      { file, ext: v.ext },
      { onSuccess: () => toast({ title: "Vídeo subido", description: file.name }), onError },
    );
  };

  const borrar = () => {
    if (!confirm("¿Eliminar el vídeo de presentación? No se puede deshacer.")) return;
    eliminar.mutate(undefined, { onError });
  };

  return (
    <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
          <Video className="w-4 h-4 text-gold" /> Vídeo de presentación
        </h3>
        <div className="flex items-center gap-2">
          <input ref={input} type="file" accept="video/mp4,video/quicktime" className="hidden" onChange={(e) => elegir(e.target.files?.[0])} />
          <button
            onClick={() => input.current?.click()}
            disabled={ocupado}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background font-body text-sm hover:border-gold disabled:opacity-50"
          >
            <Upload className="w-4 h-4" /> {perfil.video_presentacion_path ? "Reemplazar" : "Subir vídeo"}
          </button>
          {perfil.video_presentacion_path && (
            <button
              onClick={borrar}
              disabled={ocupado}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background font-body text-sm text-rose-600 hover:border-rose-300 disabled:opacity-50"
            >
              {eliminar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Eliminar
            </button>
          )}
        </div>
      </div>

      {subir.progreso !== null && (
        <div>
          <div className="flex justify-between font-body text-xs text-muted-foreground mb-1">
            <span>Subiendo vídeo… no cierres esta pestaña</span>
            <span className="tabular-nums">{Math.round(subir.progreso * 100)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gold transition-[width]" style={{ width: `${subir.progreso * 100}%` }} />
          </div>
        </div>
      )}

      {perfil.video_presentacion_path ? (
        url ? (
          <video key={url} src={url} controls preload="metadata" className="w-full max-h-[420px] rounded-xl bg-black" />
        ) : (
          <p className="font-body text-sm text-muted-foreground">{firmando ? "Cargando vídeo…" : "No se pudo cargar el vídeo."}</p>
        )
      ) : (
        subir.progreso === null && (
          <p className="font-body text-sm text-muted-foreground">
            Aún no hay vídeo de la primera sesión. Formatos .mp4 o .mov, hasta {VIDEO_MAX_MB} MB.
          </p>
        )
      )}
    </section>
  );
};

export default VideoPresentacion;
