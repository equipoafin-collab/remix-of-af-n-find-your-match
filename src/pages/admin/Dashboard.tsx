import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  UserCheck, CalendarDays, TrendingUp, Crown, HeartHandshake, FileText, MessageSquare, Hourglass, PauseCircle, UserX,
  Sparkles, AlertTriangle, CalendarClock, ListChecks, Bell, ArrowRight, Heart, type LucideIcon,
} from "lucide-react";
import { useAgendaHoy, useDashboardResumen, useSinRevisar, type DashboardResumen } from "@/hooks/admin/useDashboard";
import { useAlertas } from "@/hooks/admin/useAlertas";
import { useTareas } from "@/hooks/admin/useTareas";
import { usePagos } from "@/hooks/admin/usePagos";
import { useConteoDisc } from "@/hooks/admin/useConteoDisc";
import { SIN_REVISAR } from "@/hooks/admin/useClientes";
import { ListaAlertas } from "@/components/admin/alertas/ListaAlertas";
import { ListaTareas } from "@/components/admin/tareas/ListaTareas";

// T8.2 · Dashboard: los indicadores del PDF (dashboard_resumen, T8.1), cada uno enlazado a su listado filtrado
// con las mismas condiciones, y la agenda, alertas, tareas y perfiles compatibles del día.

const SEMANA_MS = 7 * 86_400_000;
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

interface Kpi {
  label: string;
  valor: number;
  icon: LucideIcon;
  to: string;          // listado filtrado, o "#…" para una sección de esta página
  hint?: string;
  tono?: "aviso" | "urgente";
}

const kpis = (r: DashboardResumen): Kpi[] => [
  { label: "Clientes activos", valor: r.clientes_activos, icon: UserCheck, to: "/admin/perfiles?plan=clientes&estado=activo" },
  { label: "Sesiones de hoy", valor: r.sesiones_hoy, icon: CalendarDays, to: "#agenda",
    hint: r.citas_hoy ? `y ${plural(r.citas_hoy, "cita", "citas")} de matches` : "Ver la agenda" },
  { label: "Nuevos clientes", valor: r.nuevos_clientes, icon: TrendingUp, to: "/admin/perfiles?situacion=nuevos", hint: "Últimos 30 días" },
  { label: "Clientes Premium", valor: r.premium, icon: Crown, to: "/admin/perfiles?plan=premium&estado=activo", hint: "Activos" },
  { label: "Pendientes de matching", valor: r.pendientes_matching, icon: HeartHandshake, to: "/admin/perfiles?situacion=sin_match",
    hint: "Activos sin match abierto" },
  { label: "Informes Premium pendientes", valor: r.informes_pendientes, icon: FileText, to: "/admin/tareas?tipo=enviar_informe", tono: "aviso" },
  { label: "Feedbacks pendientes", valor: r.feedbacks_pendientes, icon: MessageSquare, to: "/admin/tareas?tipo=registrar_feedback",
    hint: "Tras la cita", tono: "aviso" },
  { label: "Pocas sesiones", valor: r.pocas_sesiones, icon: Hourglass, to: "/admin/perfiles?situacion=pocas_sesiones",
    hint: `${r.umbral_pocas_sesiones} o menos pendientes`, tono: "aviso" },
  { label: "Pausados", valor: r.pausados, icon: PauseCircle, to: "/admin/perfiles?plan=clientes&estado=pausado" },
  { label: "De baja", valor: r.bajas, icon: UserX, to: "/admin/perfiles?plan=clientes&estado=baja" },
  { label: "Nuevos compatibles (IA)", valor: r.nuevos_compatibles, icon: Sparkles, to: "#compatibles", hint: "7 días, sin decidir" },
  { label: "Alertas urgentes", valor: r.alertas_urgentes, icon: AlertTriangle, to: "/admin/alertas?severidad=urgente", tono: "urgente" },
];

