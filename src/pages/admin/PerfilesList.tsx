import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Filter, ChevronRight, ChevronLeft, MapPin } from "lucide-react";
import {
  POR_PAGINA, SIN_REVISAR, SITUACIONES, SOLO_CLIENTES, SOLO_LEADS, TODOS,
  useClientes, useOpcionesFiltro, type FiltrosClientes,
} from "@/hooks/admin/useClientes";
import FotoPerfil from "@/components/admin/FotoPerfil";
import { EstadoBadge, PlanBadge, SinRevisarBadge } from "@/components/admin/Badges";
import { useConfiguracion } from "@/hooks/admin/useConfiguracion";
import { Constants } from "@/integrations/supabase/types";
import { valorDeUrl } from "@/lib/dashboard";

const ESTADOS = [...Constants.public.Enums.estado_cliente, SIN_REVISAR];
const PLANES = [SOLO_CLIENTES, ...Constants.public.Enums.plan_tipo, SOLO_LEADS];

const FILTROS_INICIALES: FiltrosClientes = {
  busqueda: "", genero: TODOS, ciudad: TODOS, estado: TODOS, plan: TODOS, situacion: TODOS, hijos: TODOS, tabaco: TODOS, religion: TODOS,
};

// Los enlaces del Dashboard llegan con ?plan=, ?estado= y ?situacion= (App vuelve a montar la página si cambia la URL).
const filtrosDeUrl = (params: URLSearchParams): FiltrosClientes => ({
  ...FILTROS_INICIALES,
  plan: valorDeUrl(params, "plan", PLANES) ?? TODOS,
  estado: valorDeUrl(params, "estado", ESTADOS) ?? TODOS,
  situacion: valorDeUrl(params, "situacion", Object.keys(SITUACIONES)) ?? TODOS,
});

const fechaCita = (iso: string) =>
  new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const PerfilesList = () => {
  const [texto, setTexto] = useState("");
  const [params] = useSearchParams();
  const [filtros, setFiltros] = useState(() => filtrosDeUrl(params));
  const [pagina, setPagina] = useState(0);
  const { data: config } = useConfiguracion();
  const { data, isLoading: loading, isFetching, error } = useClientes(filtros, pagina, config?.umbral_pocas_sesiones);
  const { data: opciones } = useOpcionesFiltro();
  const clientes = data?.clientes ?? [];
  const total = data?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  const filtrar = (campo: keyof FiltrosClientes) => (valor: string) => {
    setFiltros((f) => ({ ...f, [campo]: valor }));
    setPagina(0);
  };

  // La búsqueda se lanza 300 ms después de dejar de escribir.
  useEffect(() => {
    if (texto === filtros.busqueda) return;
    const t = setTimeout(() => {
      setFiltros((f) => ({ ...f, busqueda: texto }));
      setPagina(0);
    }, 300);
    return () => clearTimeout(t);
  }, [texto, filtros.busqueda]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Perfiles</h1>
          <p className="font-body text-sm text-muted-foreground mt-1">{total} perfiles</p>
        </div>
      </header>

      {/* Buscador + filtros */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            aria-label="Buscar por nombre, email o ciudad"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar por nombre, email o ciudad…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select label="Plan" value={filtros.plan} onChange={filtrar("plan")} options={PLANES} />
          <Select label="Estado" value={filtros.estado} onChange={filtrar("estado")} options={ESTADOS} />
          <Select label="Situación" value={filtros.situacion} onChange={filtrar("situacion")} options={Object.keys(SITUACIONES)} etiquetas={SITUACIONES} />
          <Select label="Género" value={filtros.genero} onChange={filtrar("genero")} options={["Hombre", "Mujer", "Otro"]} />
          <Select label="Ciudad" value={filtros.ciudad} onChange={filtrar("ciudad")} options={opciones?.ciudades ?? []} />
          <Select label="Hijos" value={filtros.hijos} onChange={filtrar("hijos")} options={["Tengo", "Quiero tener", "No quiero tener"]} />
          <Select label="Tabaco" value={filtros.tabaco} onChange={filtrar("tabaco")} options={["No fumo", "Ocasional", "Habitual"]} />
          <Select label="Religión" value={filtros.religion} onChange={filtrar("religion")} options={opciones?.religiones ?? []} />
        </div>
      </div>

      {/* Tabla */}
      <div className={`border border-border rounded-2xl overflow-x-auto bg-card transition-opacity ${isFetching && !loading ? "opacity-60" : ""}`}>
        {error ? (
          <p className="p-8 text-center font-body text-sm text-rose-700">No se pudieron cargar los perfiles: {error.message}</p>
        ) : loading ? (
          <p className="p-8 text-center font-body text-sm text-muted-foreground">Cargando perfiles…</p>
        ) : clientes.length === 0 ? (
          <p className="p-8 text-center font-body text-sm text-muted-foreground">No hay perfiles que coincidan</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-muted">
                {["Persona", "Edad", "Ciudad", "Género", "Busca", "Plan", "Sesiones", "Próxima cita", "Estado", "Alta", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientes.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <FotoPerfil path={p.foto_url} nombre={p.nombre_completo} className="w-10 h-10 rounded-full text-sm" />
                      <div>
                        <p className="font-body text-sm font-medium text-foreground">{p.nombre_completo}</p>
                        <p className="font-body text-xs text-muted-foreground">{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-muted-foreground">{p.edad}</td>
                  <td className="px-4 py-3 font-body text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{p.ciudad}</span>
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-muted-foreground">{p.genero || "—"}</td>
                  <td className="px-4 py-3 font-body text-sm text-muted-foreground">{p.busca_genero || "—"}</td>
                  <td className="px-4 py-3"><PlanBadge plan={p.plan} /></td>
                  <td className="px-4 py-3 font-body text-sm text-muted-foreground tabular-nums">
                    {p.plan || p.sesiones_contratadas > 0 ? `${p.sesiones_realizadas}/${p.sesiones_contratadas}` : "—"}
                  </td>
                  <td className="px-4 py-3 font-body text-xs text-muted-foreground whitespace-nowrap">
                    {p.proxima_cita ? fechaCita(p.proxima_cita) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <EstadoBadge estado={p.estado_cliente} />
                      {!p.revisado && <SinRevisarBadge />}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-body text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("es-ES")}
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/admin/perfiles/${p.id}`} className="inline-flex items-center gap-1 text-gold-texto hover:underline text-sm font-body font-medium">
                      Abrir <ChevronRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {total > POR_PAGINA && (
        <div className="flex items-center justify-end gap-3 font-body text-sm text-muted-foreground">
          <span>Página {pagina + 1} de {paginas}</span>
          <button
            onClick={() => setPagina((n) => n - 1)}
            disabled={pagina === 0}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card hover:text-foreground disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          <button
            onClick={() => setPagina((n) => n + 1)}
            disabled={pagina + 1 >= paginas}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card hover:text-foreground disabled:opacity-40"
          >
            Siguiente <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

const Select = ({ label, value, onChange, options, etiquetas = {} }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; etiquetas?: Record<string, string>;
}) => (
  <select
    aria-label={label}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="px-3 py-1.5 rounded-lg border border-border bg-background font-body text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-gold/40"
  >
    <option value={TODOS}>{label}: Todos</option>
    {options.map((o) => <option key={o} value={o}>{label}: {etiquetas[o] ?? o}</option>)}
  </select>
);

export default PerfilesList;
