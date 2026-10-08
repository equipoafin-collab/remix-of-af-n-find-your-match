import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ElegirContrasena from "@/components/admin/ElegirContrasena";

/**
 * T9.2 · Destino del enlace de acceso que da Configuración → Administradoras. El enlace solo se gasta al pulsar
 * "Entrar" (verifyOtp), no al abrir la página: los filtros de correo que abren enlaces ya no lo invalidan.
 * Después, la persona elige su contraseña y entra en el CRM.
 */
const AccesoAdmin = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tokenHash = params.get("token_hash");
  const tipo = params.get("tipo") === "invite" ? "invite" : "recovery";
  const [estado, setEstado] = useState<"inicio" | "entrando" | "dentro">("inicio");
  const [error, setError] = useState<string | null>(null);

  const entrar = async () => {
    if (!tokenHash) return;
    setEstado("entrando");
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo });
    if (error) {
      setError("Este enlace ya se ha usado o ha caducado. Pide uno nuevo a quien te dio acceso (Configuración → Administradoras).");
      return setEstado("inicio");
    }
    setEstado("dentro");
  };

  if (estado === "dentro") return <ElegirContrasena alTerminar={() => navigate("/admin", { replace: true })} />;

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center space-y-4">
        <h1 className="font-display text-3xl font-bold text-foreground">CRM de Afín</h1>
        <p className="font-body text-sm text-muted-foreground">
          {tokenHash ? "Pulsa para entrar y elegir tu contraseña." : "Al enlace le falta el código de acceso. Cópialo entero desde el mensaje que te enviaron."}
        </p>
        {error && <p role="alert" className="font-body text-sm text-rose-700">{error}</p>}
        <button
          onClick={entrar}
          disabled={!tokenHash || estado === "entrando"}
          className="w-full py-3 rounded-full bg-gold text-accent-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {estado === "entrando" ? "Entrando…" : "Entrar"}
        </button>
      </div>
    </main>
  );
};

export default AccesoAdmin;
