import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { mensajeDeFuncion } from "@/hooks/admin/mensajeDeFuncion";
import { errorContrasena } from "../../supabase/functions/_shared/acceso";

// T15.1 · El cliente crea la contraseña de su área con el enlace personal que le envía la psicóloga (?t=…).
// acceso-cliente valida el enlace y crea la cuenta; después entra con su email y esa contraseña.
async function accesoCliente<T>(body: Record<string, string>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("acceso-cliente", { body });
  if (error) {
    const sinConexion = !(error instanceof FunctionsHttpError);
    throw new Error(sinConexion ? "No se pudo conectar. Revisa tu conexión e inténtalo de nuevo." : await mensajeDeFuncion(error, "No se pudo crear tu acceso."));
  }
  return data as T;
}

const campo =
  "w-full px-5 py-3.5 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/40 font-body text-sm focus:outline-none focus:ring-2 focus:ring-gold/50";
const etiqueta = "block text-left font-body text-xs text-primary-foreground/70 mb-1.5 ml-4";

// Mismo bloque azul marino que el final de la portada (CTASection).
const Pantalla = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen bg-primary relative overflow-hidden flex flex-col">
    <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-gold/10 -translate-y-1/2 translate-x-1/2" />
    <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-gold/5 translate-y-1/2 -translate-x-1/2" />
    <header className="relative z-10 pt-8 text-center">
      <Link to="/" className="font-display text-2xl font-bold text-primary-foreground">Afín</Link>
    </header>
    <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm text-center space-y-6">{children}</div>
    </main>
  </div>
);

const Formulario = ({ token, nombre, email }: { token: string; nombre: string; email: string }) => {
  const navigate = useNavigate();
  const [contrasena, setContrasena] = useState("");
  const [repetida, setRepetida] = useState("");
  const [ver, setVer] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const problema = errorContrasena(contrasena) ?? (contrasena !== repetida ? "Las dos contraseñas no coinciden." : null);
    if (problema) return setError(problema);
    setEnviando(true);
    setError("");
    try {
      await accesoCliente({ token, accion: "activar", contrasena });
      const { error: errorEntrada } = await supabase.auth.signInWithPassword({ email, password: contrasena });
      if (errorEntrada) throw new Error("Tu contraseña está creada, pero no hemos podido entrar. Inténtalo con tu email y tu contraseña.");
      navigate("/mi-area", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear tu acceso.");
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <div>
        <label htmlFor="usuario" className={etiqueta}>Tu usuario</label>
        <input id="usuario" type="email" autoComplete="username" value={email} readOnly className={`${campo} text-primary-foreground/80`} />
      </div>
      <div>
        <label htmlFor="contrasena" className={etiqueta}>Contraseña</label>
        <div className="relative">
          <input
            id="contrasena"
            type={ver ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            value={contrasena}
            onChange={(e) => { setContrasena(e.target.value); setError(""); }}
            className={`${campo} pr-12`}
          />
          <button
            type="button"
            onClick={() => setVer(!ver)}
            aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-primary-foreground/60 hover:text-primary-foreground"
          >
            {ver ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div>
        <label htmlFor="repetida" className={etiqueta}>Repite la contraseña</label>
        <input
          id="repetida"
          type={ver ? "text" : "password"}
          autoComplete="new-password"
          value={repetida}
          onChange={(e) => { setRepetida(e.target.value); setError(""); }}
          className={campo}
        />
      </div>
      {error && <p role="alert" className="font-body text-sm text-rose-300">{error}</p>}
      <button
        type="submit"
        disabled={enviando}
        className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-full bg-gold text-accent-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        {enviando && <Loader2 className="w-4 h-4 animate-spin" />} Crear mi contraseña
      </button>
      <p className="font-body text-xs text-primary-foreground/60">
        {nombre ? `${nombre}, este` : "Este"} enlace es solo para ti y sirve una vez. Después entrarás con tu email y esta contraseña.
      </p>
    </form>
  );
};

const AccesoCliente = () => {
  const token = useSearchParams()[0].get("t") ?? "";
  const info = useQuery({
    queryKey: ["acceso-cliente", token],
    queryFn: () => accesoCliente<{ nombre: string; email: string }>({ token, accion: "info" }),
    enabled: !!token,
    retry: false,
  });

  if (!token || info.isError) {
    return (
      <Pantalla>
        <p className="text-gold font-body text-xs tracking-[0.3em] uppercase">Tu área en Afín</p>
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
      <p className="text-gold font-body text-xs tracking-[0.3em] uppercase">Tu área en Afín</p>
      <h1 className="font-display text-4xl font-bold text-primary-foreground leading-tight">
        Crea tu <em className="italic font-normal">contraseña</em>
      </h1>
      <p className="font-body text-primary-foreground/70">
        {info.data.nombre ? `Hola, ${info.data.nombre}. ` : ""}Aquí verás tus citas, tus matches y tu perfil.
      </p>
      <Formulario token={token} nombre={info.data.nombre} email={info.data.email} />
    </Pantalla>
  );
};

export default AccesoCliente;
