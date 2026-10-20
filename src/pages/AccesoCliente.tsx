import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { llamarAccesoCliente, type InfoAcceso } from "@/hooks/cliente/accesoCliente";
import CrearContrasena from "@/components/cliente/CrearContrasena";
import Pantalla from "@/components/cliente/Pantalla";
import { rotulo } from "@/components/cliente/estilos";

// T15.1 · El cliente crea la contraseña de su área con el enlace personal que le envía la psicóloga (?t=…).
// acceso-cliente valida el enlace y crea la cuenta; después entra con su email y esa contraseña.
const AccesoCliente = () => {
  const token = useSearchParams()[0].get("t") ?? "";
  const info = useQuery({
    queryKey: ["acceso-cliente", token],
    queryFn: () => llamarAccesoCliente<InfoAcceso>({ token, accion: "info" }),
    enabled: !!token,
    retry: false,
  });

  if (!token || info.isError) {
    return (
      <Pantalla>
        <p className={rotulo}>Tu área en Afín</p>
        <h1 className="font-display text-3xl font-bold text-primary-foreground">
          {token ? <>No podemos abrir <em className="italic font-normal">tu enlace</em></> : <>Necesitas tu <em className="italic font-normal">enlace personal</em></>}
        </h1>
        <p className="font-body text-primary-foreground/70">
          {token ? info.error?.message : "Para entrar por primera vez usa el enlace que te ha enviado tu psicóloga. Si no lo tienes, pídeselo."}
        </p>
      </Pantalla>
    );
  }

  if (info.isPending) {
    return (
      <Pantalla>
        <Loader2 className="w-6 h-6 animate-spin text-primary-foreground/60 mx-auto" aria-label="Cargando" />
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <p className={rotulo}>Tu área en Afín</p>
      <h1 className="font-display text-4xl font-bold text-primary-foreground leading-tight">
        Crea tu <em className="italic font-normal">contraseña</em>
      </h1>
      <p className="font-body text-primary-foreground/70">
        {info.data.nombre ? `Hola, ${info.data.nombre}. ` : ""}Aquí verás tus citas, tus matches y tu perfil.
      </p>
      <CrearContrasena
        email={info.data.email}
        activar={(contrasena) => llamarAccesoCliente({ token, accion: "activar", contrasena })}
        pie={`${info.data.nombre ? `${info.data.nombre}, este` : "Este"} enlace es solo para ti y sirve una vez. Después entrarás con tu email y esta contraseña.`}
      />
    </Pantalla>
  );
};

export default AccesoCliente;
