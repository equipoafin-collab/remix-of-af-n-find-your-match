import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Plus, Trash2, ExternalLink, CreditCard, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Perfil, PlanTipo } from "@/types/admin";
import { useActualizarPago, useCrearPago, useEliminarPago, usePagos } from "@/hooks/admin/usePagos";
import { PlanBadge } from "@/components/admin/Badges";
import BuscadorPerfil from "@/components/admin/BuscadorPerfil";

const formVacio = () => ({
  perfil: null as Perfil | null,
  plan: "esencial" as PlanTipo,
  importe: "",
  fecha: format(new Date(), "yyyy-MM-dd"),
  notas: "",
});

const euros = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

const Pagos = () => {
  const { data: paid = [], isLoading: loading } = usePagos();
  const crearPago = useCrearPago();
  const actualizarPago = useActualizarPago();
  const eliminarPago = useEliminarPago();
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<"all" | "esencial" | "premium">("all");
  const [form, setForm] = useState(formVacio);
  const [vinculando, setVinculando] = useState<string | null>(null);

  const onError = (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" });

  const add = () => {
    const { perfil } = form;
    if (!perfil) {
      toast({ title: "Falta el perfil", description: "Elige a qué perfil corresponde el pago", variant: "destructive" });
      return;
    }
    crearPago.mutate(
      {
        perfil_id: perfil.id,
        nombre_completo: perfil.nombre_completo,
        email: perfil.email ?? "",
        telefono: perfil.telefono,
        plan: form.plan,
        importe: form.importe ? Number(form.importe) : null,
        fecha: form.fecha,
        notas: form.notas.trim() || null,
      },
      {
        onSuccess: () => {
          setForm(formVacio());
          setShowAdd(false);
        },
        onError,
      },
    );
  };

  const vincular = (pagoId: string, perfil: Perfil) =>
    actualizarPago.mutate({ id: pagoId, cambios: { perfil_id: perfil.id } }, { onSuccess: () => setVinculando(null), onError });

  const del = (id: string) => {
    if (!confirm("¿Eliminar este pago?")) return;
    eliminarPago.mutate(id, {
      onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
  };

  const filtered = paid.filter((p) => filter === "all" || p.plan === filter);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-gold" /> Pagos
          </h1>
          <p className="font-body text-sm text-muted-foreground mt-1">{filtered.length} pagos</p>
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
            <Plus className="w-3.5 h-3.5" /> Nuevo pago
          </button>
        </div>
      </header>

      {showAdd && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h3 className="font-display text-sm font-semibold">Registrar pago</h3>
          {form.perfil ? (
            <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-border bg-background">
              <p className="font-body text-sm">
                {form.perfil.nombre_completo} <span className="text-xs text-muted-foreground">{form.perfil.email}</span>
              </p>
              <button onClick={() => setForm({ ...form, perfil: null })} className="text-muted-foreground hover:text-foreground" title="Cambiar perfil">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <BuscadorPerfil onSelect={(perfil) => setForm({ ...form, perfil, plan: perfil.plan ?? form.plan })} />
          )}
          <div className="grid sm:grid-cols-3 gap-3">
            <select aria-label="Plan" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value as PlanTipo })} className="px-3 py-2 rounded-lg border border-border bg-background font-body text-sm">
              <option value="esencial">Esencial</option>
              <option value="premium">Premium</option>
            </select>
            <input aria-label="Importe (€)" type="number" min="0" step="0.01" placeholder="Importe (€)" value={form.importe} onChange={(e) => setForm({ ...form, importe: e.target.value })} className="px-3 py-2 rounded-lg border border-border bg-background font-body text-sm" />
            <input aria-label="Fecha del pago" type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="px-3 py-2 rounded-lg border border-border bg-background font-body text-sm" />
          </div>
          <textarea aria-label="Notas" placeholder="Notas" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm resize-y" />
          <button onClick={add} disabled={crearPago.isPending} className="px-4 py-2 rounded-xl bg-foreground text-background font-body text-sm font-semibold disabled:opacity-50">Guardar</button>
        </div>
      )}

      <div className="border border-border rounded-2xl overflow-x-auto bg-card">
        {loading ? (
          <p className="p-8 text-center font-body text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-muted">
                {["Cliente", "Email", "Plan", "Importe", "Fecha", "Notas", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3 font-body text-sm text-foreground">
                    {c.perfil_id ? (
                      <Link to={`/admin/perfiles/${c.perfil_id}`} className="text-gold-texto hover:underline font-medium">{c.nombre_completo}</Link>
                    ) : vinculando === c.id ? (
                      <BuscadorPerfil onSelect={(perfil) => vincular(c.id, perfil)} />
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        {c.nombre_completo}
                        <button onClick={() => setVinculando(c.id)} className="px-2 py-0.5 rounded-full text-xs font-body font-medium border bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100">
                          Sin perfil · Vincular
                        </button>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-muted-foreground">{c.email}</td>
                  <td className="px-4 py-3"><PlanBadge plan={c.plan} /></td>
                  <td className="px-4 py-3 font-body text-sm text-muted-foreground tabular-nums">{c.importe != null ? euros(c.importe) : "—"}</td>
                  <td className="px-4 py-3 font-body text-xs text-muted-foreground">{new Date(c.fecha).toLocaleDateString("es-ES")}</td>
                  <td className="px-4 py-3 font-body text-xs text-muted-foreground max-w-xs truncate">{c.notas || "—"}</td>
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
                <tr><td colSpan={7} className="p-8 text-center font-body text-sm text-muted-foreground">No hay pagos</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Pagos;
