import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Users, Heart, CheckCircle2, ClipboardList,
  StickyNote, CreditCard, Settings, LogOut, Sparkles, ListChecks,
} from "lucide-react";

const NAV = [
  { to: "/admin", end: true, icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/perfiles", icon: Users, label: "Perfiles" },
  { to: "/admin/compatibilidades", icon: Sparkles, label: "Compatibilidades" },
  { to: "/admin/matches", icon: Heart, label: "Matches Aprobados" },
  { to: "/admin/tareas", icon: ListChecks, label: "Tareas" },
  { to: "/admin/seguimiento", icon: CheckCircle2, label: "Seguimiento" },
  { to: "/admin/notas", icon: StickyNote, label: "Notas Privadas" },
  { to: "/admin/pagos", icon: CreditCard, label: "Pagos" },
  { to: "/admin/configuracion", icon: Settings, label: "Configuración" },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/admin/login", { replace: true }); return; }
      const { data: role } = await supabase
        .from("user_roles").select("role")
        .eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
      if (!role) { await supabase.auth.signOut(); navigate("/admin/login", { replace: true }); return; }
      setChecking(false);
    })();
  }, [navigate]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  if (checking) {
    return <main className="min-h-screen bg-background flex items-center justify-center"><p className="font-body text-muted-foreground">Cargando CRM…</p></main>;
  }

  return (
    <main className="min-h-screen bg-background flex">
      <aside className="w-64 shrink-0 border-r border-border bg-card flex flex-col sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-border">
          <p className="font-display text-lg font-bold text-foreground">Afín · CRM</p>
          <p className="font-body text-xs text-muted-foreground mt-0.5">Matchmaking profesional</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-body transition-colors ${
                  isActive
                    ? "bg-gold/15 text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`
              }
            >
              <n.icon className="w-4 h-4" /> {n.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={logout}
          className="m-3 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-body text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <LogOut className="w-4 h-4" /> Salir
        </button>
      </aside>
      <section className="flex-1 min-w-0">
        <Outlet />
      </section>
    </main>
  );
};

export default AdminLayout;