const TarjetaKpi = ({ kpi }: { kpi: Kpi }) => {
  const color = kpi.valor > 0 && kpi.tono === "urgente" ? "text-rose-600"
    : kpi.valor > 0 && kpi.tono === "aviso" ? "text-amber-600" : "text-foreground";
  const clase = "group block bg-card border border-border rounded-2xl p-5 hover:border-gold transition-colors";
  const contenido = (
    <>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
        <kpi.icon className="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-gold-texto transition-colors" />
      </div>
      <p className={`font-display text-3xl font-bold tabular-nums ${color}`}>{kpi.valor}</p>
      {kpi.hint && <p className="font-body text-xs text-muted-foreground mt-1">{kpi.hint}</p>}
    </>
  );
  return kpi.to.startsWith("#")
    ? <a href={kpi.to} className={clase}>{contenido}</a>
    : <Link to={kpi.to} className={clase}>{contenido}</Link>;
};

const Panel = ({ id, titulo, icon: Icon, enlace, children }: {
  id?: string; titulo: string; icon: LucideIcon; enlace?: { to: string; texto: string }; children: ReactNode;
}) => (
  <section id={id} className="bg-card border border-border rounded-2xl overflow-hidden scroll-mt-4">
    <div className="px-5 py-4 flex items-center justify-between gap-3 border-b border-border">
      <h2 className="font-display font-semibold text-foreground flex items-center gap-2"><Icon className="w-4 h-4 text-gold" /> {titulo}</h2>
      {enlace && (
        <Link to={enlace.to} className="font-body text-xs text-gold-texto hover:underline inline-flex items-center gap-1">
          {enlace.texto} <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
    {children}
  </section>
);

/** Cargando, error o lista vacía; null cuando hay datos que pintar. */
const EstadoCarga = ({ isLoading, error, vacio }: { isLoading: boolean; error: Error | null; vacio: string | false }) =>
  error ? <p className="px-5 py-4 font-body text-sm text-rose-700">No se pudo cargar: {error.message}</p>
    : isLoading ? <p className="px-5 py-4 font-body text-sm text-muted-foreground">Cargando…</p>
      : vacio ? <p className="px-5 py-4 font-body text-sm text-muted-foreground">{vacio}</p>
        : null;

const ESTADO_AGENDA: Record<string, string> = { realizada: "Realizada", no_asistio: "No asistió", cita_realizada: "Hecha" };
const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

const AgendaHoy = () => {
  const { data: eventos = [], isLoading, error } = useAgendaHoy();
  return (
    <Panel id="agenda" titulo="Agenda de hoy" icon={CalendarClock}>
      <EstadoCarga isLoading={isLoading} error={error} vacio={!eventos.length && "Nada programado para hoy."} />
      <ul>
        {eventos.map((e) => (
          <li key={e.id} className="px-5 py-3 border-t border-border first:border-t-0 flex items-start gap-4">
            <span className="font-body text-sm font-semibold text-foreground tabular-nums w-12 shrink-0">{hora(e.hora)}</span>
            <div className="flex-1 min-w-0">
              <p className="font-body text-sm text-foreground">
                {e.personas.map((p, i) => (
                  <Fragment key={p.id}>
                    {i > 0 && " y "}
                    <Link to={`/admin/perfiles/${p.id}?tab=${e.cita ? "matches" : "sesiones"}`} className="hover:text-gold-texto hover:underline">
                      {p.nombre_completo}
                    </Link>
                  </Fragment>
                ))}
              </p>
              <p className="font-body text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1.5">
                {e.cita ? <Heart className="w-3 h-3" /> : <CalendarDays className="w-3 h-3" />}
                {e.detalle}
                {ESTADO_AGENDA[e.estado] && ` · ${ESTADO_AGENDA[e.estado]}`}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
};

const MAX_FILAS = 6;

const AlertasImportantes = () => {
  const { data: alertas = [], isLoading, error } = useAlertas({ estado: "pendientes" });
  // Urgentes primero (ya vienen así); los perfiles compatibles (info) tienen su propio bloque.
  const importantes = alertas.filter((a) => a.severidad !== "info");
  return (
    <Panel titulo="Alertas importantes" icon={Bell} enlace={{ to: "/admin/alertas", texto: importantes.length > MAX_FILAS ? `Ver las ${importantes.length}` : "Ver todas" }}>
      <EstadoCarga isLoading={isLoading} error={error} vacio={false} />
      {!isLoading && !error && <ListaAlertas alertas={importantes.slice(0, MAX_FILAS)} mostrarCliente vacio="Ninguna alerta urgente ni aviso pendiente." />}
    </Panel>
  );
};

const TareasPendientes = () => {
  // Pendientes ordenadas por vencimiento: las vencidas salen primero.
  const { data: tareas = [], isLoading, error } = useTareas({ estado: "pendiente" });
  return (
    <Panel titulo="Tareas pendientes" icon={ListChecks} enlace={{ to: "/admin/tareas", texto: tareas.length > MAX_FILAS ? `Ver las ${tareas.length}` : "Ver todas" }}>
      <EstadoCarga isLoading={isLoading} error={error} vacio={false} />
      {!isLoading && !error && <div className="-mt-px"><ListaTareas tareas={tareas.slice(0, MAX_FILAS)} mostrarCliente vacio="No hay tareas pendientes." /></div>}
    </Panel>
  );
};

const NuevosCompatibles = () => {
  const { data: alertas = [], isLoading, error } = useAlertas({ tipo: "nuevo_compatible", estado: "pendientes" });
  // Lo mismo que cuenta dashboard_resumen: detectados en 7 días y aún sin decidir.
  const recientes = alertas.filter((a) => Date.now() - Date.parse(a.created_at) <= SEMANA_MS);
  return (
    <Panel id="compatibles" titulo="Nuevos perfiles compatibles detectados por la IA" icon={Sparkles}>
      <EstadoCarga isLoading={isLoading} error={error} vacio={!recientes.length && "Ningún perfil nuevo muy compatible en los últimos 7 días."} />
      <ul>
        {recientes.map((a) => (
          <li key={a.id} className="px-5 py-3 border-t border-border first:border-t-0 flex items-start gap-3">
            <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-gold" />
            <div className="flex-1 min-w-0">
              <p className="font-body text-sm text-foreground">{a.mensaje}</p>
              <p className="font-body text-xs text-muted-foreground mt-0.5">
                {new Date(a.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
              </p>
            </div>
            {a.perfil_id && (
              <Link to={`/admin/perfiles/${a.perfil_id}?tab=sugerencias`} className="shrink-0 font-body text-xs text-gold-texto hover:underline inline-flex items-center gap-1">
                Ver sugerencia <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
};

const Captacion = () => {
  const sinRevisar = useSinRevisar();
  const pagos = usePagos();
  const discs = useConteoDisc();
  const nPagos = pagos.data?.length ?? 0;
  const leads = discs.data ?? 0;
  return (
    <p className="font-body text-sm text-muted-foreground flex flex-wrap gap-x-6 gap-y-1">
      <Link to={`/admin/perfiles?estado=${encodeURIComponent(SIN_REVISAR)}`} className="hover:text-foreground">
        Perfiles sin revisar: <strong className="text-foreground">{sinRevisar.data ?? "…"}</strong>
      </Link>
      <Link to="/admin/pagos" className="hover:text-foreground">Pagos registrados: <strong className="text-foreground">{nPagos}</strong></Link>
      <span>Conversión test DISC → pago: <strong className="text-foreground">{leads > 0 ? Math.round((nPagos / leads) * 100) : 0} %</strong></span>
    </p>
  );
};

const AdminDashboardHome = () => {
  const { data: resumen, isLoading, error } = useDashboardResumen();
  const hoy = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="font-body text-sm text-muted-foreground mt-1 first-letter:uppercase">{hoy}</p>
        </div>
        <Captacion />
      </header>

      {error ? (
        <p className="font-body text-sm text-rose-700">No se pudieron cargar los indicadores: {error.message}</p>
      ) : isLoading || !resumen ? (
        <p className="font-body text-sm text-muted-foreground">Cargando indicadores…</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {kpis(resumen).map((k) => <TarjetaKpi key={k.label} kpi={k} />)}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <AgendaHoy />
        <AlertasImportantes />
        <TareasPendientes />
        <NuevosCompatibles />
      </div>
    </div>
  );
};

export default AdminDashboardHome;
