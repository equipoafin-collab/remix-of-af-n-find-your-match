import { FileText, ExternalLink, Loader2 } from "lucide-react";
import { useDocumentos, type Documento } from "@/hooks/admin/useDocumentos";
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
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline text-sm font-body inline-flex items-center gap-1">
          Abrir <ExternalLink className="w-3 h-3" />
        </a>
      ) : (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      )}
    </li>
  );
};

const DocumentosTab = ({ perfil }: { perfil: Perfil }) => {
  const { data: docs = [], isLoading, error } = useDocumentos(perfil);

  return (
    <div className="space-y-4">
      <section className="bg-card border border-border rounded-2xl overflow-hidden">
        <h3 className="font-display text-sm font-semibold text-foreground px-5 pt-5 pb-3">Documentos</h3>
        {error ? (
          <p className="px-5 pb-5 font-body text-sm text-rose-700">No se pudieron cargar los documentos: {error.message}</p>
        ) : isLoading ? (
          <p className="px-5 pb-5 font-body text-sm text-muted-foreground">Cargando…</p>
        ) : docs.length === 0 ? (
          <p className="px-5 pb-5 font-body text-sm text-muted-foreground">
            No ha subido documentos. Se suben desde /perfil/documentos indicando su email o nombre completo.
          </p>
        ) : (
          <ul className="border-t border-border">{docs.map((d) => <EnlaceDocumento key={d.path} doc={d} />)}</ul>
        )}
      </section>
      <PrivacidadCliente perfil={perfil} />
    </div>
  );
};

export default DocumentosTab;
