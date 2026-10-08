import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { useArchivosParaBorrar, useExportarCliente, useSuprimirCliente } from "@/hooks/admin/useRgpd";
import type { Perfil } from "@/types/admin";

const plural = (n: number, una: string, varias: string) => `${n} ${n === 1 ? una : varias}`;

/**
 * T9.3 · Derechos de acceso y portabilidad (exportar) y de supresión (borrar definitivamente). La supresión es
 * distinta de la Baja: no se puede deshacer, y para confirmarla hay que escribir el nombre completo.
 */
const PrivacidadCliente = ({ perfil }: { perfil: Perfil }) => {
  const navigate = useNavigate();
  const exportar = useExportarCliente();
  const suprimir = useSuprimirCliente();
  const [borrando, setBorrando] = useState(false);
  const [confirmacion, setConfirmacion] = useState("");
  const archivos = useArchivosParaBorrar(perfil, borrando);
  const nombreOk = confirmacion.trim().toLowerCase() === perfil.nombre_completo.trim().toLowerCase();

  const cerrar = () => {
    setBorrando(false);
    setConfirmacion("");
  };

  const descargar = () =>
    exportar.mutate(perfil, {
      onSuccess: () => toast({ title: "Datos exportados", description: "Revisa el fichero antes de enviárselo a la persona." }),
      onError: (e) => toast({ title: "No se pudieron exportar", description: e.message, variant: "destructive" }),
    });

  // mutateAsync y no mutate: al borrarse el perfil la ficha se desmonta y los callbacks de mutate no llegarían.
  const confirmar = async () => {
    try {
      const r = await suprimir.mutateAsync(perfil);
      navigate("/admin/perfiles", { replace: true });
      toast({
        title: `${perfil.nombre_completo}: datos borrados`,
        description: `${plural(r.sesiones, "sesión", "sesiones")} · ${plural(r.notas, "nota", "notas")} · ${plural(r.matches, "match", "matches")} · ${plural(r.archivos, "fichero", "ficheros")}${r.pagos_conservados ? ` · ${plural(r.pagos_conservados, "pago conservado", "pagos conservados")} por obligación contable` : ""}`,
      });
    } catch (e) {
      toast({ title: "No se pudo borrar", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
  };

  return (
    <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
      <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-gold" /> Datos personales (RGPD)
      </h3>
      <p className="font-body text-sm text-muted-foreground">
        Si la persona pide sus datos, descárgalos en JSON. Si pide que se borren, bórralos aquí: a diferencia de la Baja, no se puede deshacer.
      </p>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={descargar}
          disabled={exportar.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border font-body text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
        >
          {exportar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Exportar datos (JSON)
        </button>
        <button
          onClick={() => setBorrando(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-200 font-body text-sm font-semibold text-rose-700 hover:bg-rose-50"
        >
          <Trash2 className="w-4 h-4" /> Borrar definitivamente…
        </button>
      </div>

      <AlertDialog open={borrando} onOpenChange={(abierto) => !abierto && !suprimir.isPending && cerrar()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">¿Borrar definitivamente a {perfil.nombre_completo}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="font-body space-y-2 text-sm text-muted-foreground">
                <p>
                  Se borran su perfil y cuestionario, sesiones y resúmenes, notas, sugerencias, matches (también para la otra persona),
                  tareas, alertas, test DISC, foto, vídeo y documentos
                  {archivos.data ? ` (${plural(archivos.data.length, "fichero", "ficheros")})` : archivos.isLoading ? " (contando ficheros…)" : ""}.
                </p>
                <p>
                  Se conservan sus pagos para la contabilidad (sin teléfono ni notas) y el registro de auditoría, sin los motivos escritos.
                  Si solo quieres sacarla del matching, usa el estado Baja.
                </p>
                {archivos.error && <p className="text-rose-700">No se pudieron listar sus ficheros: {archivos.error.message}</p>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="block font-body text-sm text-foreground">
            Escribe su nombre completo para confirmar
            <input
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              placeholder={perfil.nombre_completo}
              autoComplete="off"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm"
            />
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={suprimir.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!nombreOk || !archivos.data || suprimir.isPending}
              onClick={(e) => {
                e.preventDefault(); // se cierra al navegar, no al pulsar
                confirmar();
              }}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {suprimir.isPending ? "Borrando…" : "Borrar definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default PrivacidadCliente;
