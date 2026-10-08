import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // If already logged in as admin, redirect
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (data) navigate("/admin", { replace: true });
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast({ title: "Introduce email y contraseña", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      toast({ title: "Error de acceso", description: "Credenciales incorrectas", variant: "destructive" });
      setLoading(false);
      return;
    }
    // Check admin role
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "Error de sesión", variant: "destructive" });
      setLoading(false);
      return;
    }
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      await supabase.auth.signOut();
      toast({ title: "Acceso denegado", description: "No tienes permisos de administrador", variant: "destructive" });
      setLoading(false);
      return;
    }
    navigate("/admin", { replace: true });
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl font-bold text-foreground text-center mb-2">
          Panel de Administración
        </h1>
        <p className="font-body text-sm text-muted-foreground text-center mb-8">
          Acceso restringido
        </p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block font-body text-sm text-foreground mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 font-body text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
              placeholder="admin@afin.es"
            />
          </div>
          <div>
            <label className="block font-body text-sm text-foreground mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 font-body text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-gold text-accent-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Accediendo..." : "Entrar"}
          </button>
        </form>
        <p className="font-body text-xs text-muted-foreground text-center mt-6">
          ¿Primera vez o has olvidado la contraseña? Pide un enlace de acceso a otra administradora (Configuración → Administradoras).
        </p>
      </div>
    </main>
  );
};

export default AdminLogin;
