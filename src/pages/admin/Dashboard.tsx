import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, UserCheck, Clock, TrendingUp, Heart, CreditCard, Sparkles, ArrowRight,
} from "lucide-react";

interface Counts {
  total: number;
  activos: number;
  pendientes: number;
  ultimos30: number;
  pagos: number;
  leads: number;
}

const StatCard = ({ icon: Icon, label, value, hint, color = "text-foreground" }: any) => (
  <div className="bg-card border border-border rounded-2xl p-5">
    <div className="flex items-center justify-between mb-2">
      <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <Icon className="w-4 h-4 text-muted-foreground" />
    </div>
    <p className={`font-display text-3xl font-bold ${color}`}>{value}</p>
    {hint && <p className="font-body text-xs text-muted-foreground mt-1">{hint}</p>}
  </div>
);

const AdminDashboardHome = () => {
  const [counts, setCounts] = useState<Counts>({ total: 0, activos: 0, pendientes: 0, ultimos30: 0, pagos: 0, leads: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [{ data: perfiles }, paid, leads] = await Promise.all([
        supabase.from("perfiles").select("id,estado_perfil,created_at"),
        supabase.from("paid_users").select("id", { count: "exact", head: true }),
        supabase.from("disc_results").select("id", { count: "exact", head: true }),
      ]);
      const all = perfiles || [];
      setCounts({
        total: all.length,
        activos: all.filter((p: any) => (p.estado_perfil || "activo") === "activo").length,
        pendientes: all.filter((p: any) => p.estado_perfil === "pendiente").length,
        ultimos30: all.filter((p: any) => p.created_at >= since).length,
        pagos: paid.count || 0,
        leads: leads.count || 0,
      });
      setLoading(false);
    })();
  }, []);

  const conversion = counts.leads > 0 ? Math.round((counts.pagos / counts.leads) * 100) : 0;

  return (
    <div className="p-8 space-y-8">
      <header>
        <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="font-body text-sm text-muted-foreground mt-1">Vista general del CRM de matchmaking</p>
      </header>

      {loading ? (
        <p className="font-body text-sm text-muted-foreground">Cargando métricas…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Usuarios registrados" value={counts.total} />
            <StatCard icon={UserCheck} label="Perfiles activos" value={counts.activos} color="text-emerald-600" />
            <StatCard icon={Clock} label="Pendientes de revisión" value={counts.pendientes} color="text-amber-600" />
            <StatCard icon={TrendingUp} label="Nuevos (30 días)" value={counts.ultimos30} hint="Altas recientes" />
            <StatCard icon={Sparkles} label="Matches sugeridos" value="—" hint="Disponible al abrir un perfil" />
            <StatCard icon={Heart} label="Matches aprobados" value={0} hint="Próximamente (Fase 2)" />
            <StatCard icon={CreditCard} label="Pagos realizados" value={counts.pagos} />
            <StatCard icon={TrendingUp} label="Conversión embudo" value={`${conversion}%`} hint={`${counts.pagos}/${counts.leads} leads → pago`} />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Link to="/admin/perfiles" className="group bg-card border border-border rounded-2xl p-6 hover:border-gold transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display font-semibold text-foreground">Ver todos los perfiles</p>
                  <p className="font-body text-sm text-muted-foreground mt-1">Filtra, busca y abre fichas completas</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-gold group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
            <Link to="/admin/pagos" className="group bg-card border border-border rounded-2xl p-6 hover:border-gold transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display font-semibold text-foreground">Gestionar clientes de pago</p>
                  <p className="font-body text-sm text-muted-foreground mt-1">{counts.pagos} clientes activos</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-gold group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboardHome;
