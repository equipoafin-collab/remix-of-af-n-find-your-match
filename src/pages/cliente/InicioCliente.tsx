import { useOutletContext } from "react-router-dom";
import { CalendarClock, Loader2 } from "lucide-react";
import { usePedirRenovacion } from "@/hooks/cliente/useMiArea";
import { avisarFinPlan, cuandoCita, fechaLarga, type MiAreaAbierta } from "@/lib/areaCliente";
import { botonDorado, rotulo, rotuloClaro } from "@/components/cliente/estilos";

const tarjeta = "bg-card border border-border rounded-2xl p-4";

/** Aviso de fin de plan, desde 15 días antes, con "Quiero renovar". */
const FinDelPlan = ({ area }: { area: MiAreaAbierta }) => {
  const pedir = usePedirRenovacion();
  const pedida = area.renovacion_pedida || pedir.isSuccess;
  return (
    <section className="rounded-2xl border border-gold bg-cream/60 p-4 space-y-2">
      <p className="font-display text-lg font-bold text-foreground">Tu plan termina el {fechaLarga(area.plan_fin as string)}</p>
      {pedida ? (
        <p className="font-body text-sm text-muted-foreground">Se lo hemos dicho a tu psicóloga: te enviará el enlace de pago para renovarlo.</p>
      ) : (
        <>
          <p className="font-body text-sm text-muted-foreground">Si quieres seguir, tu psicóloga te enviará el enlace de pago. Después perderás el acceso a tu área.</p>
          <button onClick={() => pedir.mutate()} disabled={pedir.isPending} className={botonDorado}>
            {pedir.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Quiero renovar
          </button>
          {pedir.isError && <p role="alert" className="font-body text-sm text-rose-700">No se pudo enviar. Inténtalo de nuevo.</p>}
        </>
      )}
    </section>
  );
};

/** T15.2 · Inicio del área: saludo, próxima sesión, sesiones que quedan y fin del plan. */
const InicioCliente = () => {
  const area = useOutletContext<MiAreaAbierta>();
  const cita = area.proxima_sesion;

  return (
    <div className="space-y-4">
      <section className="bg-primary rounded-3xl px-5 py-7 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-gold/10 -translate-y-1/2 translate-x-1/3" />
        <p className={`${rotulo} relative`}>Tu área privada</p>
        <h1 className="relative mt-2 font-display text-4xl font-bold text-primary-foreground leading-tight">
          Hola{area.nombre ? <>, <em className="italic font-normal">{area.nombre}</em></> : ""}
        </h1>
        <p className="relative mt-2 font-body text-primary-foreground/70">
          Aquí tienes tus citas, tus matches y tu perfil.
        </p>
      </section>

      {avisarFinPlan(area.plan_fin) && <FinDelPlan area={area} />}

      <div className="grid grid-cols-2 gap-3">
        <section className={tarjeta}>
          <p className={rotuloClaro}>Sesiones que quedan</p>
          <p className="mt-1 font-display text-3xl font-bold text-foreground">{area.sesiones_pendientes}</p>
          <p className="font-body text-xs text-muted-foreground">de {area.sesiones_contratadas} contratadas</p>
        </section>
        <section className={tarjeta}>
          <p className={rotuloClaro}>Plan {area.plan === "premium" ? "Premium" : "Esencial"}</p>
          {area.plan_fin ? (
            <>
              <p className="mt-1 font-display text-xl font-bold text-foreground">{fechaLarga(area.plan_fin)}</p>
              <p className="font-body text-xs text-muted-foreground">fin del plan</p>
            </>
          ) : (
            <p className="mt-1 font-display text-xl font-bold text-foreground">En curso</p>
          )}
        </section>
      </div>

      <section className={`${tarjeta} flex items-center gap-3`}>
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <CalendarClock className="w-5 h-5 text-foreground" aria-hidden="true" />
        </div>
        {cita ? (
          <div>
            <p className="font-body text-sm font-semibold text-foreground">
              {cita.tipo === "primera" ? "Primera sesión" : "Sesión de seguimiento"} con tu psicóloga
            </p>
            <p className="font-body text-sm text-muted-foreground first-letter:uppercase">
              {cuandoCita(cita.fecha_hora)} · {cita.duracion_min} min
            </p>
          </div>
        ) : (
          <div>
            <p className="font-body text-sm font-semibold text-foreground">Sin sesiones programadas</p>
            <p className="font-body text-sm text-muted-foreground">Cuando tu psicóloga te dé cita, la verás aquí.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default InicioCliente;
