import { useOutletContext } from "react-router-dom";
import { es } from "date-fns/locale";
import { CalendarPlus, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { botonDorado, rotuloClaro } from "@/components/cliente/estilos";
import { useMiPerfil, useMisCitas } from "@/hooks/cliente/useMiArea";
import { fechaLarga, separarCitas, type Cita, type ContextoArea, type MiAreaAbierta } from "@/lib/areaCliente";
import { CALENDLY_SESIONES, enlaceReserva, sesionesPorReservar } from "@/lib/enlaces";
import { descargarIcs } from "@/lib/ics";

const tarjeta = "bg-card border border-border rounded-2xl";
const nombreCita = (c: Cita) => (c.tipo === "match" ? `Cita con ${c.con}` : c.tipo === "primera" ? "Primera sesión" : "Sesión de seguimiento");
const hora = (d: Date) => d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
// Las de un match no tienen duración: el .ics les pone hora y media.
const DURACION_CITA_MATCH = 90;
const ESTADO: Partial<Record<Cita["estado"], string>> = { realizada: "Realizada", cancelada: "Cancelada", no_asistio: "No asististe" };

const TarjetaCita = ({ cita, proxima }: { cita: Cita; proxima: boolean }) => {
  const d = new Date(cita.fecha_hora);
  const cancelada = cita.estado === "cancelada";
  return (
    <li className={`${tarjeta} p-4 flex items-center gap-4 ${proxima ? "" : "bg-muted/40"}`}>
      <div className="text-center w-11 shrink-0">
        <p className={`font-display text-2xl font-bold leading-none ${!proxima ? "text-muted-foreground" : cita.tipo === "match" ? "text-gold-texto" : "text-foreground"}`}>{d.getDate()}</p>
        <p className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
          {d.toLocaleDateString("es-ES", { weekday: "short" })} {d.toLocaleDateString("es-ES", { month: "short" })}
        </p>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-body text-sm font-semibold text-foreground ${cancelada ? "line-through text-muted-foreground" : ""}`}>{nombreCita(cita)}</p>
        <p className="font-body text-xs text-muted-foreground">
          {cita.tipo === "match"
            ? [hora(d), cita.lugar].filter(Boolean).join(" · ")
            : `${hora(d)} · ${cita.duracion_min} min · con tu psicóloga`}
          {ESTADO[cita.estado] && <> · <span className={cancelada ? "text-rose-700" : ""}>{ESTADO[cita.estado]}</span></>}
        </p>
      </div>
      {proxima && (
        <button
          onClick={() =>
            descargarIcs({
              uid: cita.id,
              inicio: d,
              ...(cita.tipo === "match"
                ? { duracionMin: DURACION_CITA_MATCH, titulo: nombreCita(cita), descripcion: cita.lugar ? `En ${cita.lugar}.` : undefined }
                : { duracionMin: cita.duracion_min ?? 50, titulo: "Cita en Afín", descripcion: `${nombreCita(cita)} con tu psicóloga (${cita.duracion_min} min).` }),
            })
          }
          className="shrink-0 w-9 h-9 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted"
          aria-label={`Añadir a mi calendario: ${nombreCita(cita)} del ${d.toLocaleDateString("es-ES")}`}
          title="Añadir a mi calendario"
        >
          <CalendarPlus className="w-4 h-4" />
        </button>
      )}
    </li>
  );
};

/** T17.2 · Reservar en Calendly con su nombre y email puestos: solo con el enlace configurado y sesiones por reservar. */
const ReservarSesion = ({ area, programadas, userId }: { area: MiAreaAbierta; programadas: number; userId: string }) => {
  const quedan = CALENDLY_SESIONES ? sesionesPorReservar(area.sesiones_pendientes, programadas) : 0;
  const perfil = useMiPerfil(quedan ? userId : undefined);
  if (!quedan) return null;
  return (
    <div className={`${tarjeta} p-4 space-y-3`}>
      <p className="font-body text-sm text-foreground">
        {quedan === 1 ? "Te queda 1 sesión por reservar." : `Te quedan ${quedan} sesiones por reservar.`} Elige día y hora en el calendario de tu psicóloga; la verás aquí cuando te la confirme.
      </p>
      <a
        href={enlaceReserva(CALENDLY_SESIONES, perfil.data?.nombre_completo ?? area.nombre, perfil.data?.email ?? null)}
        target="_blank"
        rel="noopener noreferrer"
        className={`${botonDorado} w-full`}
      >
        Reservar sesión
      </a>
    </div>
  );
};

/** T17.1 · Su calendario: próximas sesiones y citas con sus matches (T18.2), con .ics, el mes marcado y las pasadas. */
const CalendarioCliente = () => {
  const { area, userId } = useOutletContext<ContextoArea>();
  const citas = useMisCitas(userId);

  if (citas.isPending) return <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto mt-10" aria-label="Cargando" />;
  if (citas.isError) return <p className="font-body text-sm text-rose-700 text-center mt-10">No hemos podido cargar tus citas. Vuelve a intentarlo en un momento.</p>;

  const { proximas, pasadas } = separarCitas(citas.data);
  const dias = (lista: Cita[]) => lista.map((c) => new Date(c.fecha_hora));

  return (
    <div className="space-y-4">
      <header>
        <p className={rotuloClaro}>Calendario</p>
        <h1 className="font-display text-3xl font-bold text-foreground leading-tight">Tus <em className="italic font-normal">citas</em></h1>
        {area.sesiones_contratadas > 0 && (
          <p className="font-body text-sm text-muted-foreground mt-1">
            Te {area.sesiones_pendientes === 1 ? "queda 1 sesión" : `quedan ${area.sesiones_pendientes} sesiones`} de tu plan
            {area.plan_fin ? `, hasta el ${fechaLarga(area.plan_fin)}` : ""}.
          </p>
        )}
      </header>

      <div className="space-y-4 md:grid md:grid-cols-[1fr_auto] md:gap-6 md:space-y-0 md:items-start">
        <div className="space-y-4">
          <section className="space-y-2">
            <p className={rotuloClaro}>Próximas</p>
            {proximas.length ? (
              <ul className="space-y-2">{proximas.map((c) => <TarjetaCita key={c.id} cita={c} proxima />)}</ul>
            ) : (
              <p className={`${tarjeta} p-4 font-body text-sm text-muted-foreground`}>Aún no tienes sesiones programadas. Cuando tu psicóloga te dé cita, la verás aquí.</p>
            )}
            <ReservarSesion area={area} programadas={proximas.filter((c) => c.tipo !== "match").length} userId={userId} />
          </section>
          {pasadas.length > 0 && (
            <section className="space-y-2">
              <p className={rotuloClaro}>Pasadas</p>
              <ul className="space-y-2">{pasadas.map((c) => <TarjetaCita key={c.id} cita={c} proxima={false} />)}</ul>
            </section>
          )}
        </div>

        <section className={`${tarjeta} p-2 md:order-last flex flex-col items-center`}>
          <Calendar
            locale={es}
            weekStartsOn={1}
            defaultMonth={proximas[0] ? new Date(proximas[0].fecha_hora) : undefined}
            modifiers={{
              proxima: dias(proximas.filter((c) => c.tipo !== "match")),
              match: dias(proximas.filter((c) => c.tipo === "match")),
              pasada: dias(pasadas.filter((c) => c.estado === "realizada")),
            }}
            modifiersClassNames={{
              proxima: "!bg-primary !text-primary-foreground font-semibold",
              match: "!bg-gold !text-accent-foreground font-semibold",
              pasada: "bg-gold/30 text-foreground",
            }}
          />
          <p className="font-body text-xs text-muted-foreground px-3 pb-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-primary" /> Sesión</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-gold" /> Cita con un match</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-gold/30" /> Realizada</span>
          </p>
        </section>
      </div>
    </div>
  );
};

export default CalendarioCliente;
