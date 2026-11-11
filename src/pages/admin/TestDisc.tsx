import { useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { useLeadsDisc } from "@/hooks/admin/useLeadsDisc";
import { DISC_META, type DiscType } from "@/lib/disc";

const estilo = (letra: string) => DISC_META[letra as DiscType]?.title ?? letra;

/** T10.5 · Leads del test DISC (`/quiz`): quién lo ha hecho y si ya tiene ficha. */
const TestDisc = () => {
  const { data: tests = [], isLoading, isError } = useLeadsDisc();
  const [soloSinFicha, setSoloSinFicha] = useState(false);

  const sinFicha = tests.filter((t) => !t.ficha).length;
  const filtrados = soloSinFicha ? tests.filter((t) => !t.ficha) : tests;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-gold" /> Test DISC
          </h1>
          <p className="font-body text-sm text-muted-foreground mt-1">
            {tests.length} tests · {sinFicha} sin ficha
          </p>
        </div>
        <div className="flex items-center gap-2">
          {([false, true] as const).map((f) => (
            <button
              key={String(f)}
              onClick={() => setSoloSinFicha(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-body font-medium border transition-colors ${
                soloSinFicha === f ? "bg-foreground text-background border-foreground" : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {f ? "Sin ficha" : "Todos"}
            </button>
          ))}
        </div>
      </header>

      <div className="border border-border rounded-2xl overflow-x-auto bg-card">
        {isLoading ? (
          <p className="p-8 text-center font-body text-sm text-muted-foreground">Cargando…</p>
        ) : isError ? (
          <p className="p-8 text-center font-body text-sm text-rose-600">No se han podido cargar los tests</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-muted">
                {["Fecha", "Nombre", "Email", "Teléfono", "Estilo", "Ficha"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-4 py-3 font-body text-xs text-muted-foreground whitespace-nowrap">{new Date(t.created_at).toLocaleDateString("es-ES")}</td>
                  <td className="px-4 py-3 font-body text-sm text-foreground">{t.name}</td>
                  <td className="px-4 py-3 font-body text-sm text-muted-foreground">{t.email}</td>
                  <td className="px-4 py-3 font-body text-sm text-muted-foreground whitespace-nowrap">{t.telefono || "—"}</td>
                  <td className="px-4 py-3 font-body text-sm text-muted-foreground whitespace-nowrap">
                    {estilo(t.primary_style)} · {estilo(t.secondary_style)}
                  </td>
                  <td className="px-4 py-3 font-body text-sm whitespace-nowrap">
                    {t.ficha ? (
                      <Link to={`/admin/perfiles/${t.ficha}`} className="text-gold-texto hover:underline font-medium">Ver ficha</Link>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200">Sin ficha</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center font-body text-sm text-muted-foreground">No hay tests</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TestDisc;
