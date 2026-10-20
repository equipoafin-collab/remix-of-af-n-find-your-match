import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/hooks/cliente/useMiArea";
import Pantalla from "@/components/cliente/Pantalla";
import { botonDorado, campo, etiqueta, rotulo } from "@/components/cliente/estilos";

/** T15.2 · Entrada al área del cliente con su email y la contraseña que eligió con su enlace (T15.1). */
const LoginCliente = () => {
  const sesion = useSesion();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [ver, setVer] = useState(false);
  const [olvidada, setOlvidada] = useState(false);
  const [error, setError] = useState("");
  const [entrando, setEntrando] = useState(false);

  if (sesion) return <Navigate to="/mi-area" replace />;

  const entrar = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !contrasena) return setError("Escribe tu email y tu contraseña.");
    setEntrando(true);
    setError("");
    const { error: errorEntrada } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: contrasena });
    if (errorEntrada) {
      setError(errorEntrada.code === "invalid_credentials" ? "El email o la contraseña no son correctos." : "No se pudo entrar. Inténtalo de nuevo en unos minutos.");
      setEntrando(false);
      return;
    }
    navigate("/mi-area", { replace: true });
  };

  return (
    <Pantalla>
      <p className={rotulo}>Tu área en Afín</p>
      <h1 className="font-display text-4xl font-bold text-primary-foreground leading-tight">
        Entra en tu <em className="italic font-normal">área</em>
      </h1>
      <form onSubmit={entrar} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className={etiqueta}>Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            className={campo}
          />
        </div>
        <div>
          <label htmlFor="contrasena" className={etiqueta}>Contraseña</label>
          <div className="relative">
            <input
              id="contrasena"
              type={ver ? "text" : "password"}
              autoComplete="current-password"
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
        {error && <p role="alert" className="font-body text-sm text-rose-300">{error}</p>}
        <button type="submit" disabled={entrando} className={`${botonDorado} w-full`}>
          {entrando && <Loader2 className="w-4 h-4 animate-spin" />} Entrar
        </button>
      </form>
      <div className="space-y-2">
        <button type="button" onClick={() => setOlvidada(!olvidada)} className="font-body text-sm text-gold hover:underline">
          ¿Has olvidado tu contraseña?
        </button>
        {olvidada && (
          <p className="font-body text-sm text-primary-foreground/70">
            Pide un enlace nuevo a tu psicóloga: con él eliges otra contraseña y vuelves a entrar.
          </p>
        )}
      </div>
    </Pantalla>
  );
};

export default LoginCliente;
