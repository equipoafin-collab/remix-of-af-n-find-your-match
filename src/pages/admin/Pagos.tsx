import { useState } from "react";
import { Plus, Trash2, ExternalLink, CreditCard } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { PlanTipo } from "@/types/admin";
import { useCrearPago, useEliminarPago, usePagos } from "@/hooks/admin/usePagos";

const PLAN_BADGE: Record<string, string> = {
  esencial: "bg-blue-50 text-blue-700 border-blue-200",
  premium: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const Pagos = () => {
  const { data: paid = [], isLoading: loading } = usePagos();
  const crearPago = useCrearPago();
  const eliminarPago = useEliminarPago();
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<"all" | "esencial" | "premium">("all");
  const [form, setForm] = useState({ nombre_completo: "", email: "", telefono: "", plan: "esencial" as PlanTipo, notas: "" });

  const add = () => {
    if (!form.nombre_completo.trim() || !form.email.trim()) {
      toast({ title: "Faltan datos", description: "Nombre y email son obligatorios", variant: "destructive" });
      return;
    }
    crearPago.mutate(
      {
        nombre_completo: form.nombre_completo.trim(),
        email: form.email.trim(),
        telefono: form.telefono.trim() || null,
        plan: form.plan,
        notas: form.notas.trim() || null,
      },
      {
        onSuccess: () => {
          setForm({ nombre_completo: "", email: "", telefono: "", plan: "esencial", notas: "" });
          setShowAdd(false);
        },
        onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
      },
    );
  };

  const del = (id: string) => {
    if (!confirm("¿Eliminar este cliente?")) return;
    eliminarPago.mutate(id, {
      onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
  };

  const filtered = paid.filter((p) => filter === "all" || p.plan === filter);

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-gold" /> Pagos / Clientes
          </h1>
          <p className="font-body text-sm text-muted-foreground mt-1">{filtered.length} clientes</p>
        </div>
        <div className="flex items-center gap-2">
          {(["all", "esencial", "premium"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-body font-medium border transition-colors ${
                filter === f ? "bg-foreground text-background border-foreground" : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {f === "all" ? "Todos" : f}
            </button>
          ))}
          <button onClick={() => setShowAdd(!showAdd)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gold text-accent-foreground text-xs font-body font-semibold">
            <Plus className="w-3.5 h-3.5" /> Nuevo cliente
          </button>
        </div>
      </header>

      {showAdd && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h3 className="font-display text-sm font-semibold">Añadir cliente</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <input placeholder="Nombre completo" value={form.nombre_completo} onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })} className="px-3 py-2 rounded-lg border border-border bg-background font-body text-sm" />
            <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="px-3 py-2 rounded-lg border border-border bg-background font-body text-sm" />
            <input placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="px-3 py-2 rounded-lg border border-border bg-background font-body text-sm" />
            <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value as PlanTipo })} className="px-3 py-2 rounded-lg border border-border bg-background font-body text-sm">
              <option value="esencial">Esencial</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          <textarea placeholder="Notas" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm resize-y" />
          <button onClick={add} disabled={crearPago.isPending} className="px-4 py-2 rounded-xl bg-foreground text-background font-body text-sm font-semibold disabled:opacity-50">Guardar</button>
        </div>
      )}

      <div className="border border-border rounded-2xl overflow-hidden bg-card">
        {loading ? (
          <p className="p-8 text-center font-body text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-muted">
                {["Cliente", "Email", "Teléfono", "Plan", "Notas", "Alta", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3 font-body text-sm text-foreground">{c.nombre_completo}</td>
                  <td className="px-4 py-3 font-body text-sm text-muted-foreground">{c.email}</td>
                  <td className="px-4 py-3 font-body text-sm text-muted-foreground">{c.telefono || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-body font-medium border ${PLAN_BADGE[c.plan]}`}>{c.plan}</span>
                  </td>
                  <td className="px-4 py-3 font-body text-xs text-muted-foreground max-w-xs truncate">{c.notas || "—"}</td>
                  <td className="px-4 py-3 font-body text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("es-ES")}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {c.plan === "esencial" && (
                        <a href="https://calendly.com/equipo-afin/30min" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs inline-flex items-center gap-1">
                          Calendly <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <button onClick={() => del(c.id)} className="text-rose-600 hover:text-rose-700" title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center font-body text-sm text-muted-foreground">No hay clientes</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Pagos;
