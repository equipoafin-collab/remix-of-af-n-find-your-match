import { useMemo } from "react";
import { MapPin, Cake, User, Trophy, CalendarClock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useUpdatePerfil } from "@/hooks/admin/usePerfiles";
import FotoPerfil from "@/components/admin/FotoPerfil";
import { EstadoBadge, PlanBadge, SinRevisarBadge } from "@/components/admin/Badges";
import type { Cliente, Perfil } from "@/types/admin";
import CambiarEstado from "./CambiarEstado";

const calidadPerfil = (p: Perfil) => {
  let score = 0;
  if (p.foto_url) score += 15;
  if (p.hobbies) score += 10;
  if (p.relacion_sana) score += 10;
  if (p.vida_en_10_anios) score += 10;
  if (p.aprendizaje_ultima_relacion) score += 5;
  if (p.religion) score += 10;
  if (p.ideologia) score += 5;
  if (p.alcohol) score += 5;
  if (p.desea_casarse) score += 10;
  if (p.disc_perfil) score += 10;
  if (p.telefono) score += 10;
  if (score >= 80) return { label: "Excelente", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" };
  if (score >= 60) return { label: "Alto potencial", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" };
  if (score >= 40) return { label: "Medio", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" };
  return { label: "Bajo", color: "text-rose-600", bg: "bg-rose-50 border-rose-200" };
};

const Revisado = ({ perfil }: { perfil: Perfil }) => {
  const updatePerfil = useUpdatePerfil();
  // Mientras se guarda se muestra el valor nuevo para que la casilla no "rebote".
  const marcado = updatePerfil.isPending ? !!updatePerfil.variables?.cambios.revisado : perfil.revisado;
  return (
    <label className="mt-2 flex items-center gap-2 font-body text-sm text-foreground">
      <input
        type="checkbox"
        checked={marcado}
        disabled={updatePerfil.isPending}
        onChange={(e) =>
          updatePerfil.mutate(
            { id: perfil.id, cambios: { revisado: e.target.checked } },
            { onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }) },
          )
        }
        className="accent-gold"
      />
      Perfil revisado
    </label>
  );
};

// Siempre visible (sticky) sobre las pestañas. AMPLIAR: tareas pendientes (T6.2) y alertas (T7.1).
const CabeceraFicha = ({ cliente: p }: { cliente: Cliente }) => {
  const calidad = useMemo(() => calidadPerfil(p), [p]);
  const conPlan = !!p.plan || p.sesiones_contratadas > 0;
  const progreso = p.sesiones_contratadas > 0 ? Math.min(100, (p.sesiones_realizadas / p.sesiones_contratadas) * 100) : 0;

  return (
    <div className="sticky top-0 z-20 -mx-8 px-8 py-3 bg-background/95 backdrop-blur">
      <div className="bg-card border border-border rounded-2xl p-5 flex items-start gap-5 flex-wrap">
        <FotoPerfil path={p.foto_url} nombre={p.nombre_completo} className="w-16 h-16 rounded-2xl text-xl" />

        <div className="flex-1 min-w-[220px]">
          <h1 className="font-display text-2xl font-bold text-foreground">{p.nombre_completo}</h1>
          <p className="font-body text-sm text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1"><Cake className="w-3.5 h-3.5" />{p.edad} años</span>
            <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{p.zona ?? p.ciudad}</span>
            <span className="inline-flex items-center gap-1"><User className="w-3.5 h-3.5" />{p.genero || "—"}</span>
            <span>Busca: {p.busca_genero || "—"}</span>
          </p>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <PlanBadge plan={p.plan} />
            <EstadoBadge estado={p.estado_cliente} />
            {!p.revisado && <SinRevisarBadge />}
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-body font-medium border ${calidad.bg} ${calidad.color}`}>
              <Trophy className="w-3 h-3" /> Calidad: {calidad.label}
            </span>
          </div>
        </div>

        <div className="w-56 space-y-3">
          <div>
            <p className="font-body text-[11px] uppercase tracking-wider text-muted-foreground">Sesiones</p>
            {conPlan ? (
              <>
                <p className="font-body text-sm text-foreground mt-0.5 tabular-nums">
                  {p.sesiones_realizadas}/{p.sesiones_contratadas} realizadas · {p.sesiones_pendientes} pendientes
                </p>
                <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gold" style={{ width: `${progreso}%` }} />
                </div>
              </>
            ) : (
              <p className="font-body text-sm text-muted-foreground mt-0.5">Sin plan contratado</p>
            )}
          </div>
          <div>
            <p className="font-body text-[11px] uppercase tracking-wider text-muted-foreground">Próxima cita</p>
            <p className="font-body text-sm text-foreground mt-0.5 inline-flex items-center gap-1">
              <CalendarClock className="w-3.5 h-3.5 text-muted-foreground" />
              {p.proxima_cita
                ? new Date(p.proxima_cita).toLocaleString("es-ES", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                : "Sin cita programada"}
            </p>
          </div>
        </div>

        <div className="w-48">
          <CambiarEstado perfil={p} />
          <Revisado perfil={p} />
        </div>
      </div>
    </div>
  );
};

export default CabeceraFicha;
