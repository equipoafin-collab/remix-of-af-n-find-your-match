import { useState } from "react";
import { FileText, ExternalLink, Link2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import CompartirEnlace from "@/components/admin/CompartirEnlace";
import { useCrearEnlaceSubida, useDocumentos, type Documento } from "@/hooks/admin/useDocumentos";
import { useSignedUrl } from "@/hooks/admin/useSignedUrl";
import type { Perfil } from "@/types/admin";
import PrivacidadCliente from "./PrivacidadCliente";

const EnlaceDocumento = ({ doc }: { doc: Documento }) => {
  const { data: url } = useSignedUrl("antecedentes", doc.path);
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border first:border-t-0">
      <span className="font-body text-sm text-foreground inline-flex items-center gap-2">
        <FileText className="w-4 h-4 text-gold" />
        Certificado de antecedentes
        {doc.subidoAt && <span className="text-xs text-muted-foreground">· subido el {new Date(doc.subidoAt).toLocaleDateString("es-ES")}</span>}
      </span>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-gold-texto hover:underline text-sm font-body inline-flex items-center gap-1">
          Abrir <ExternalLink className="w-3 h-3" />
        </a>
      ) : (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      )}
    </li>
  );
};

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long" });

type Enlace = { enlace: string; caduca_at: string };

/** T13.3 · Enlace personal para que el cliente suba el certificado sin cuenta ni tener que escribir su nombre. */
const EnlaceSubida = ({ perfil, enlace, cerrar }: { perfil: Perfil; enlace: Enlace; cerrar: () => void }) => (
  <div className="px-5 pb-4 space-y-2">
    <p className="font-body text-sm text-foreground">
      Envíaselo a {perfil.nombre_completo}: con él sube su certificado y aparece aquí. Vale hasta el {fecha(enlace.caduca_at)}.
    </p>
    {window.location.hostname === "localhost" && (
      <p className="font-body text-xs text-rose-700">Lo has creado en local: el enlace apunta a localhost y no le funcionará al cliente.</p>
    )}
    <CompartirEnlace
      enlace={enlace.enlace}
      email={perfil.email ?? ""}
      etiqueta="Enlace para subir documentos"
      asunto="Tu certificado de antecedentes para Afín"
      cuerpo={`Hola, ${perfil.nombre_completo}:\n\nPara completar la verificación de tu perfil, sube tu certificado de antecedentes penales (PDF) en este enlace personal:\n${enlace.enlace}\n\nEs solo para ti y vale hasta el ${fecha(enlace.caduca_at)}.\n\nUn saludo,\nAfín`}
      cerrar={cerrar}
    />
  </div>
);

const DocumentosTab = ({ perfil }: { perfil: Perfil }) => {
  const { data: docs = [], isLoading, error } = useDocumentos(perfil);
  const crear = useCrearEnlaceSubida();
  const [enlace, setEnlace] = useState<Enlace | null>(null);

  const crearEnlace = () =>
    crear.mutate(perfil.id, {
      onSuccess: setEnlace,
      onError: (e) => toast({ title: "No se pudo crear el enlace", description: e.message, variant: "destructive" }),
    });

  return (
    <div className="space-y-4">
      <section className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
          <h3 className="font-display text-sm font-semibold text-foreground">Documentos</h3>
          {!enlace && (
            <button
              onClick={crearEnlace}
              disabled={crear.isPending}
              className="inline-flex items-center gap-1 text-xs font-body text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {crear.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />} Enlace para subir documentos
            </button>
          )}
        </div>
        {enlace && <EnlaceSubida perfil={perfil} enlace={enlace} cerrar={() => setEnlace(null)} />}
        {error ? (
          <p className="px-5 pb-5 font-body text-sm text-rose-700">No se pudieron cargar los documentos: {error.message}</p>
        ) : isLoading ? (
          <p className="px-5 pb-5 font-body text-sm text-muted-foreground">Cargando…</p>
        ) : docs.length === 0 ? (
          <p className="px-5 pb-5 font-body text-sm text-muted-foreground">No ha subido documentos. Envíale el enlace para subirlos.</p>
        ) : (
          <ul className="border-t border-border">{docs.map((d) => <EnlaceDocumento key={d.path} doc={d} />)}</ul>
        )}
      </section>
      <PrivacidadCliente perfil={perfil} />
    </div>
  );
};

export default DocumentosTab;
