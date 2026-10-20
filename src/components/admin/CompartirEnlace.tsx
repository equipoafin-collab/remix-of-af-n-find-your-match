import { Copy, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";

/** Un enlace para enviar a alguien: el campo para seleccionarlo, "Copiar" y "Abrir en el correo" ya redactado. */
const CompartirEnlace = ({ enlace, email, asunto, cuerpo, etiqueta, cerrar }: {
  enlace: string; email: string; asunto: string; cuerpo: string; etiqueta: string; cerrar?: () => void;
}) => {
  const copiar = () =>
    navigator.clipboard.writeText(enlace).then(
      () => toast({ title: "Enlace copiado" }),
      () => toast({ title: "No se pudo copiar", description: "Selecciónalo y cópialo a mano.", variant: "destructive" }),
    );
  const correo = `mailto:${email}?${new URLSearchParams({ subject: asunto, body: cuerpo }).toString().replace(/\+/g, "%20")}`;

  return (
    <div className="space-y-2">
      <input readOnly value={enlace} onFocus={(e) => e.target.select()} aria-label={etiqueta} className="w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-xs" />
      <div className="flex gap-2 flex-wrap">
        <button onClick={copiar} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-foreground text-background font-body text-sm font-semibold">
          <Copy className="w-4 h-4" /> Copiar
        </button>
        <a href={correo} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border font-body text-sm text-foreground hover:bg-muted">
          <Mail className="w-4 h-4" /> Abrir en el correo
        </a>
        {cerrar && <button onClick={cerrar} className="px-3 py-1.5 rounded-lg font-body text-sm text-muted-foreground hover:text-foreground">Cerrar</button>}
      </div>
    </div>
  );
};

export default CompartirEnlace;
