import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

const MIN_CARACTERES = 8;
const campo = "w-full rounded-xl border border-border bg-card px-4 py-3 font-body text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50";

/**
 * T9.2 · Primera entrada por el enlace de la invitación (la cuenta lleva debe_elegir_contrasena): la nueva
 * administradora elige la contraseña con la que entrará en /admin/login a partir de ahora.
 */
const ElegirContrasena = ({ alTerminar }: { alTerminar: () => void }) => {
  const [contrasena, setContrasena] = useState("");
  const [repetida, setRepetida] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (contrasena.length < MIN_CARACTERES) return setError(`La contraseña necesita al menos ${MIN_CARACTERES} caracteres.`);
    if (contrasena !== repetida) return setError("Las contraseñas no coinciden.");
    setGuardando(true);
    const { error } = await supabase.auth.updateUser({ password: contrasena, data: { debe_elegir_contrasena: false } });
    setGuardando(false);
    if (error) return setError(error.message);
    alTerminar();
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <form onSubmit={guardar} className="w-full max-w-sm space-y-4">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Te damos la bienvenida</h1>
          <p className="font-body text-sm text-muted-foreground">Elige la contraseña con la que entrarás al CRM de Afín.</p>
        </div>
        <div>
          <label htmlFor="contrasena" className="block font-body text-sm text-foreground mb-1">Contraseña</label>
          <input id="contrasena" type="password" autoComplete="new-password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} className={campo} />
        </div>
        <div>
          <label htmlFor="repetida" className="block font-body text-sm text-foreground mb-1">Repite la contraseña</label>
          <input id="repetida" type="password" autoComplete="new-password" value={repetida} onChange={(e) => setRepetida(e.target.value)} className={campo} />
        </div>
        {error && <p role="alert" className="font-body text-sm text-rose-700">{error}</p>}
        <button
          type="submit"
          disabled={guardando}
          className="w-full py-3 rounded-full bg-gold text-accent-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar y entrar"}
        </button>
      </form>
    </main>
  );
};

export default ElegirContrasena;
