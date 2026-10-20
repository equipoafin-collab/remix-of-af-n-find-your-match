import { useOutletContext } from "react-router-dom";
import { es } from "date-fns/locale";
import { CalendarPlus, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { rotuloClaro } from "@/components/cliente/estilos";
import { useMisCitas } from "@/hooks/cliente/useMiArea";
import { fechaLarga, separarCitas, type Cita, type ContextoArea } from "@/lib/areaCliente";
import { descargarIcs } from "@/lib/ics";

const tarjeta = "bg-card border border-border rounded-2xl";
const nombreCita = (c: Cita) => (c.tipo === "primera" ? "Primera sesión" : "Sesión de seguimiento");
const ESTADO: Partial<Record<Cita["estado"], string>> = { realizada: "Realizada", cancelada: "Cancelada", no_asistio: "No asististe" };

const TarjetaCita = ({ cita, proxima }: { cita: Cita; proxima: boolean }) => {
  const d = new Date(cita.fecha_hora);
  const cancelada = cita.estado === "cancelada";
  return (
    <li className={`${tarjeta} p-4 flex items-center gap-4 ${proxima ? "" : "bg-muted/40"}`}>
      <div className="text-center w-11 shrink-0">
        <p className={`font-display text-2xl font-bold leading-none ${proxima ? "text-foreground" : "text-muted-foreground"}`}>{d.getDate()}</p>
        <p className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
          {d.toLocaleDateString("es-ES", { weekday: "short" })} {d.toLocaleDateString("es-ES", { month: "short" })}
        </p>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-body text-sm font-semibold text-foreground ${cancelada ? "line-through text-muted-foreground" : ""}`}>{nombreCita(cita)}</p>
        <p className="font-body text-xs text-muted-foreground">
          {d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })} · {cita.duracion_min} min · con tu psicóloga
          {ESTADO[cita.estado] && <> · <span className={cancelada ? "text-rose-700" : ""}>{ESTADO[cita.estado]}</span></>}
        </p>
      </div>
      {proxima && (
        <button
          onClick={() =>
            descargarIcs({
              uid: cita.id,
              inicio: d,
              duracionMin: cita.duracion_min,
              titulo: "Cita en Afín",
              descripcion: `${nombreCita(cita)} con tu psicóloga (${cita.duracion_min} min).`,
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

/** T17.1 · Su calendario: próximas sesiones (con .ics), el mes con los días marcados y las pasadas. */
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
            modifiers={{ proxima: dias(proximas), pasada: dias(pasadas.filter((c) => c.estado === "realizada")) }}
            modifiersClassNames={{
              proxima: "!bg-primary !text-primary-foreground font-semibold",
              pasada: "bg-gold/30 text-foreground",
            }}
          />
          <p className="font-body text-xs text-muted-foreground px-3 pb-2 flex gap-4">
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-primary" /> Próxima sesión</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-gold/30" /> Realizada</span>
          </p>
        </section>
      </div>
    </div>
  );
};

export default CalendarioCliente;
