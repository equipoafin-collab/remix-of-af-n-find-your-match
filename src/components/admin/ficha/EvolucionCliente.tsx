import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { useSesiones } from "@/hooks/admin/useSesiones";
import { validarResumen } from "../../../../supabase/functions/_shared/resumen";
import type { Perfil } from "@/types/admin";

const MAX_SESIONES = 6;

/** Línea temporal de las últimas sesiones con resumen revisado (T3.4): estado emocional y avances. */
const EvolucionCliente = ({ perfil }: { perfil: Perfil }) => {
  const { data: sesiones = [], isLoading } = useSesiones(perfil.id); // ya vienen de la más reciente a la más antigua
  const revisadas = sesiones
    .filter((s) => s.resumen_estado === "revisado")
    .map((s) => ({ sesion: s, resumen: validarResumen(s.resumen_ia) }))
    .filter((x) => x.resumen)
    .slice(0, MAX_SESIONES);

  return (
    <section className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gold" /> Evolución
        </h3>
        {revisadas.length > 0 && (
          <Link to="?tab=sesiones" className="font-body text-xs text-gold hover:underline">Ver todas las sesiones</Link>
        )}
      </div>
      {isLoading ? (
        <p className="font-body text-sm text-muted-foreground">Cargando…</p>
      ) : revisadas.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground">
          Aún no hay resúmenes revisados. Aparecerán aquí al guardar como revisado el resumen de una sesión.
        </p>
      ) : (
        <ol className="relative border-l border-border ml-1.5 space-y-5">
          {revisadas.map(({ sesion, resumen }, i) => (
            <li key={sesion.id} className="pl-5 relative">
              <span className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ${i === 0 ? "bg-gold" : "bg-muted-foreground/40"}`} />
              <p className="font-body text-xs text-muted-foreground">
                {new Date(sesion.fecha_hora).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                {sesion.tipo === "primera" && " · primera sesión"}
                {i === 0 && " · última"}
              </p>
              <p className="font-body text-sm text-foreground mt-0.5">{resumen!.estado_emocional}</p>
              {resumen!.avances.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {resumen!.avances.map((a, j) => (
                    <li key={j} className="font-body text-xs text-emerald-700">↗ {a}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

export default EvolucionCliente;
