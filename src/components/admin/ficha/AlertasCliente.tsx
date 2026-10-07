import { useAlertas } from "@/hooks/admin/useAlertas";
import { ListaAlertas } from "@/components/admin/alertas/ListaAlertas";

/** T7.1 · Banda bajo la cabecera de la ficha con las alertas sin resolver del cliente; no se muestra si no hay. */
const AlertasCliente = ({ perfilId }: { perfilId: string }) => {
  const { data: alertas = [] } = useAlertas({ perfilId, estado: "pendientes" });
  if (!alertas.length) return null;
  const urgente = alertas.some((a) => a.severidad === "urgente");
  return (
    <section className={`rounded-2xl border overflow-hidden ${urgente ? "border-rose-200 bg-rose-50/40" : "border-amber-200 bg-amber-50/40"}`}>
      <ListaAlertas alertas={alertas} compacta vacio="" />
    </section>
  );
};

export default AlertasCliente;
