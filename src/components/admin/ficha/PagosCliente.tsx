import { CreditCard, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePagosPerfil } from "@/hooks/admin/usePagos";
import { ESTADO_PAGO, estadoVisible, urlStripe } from "@/lib/pagos";
import type { Perfil } from "@/types/admin";

const euros = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
const badge = "px-2 py-0.5 rounded-full text-xs font-body font-medium border";

/** T11.4 · Los pagos del cliente con su estado: el pendiente se puede volver a copiar; el cobrado, ver en Stripe. */
const PagosCliente = ({ perfil }: { perfil: Perfil }) => {
  const { data: pagos = [], isLoading, error } = usePagosPerfil(perfil.id);

  const copiar = (enlace: string) =>
    navigator.clipboard.writeText(enlace).then(
      () => toast({ title: "Enlace copiado" }),
      () => toast({ title: "No se pudo copiar", variant: "destructive" }),
    );

  return (
    <section className="bg-card border border-border rounded-2xl overflow-hidden">
      <h3 className="p-5 font-display text-sm font-semibold text-foreground flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-gold" /> Pagos
      </h3>
      {error ? (
        <p className="px-5 pb-5 font-body text-sm text-rose-700">No se pudieron cargar los pagos: {error.message}</p>
      ) : isLoading ? (
        <p className="px-5 pb-5 font-body text-sm text-muted-foreground">Cargando…</p>
      ) : pagos.length === 0 ? (
        <p className="px-5 pb-5 font-body text-sm text-muted-foreground">Sin pagos. Crea un enlace de pago desde la cabecera ("Enlace de pago").</p>
      ) : (
        <ul>
          {pagos.map((p) => {
            const estado = estadoVisible(p);
            const enStripe = urlStripe(p);
            return (
              <li key={p.id} className="px-5 py-3 border-t border-border flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <p className="font-body text-sm text-foreground">
                    {p.notas || `Plan ${p.plan}`} · <span className="font-semibold tabular-nums">{p.importe != null ? euros(Number(p.importe)) : "—"}</span>
                  </p>
                  <p className="font-body text-xs text-muted-foreground">
                    {p.origen === "stripe" ? "Stripe" : "Registrado a mano"} · {new Date(p.pagado_at ?? p.created_at).toLocaleDateString("es-ES")}
                  </p>
                </div>
                <span className={`${badge} ${ESTADO_PAGO[estado].color}`}>{ESTADO_PAGO[estado].label}</span>
                {estado === "pendiente" && p.enlace_pago && (
                  <button onClick={() => copiar(p.enlace_pago!)} className="font-body text-xs text-gold-texto hover:underline">Copiar enlace</button>
                )}
                {enStripe && (
                  <a href={enStripe} target="_blank" rel="noopener noreferrer" className="font-body text-xs text-gold-texto hover:underline inline-flex items-center gap-1">
                    Ver en Stripe <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default PagosCliente;
