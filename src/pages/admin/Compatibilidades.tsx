import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { PlanBadge } from "@/components/admin/Badges";
import { TarjetaSugerencia } from "@/components/admin/ficha/SugerenciasTab";
import { useSugerenciasPendientes } from "@/hooks/admin/useSugerencias";

// T9.1 · Sugerencias pendientes de todos los clientes, las mejores primero. Aceptar crea el match (trigger de T6.1).
const Compatibilidades = () => {
  const { data, isLoading, error } = useSugerenciasPendientes();
  const sugerencias = data?.sugerencias ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-2"><Sparkles className="w-7 h-7 text-gold" /> Compatibilidades</h1>
        <p className="font-body text-sm text-muted-foreground mt-1">
          {total} sugerencia{total === 1 ? "" : "s"} pendiente{total === 1 ? "" : "s"} de decidir
          {total > sugerencias.length && ` · se muestran las ${sugerencias.length} con más compatibilidad`}
        </p>
      </div>

      <section className="bg-card border border-border rounded-2xl p-5">
        {error ? (
          <p className="font-body text-sm text-rose-700">No se pudieron cargar las sugerencias: {error.message}</p>
        ) : isLoading ? (
          <p className="font-body text-sm text-muted-foreground">Cargando sugerencias…</p>
        ) : sugerencias.length === 0 ? (
          <p className="font-body text-sm text-muted-foreground">
            No hay sugerencias pendientes. Se calculan al abrir la ficha de cada cliente activo y cuando llega un perfil nuevo compatible.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-x-3 gap-y-4">
            {sugerencias.map((s) => (
              <div key={s.id} className="space-y-1.5">
                <p className="font-body text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap px-1">
                  Para
                  <Link to={`/admin/perfiles/${s.perfil_id}?tab=sugerencias`} className="font-semibold text-foreground hover:text-gold">
                    {s.cliente?.nombre_completo}
                  </Link>
                  <PlanBadge plan={s.cliente?.plan ?? null} />
                </p>
                <TarjetaSugerencia s={s} perfilId={s.perfil_id} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Compatibilidades;
