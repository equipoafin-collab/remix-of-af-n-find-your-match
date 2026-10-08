import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Bot, Search, StickyNote } from "lucide-react";
import { useBuscarNotas } from "@/hooks/admin/useNotas";
import { SECCIONES_RESUMEN, validarResumen } from "../../../supabase/functions/_shared/resumen";

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
const enlace = "font-semibold text-foreground hover:text-gold";

// T9.1 · Buscador global de notas privadas y resúmenes de sesión. Busca al enviar, no en cada tecla.
const NotasPrivadas = () => {
  const [texto, setTexto] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const { data, isLoading, error } = useBuscarNotas(busqueda);
  const buscar = (e: FormEvent) => {
    e.preventDefault();
    setBusqueda(texto.trim());
  };

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-2"><StickyNote className="w-7 h-7 text-gold" /> Notas Privadas</h1>
        <p className="font-body text-sm text-muted-foreground mt-1">
          {busqueda ? `Resultados para «${busqueda}» (hasta 50 de cada tipo)` : "Últimas notas y resúmenes de sesión de todos los clientes"}
        </p>
      </div>

      <form onSubmit={buscar} className="flex gap-2">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar en notas, notas de sesión y resúmenes…"
          className="flex-1 px-3 py-2 rounded-lg border border-border bg-card font-body text-sm"
        />
        <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold text-accent-foreground font-body text-sm font-semibold shadow-sm">
          <Search className="w-4 h-4" /> Buscar
        </button>
      </form>

      {error ? (
        <p className="font-body text-sm text-rose-700">No se pudo buscar: {error.message}</p>
      ) : isLoading || !data ? (
        <p className="font-body text-sm text-muted-foreground">Buscando…</p>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4 items-start">
          <section className="bg-card border border-border rounded-2xl overflow-hidden">
            <h2 className="p-5 font-display text-sm font-semibold text-foreground">Notas privadas ({data.notas.length})</h2>
            {data.notas.length === 0 ? (
              <p className="px-5 py-4 border-t border-border font-body text-sm text-muted-foreground">Ninguna nota{busqueda && " contiene ese texto"}.</p>
            ) : (
              <ul>
                {data.notas.map((n) => (
                  <li key={n.id} className="px-5 py-4 border-t border-border">
                    <p className="font-body text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      <Link to={`/admin/perfiles/${n.perfil_id}?tab=notas`} className={enlace}>{n.perfil?.nombre_completo}</Link>
                      · {fecha(n.created_at)}
                      {n.automatica && <span className="inline-flex items-center gap-1">· <Bot className="w-3 h-3" /> automática</span>}
                    </p>
                    <p className="font-body text-sm text-foreground mt-1 whitespace-pre-wrap line-clamp-6">{n.contenido}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-card border border-border rounded-2xl overflow-hidden">
            <h2 className="p-5 font-display text-sm font-semibold text-foreground">Resúmenes de sesión ({data.sesiones.length})</h2>
            {data.sesiones.length === 0 ? (
              <p className="px-5 py-4 border-t border-border font-body text-sm text-muted-foreground">Ningún resumen{busqueda && " contiene ese texto"}.</p>
            ) : (
              <ul>
                {data.sesiones.map((s) => {
                  const r = validarResumen(s.resumen_ia);
                  return (
                    <li key={s.id} className="px-5 py-4 border-t border-border">
                      <p className="font-body text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                        <Link to={`/admin/perfiles/${s.perfil_id}?tab=sesiones`} className={enlace}>{s.perfil?.nombre_completo}</Link>
                        · sesión del {fecha(s.fecha_hora)}
                        {r && ` · ${s.resumen_estado === "revisado" ? "revisado" : "borrador"}`}
                      </p>
                      {r ? (
                        <div className="mt-1 space-y-0.5">
                          <p className="font-body text-sm text-foreground">{r.estado_emocional}</p>
                          {SECCIONES_RESUMEN.filter(({ clave }) => r[clave].length > 0).map(({ clave, label }) => (
                            <p key={clave} className="font-body text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">{label}:</span> {r[clave].join(" · ")}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="font-body text-sm text-foreground mt-1 whitespace-pre-wrap line-clamp-6">{s.notas_brutas}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default NotasPrivadas;
