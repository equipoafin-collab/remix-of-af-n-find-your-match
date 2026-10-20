import { Link, Navigate, NavLink, Outlet } from "react-router-dom";
import { CalendarDays, Heart, Home, Loader2, LogOut, User, Users, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMiArea, usePedirRenovacion, useSesion } from "@/hooks/cliente/useMiArea";
import { diasHastaFin, fechaLarga, type MiAreaCerrada } from "@/lib/areaCliente";
import Pantalla from "./Pantalla";
import { botonDorado, rotulo } from "./estilos";

const SECCIONES: { ruta: string; nombre: string; icono: LucideIcon }[] = [
  { ruta: "/mi-area", nombre: "Inicio", icono: Home },
  { ruta: "/mi-area/calendario", nombre: "Calendario", icono: CalendarDays },
  { ruta: "/mi-area/matches", nombre: "Matches", icono: Heart },
  { ruta: "/mi-area/propuestas", nombre: "Propuestas", icono: Users },
  { ruta: "/mi-area/perfil", nombre: "Perfil", icono: User },
];

const salir = () => supabase.auth.signOut();

const Cargando = () => (
  <main className="min-h-screen bg-background flex items-center justify-center">
    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" aria-label="Cargando" />
  </main>
);

const BotonSalir = () => (
  <button onClick={salir} className="font-body text-sm text-primary-foreground/60 hover:text-primary-foreground">Cerrar sesión</button>
);

/** Sin área (plan vencido sin renovar, finalizado o baja): ningún dato, solo pedir la renovación. */
const AreaCerrada = ({ area }: { area: MiAreaCerrada }) => {
  const pedir = usePedirRenovacion();
  const pedida = area.renovacion_pedida || pedir.isSuccess;
  const vencido = area.plan_fin && diasHastaFin(area.plan_fin) < 0;

  return (
    <Pantalla>
      <p className={rotulo}>Tu plan</p>
      <h1 className="font-display text-4xl font-bold text-primary-foreground leading-tight">
        Tu plan ha <em className="italic font-normal">terminado</em>
      </h1>
      <p className="font-body text-primary-foreground/70">
        {vencido ? `Terminó el ${fechaLarga(area.plan_fin as string)}. ` : ""}Tu área está cerrada hasta que renueves; tus datos siguen guardados.
      </p>
      {pedida ? (
        <p className="font-body text-primary-foreground">
          Se lo hemos dicho a tu psicóloga: te enviará el enlace de pago. Al pagar, vuelves a entrar con tu misma contraseña.
        </p>
      ) : (
        <div className="space-y-2">
          <button onClick={() => pedir.mutate()} disabled={pedir.isPending} className={`${botonDorado} w-full`}>
            {pedir.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Quiero renovar
          </button>
          {pedir.isError && <p role="alert" className="font-body text-sm text-rose-300">No se pudo enviar. Inténtalo de nuevo.</p>}
          <p className="font-body text-xs text-primary-foreground/60">Tu psicóloga te enviará el enlace de pago.</p>
        </div>
      )}
      <BotonSalir />
    </Pantalla>
  );
};

/** T15.2 · Área privada del cliente (/mi-area): solo con sesión y con el plan pagado y en vigor. */
const ClienteLayout = () => {
  const sesion = useSesion();
  const area = useMiArea(sesion?.user.id);

  if (sesion === null) return <Navigate to="/mi-area/login" replace />;
  if (sesion === undefined || area.isPending) return <Cargando />;

  if (area.isError || !area.data) {
    return (
      <Pantalla>
        <h1 className="font-display text-3xl font-bold text-primary-foreground">
          {area.isError ? <>No hemos podido abrir <em className="italic font-normal">tu área</em></> : <>Esta cuenta no tiene <em className="italic font-normal">área</em></>}
        </h1>
        <p className="font-body text-primary-foreground/70">
          {area.isError ? "Revisa tu conexión y vuelve a intentarlo." : "Has entrado con una cuenta que no es de cliente. Cierra la sesión y entra con la tuya."}
        </p>
        {area.isError && <button onClick={() => area.refetch()} className={`${botonDorado} w-full`}>Reintentar</button>}
        <BotonSalir />
      </Pantalla>
    );
  }

  const datos = area.data;
  if (datos.con_area === false) return <AreaCerrada area={datos} />; // sin strictNullChecks, `!` no estrecha la unión

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-6">
          <Link to="/mi-area" className="font-display text-xl font-bold text-foreground">Afín</Link>
          <nav className="hidden md:flex items-center gap-5 flex-1" aria-label="Secciones">
            {SECCIONES.map(({ ruta, nombre }) => (
              <NavLink
                key={ruta}
                to={ruta}
                end
                className={({ isActive }) => `font-body text-sm ${isActive ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                {nombre}
              </NavLink>
            ))}
          </nav>
          <button onClick={salir} className="ml-auto inline-flex items-center gap-1 font-body text-sm text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-5 pb-28 md:pb-10">
        <Outlet context={datos} />
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t border-border pb-[env(safe-area-inset-bottom)]" aria-label="Secciones">
        <ul className="grid grid-cols-5">
          {SECCIONES.map(({ ruta, nombre, icono: Icono }) => (
            <li key={ruta}>
              <NavLink
                to={ruta}
                end
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-2 font-body text-[11px] ${isActive ? "text-foreground font-semibold" : "text-muted-foreground"}`
                }
              >
                <Icono className="w-5 h-5" aria-hidden="true" />
                {nombre}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default ClienteLayout;
