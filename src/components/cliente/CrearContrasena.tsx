import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { errorContrasena } from "../../../supabase/functions/_shared/acceso";
import { botonDorado, campo, etiqueta } from "./estilos";

/** Elegir la contraseña del área (con el enlace de la ficha o tras pagar), entrar y abrir /mi-area. */
const CrearContrasena = ({ email, activar, pie }: { email: string; activar: (contrasena: string) => Promise<unknown>; pie: string }) => {
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
      await activar(contrasena);
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
        className={`${botonDorado} w-full`}
      >
        {enviando && <Loader2 className="w-4 h-4 animate-spin" />} Crear mi contraseña
      </button>
      <p className="font-body text-xs text-primary-foreground/60">{pie}</p>
    </form>
  );
};

export default CrearContrasena;
