import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bell } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";
import { useAlertas, type FiltrosAlertas } from "@/hooks/admin/useAlertas";
import { ListaAlertas } from "@/components/admin/alertas/ListaAlertas";
import { SEVERIDAD_ALERTA, TIPO_ALERTA } from "@/lib/alertas";
import { valorDeUrl } from "@/lib/dashboard";
import type { AlertaSeveridad, AlertaTipo } from "@/types/admin";

const selector = "px-3 py-2 rounded-lg border border-border bg-background font-body text-sm";

// T7.1 · Todas las alertas, urgentes primero.
const Alertas = () => {
  const [estado, setEstado] = useState<FiltrosAlertas["estado"]>("pendientes");
  // Los enlaces del Dashboard llegan con ?severidad= o ?tipo=.
  const [params] = useSearchParams();
  const [severidad, setSeveridad] = useState<AlertaSeveridad | "">(() => valorDeUrl(params, "severidad", Constants.public.Enums.alerta_severidad) ?? "");
  const [tipo, setTipo] = useState<AlertaTipo | "">(() => valorDeUrl(params, "tipo", Constants.public.Enums.alerta_tipo) ?? "");
  const { data: alertas = [], isLoading, error } = useAlertas({ estado, severidad: severidad || undefined, tipo: tipo || undefined });
  const urgentes = alertas.filter((a) => a.severidad === "urgente" && a.estado !== "resuelta").length;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-2"><Bell className="w-7 h-7 text-gold" /> Alertas</h1>
        <p className="font-body text-sm text-muted-foreground mt-1">
          {alertas.length} {estado === "resuelta" ? "resuelta" : estado === "pendientes" ? "pendiente" : "alerta"}{alertas.length === 1 ? "" : "s"}
          {urgentes > 0 && <span className="text-rose-700 font-semibold"> · {urgentes} urgente{urgentes === 1 ? "" : "s"}</span>}
        </p>
      </div>

      <section className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-5 flex gap-3 flex-wrap border-b border-border">
          <select aria-label="Estado de las alertas" value={estado ?? ""} onChange={(e) => setEstado((e.target.value || undefined) as FiltrosAlertas["estado"])} className={selector}>
            <option value="pendientes">Pendientes</option>
            <option value="resuelta">Resueltas</option>
            <option value="">Todas</option>
          </select>
          <select aria-label="Severidad" value={severidad} onChange={(e) => setSeveridad(e.target.value as AlertaSeveridad | "")} className={selector}>
            <option value="">Cualquier severidad</option>
            {Constants.public.Enums.alerta_severidad.map((s) => <option key={s} value={s}>{SEVERIDAD_ALERTA[s].label}</option>)}
          </select>
          <select aria-label="Tipo de alerta" value={tipo} onChange={(e) => setTipo(e.target.value as AlertaTipo | "")} className={selector}>
            <option value="">Todos los tipos</option>
            {Constants.public.Enums.alerta_tipo.map((t) => <option key={t} value={t}>{TIPO_ALERTA[t]}</option>)}
          </select>
        </div>
        {error ? (
          <p className="px-5 py-4 font-body text-sm text-rose-700">No se pudieron cargar las alertas: {error.message}</p>
        ) : isLoading ? (
          <p className="px-5 py-4 font-body text-sm text-muted-foreground">Cargando alertas…</p>
        ) : (
          <ListaAlertas alertas={alertas} mostrarCliente vacio="No hay alertas con estos filtros." />
        )}
      </section>
    </div>
  );
};

export default Alertas;
