import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, Filter, ChevronRight, MapPin } from "lucide-react";

import type { Perfil } from "@/types/admin";
import FotoPerfil from "@/components/admin/FotoPerfil";

const ESTADOS = ["activo", "pendiente", "pausado", "rechazado"];

const estadoBadge = (e: string | null) => {
  const v = e || "activo";
  const colors: Record<string, string> = {
    activo: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pendiente: "bg-amber-50 text-amber-700 border-amber-200",
    pausado: "bg-slate-50 text-slate-700 border-slate-200",
    rechazado: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-body font-medium border ${colors[v] || colors.activo}`}>
      {v}
    </span>
  );
};

const PerfilesList = () => {
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [genero, setGenero] = useState<string>("all");
  const [ciudad, setCiudad] = useState<string>("all");
  const [estado, setEstado] = useState<string>("all");
  const [hijos, setHijos] = useState<string>("all");
  const [tabaco, setTabaco] = useState<string>("all");
  const [religion, setReligion] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("perfiles").select("*").order("created_at", { ascending: false });
      setPerfiles(data || []);
      setLoading(false);
    })();
  }, []);

  const ciudades = useMemo(() => Array.from(new Set(perfiles.map((p) => p.ciudad).filter(Boolean))).sort(), [perfiles]);
  const religiones = useMemo(() => Array.from(new Set(perfiles.map((p) => p.religion).filter(Boolean))).sort(), [perfiles]);

  const filtered = useMemo(() => {
    return perfiles.filter((p) => {
      if (genero !== "all" && p.genero !== genero) return false;
      if (ciudad !== "all" && p.ciudad !== ciudad) return false;
      if (estado !== "all" && (p.estado_perfil || "activo") !== estado) return false;
      if (hijos !== "all" && p.hijos !== hijos) return false;
      if (tabaco !== "all" && p.tabaco !== tabaco) return false;
      if (religion !== "all" && p.religion !== religion) return false;
      if (q.trim()) {
        const s = q.toLowerCase();
        const blob = `${p.nombre_completo} ${p.email || ""} ${p.ciudad}`.toLowerCase();
        if (!blob.includes(s)) return false;
      }
      return true;
    });
  }, [perfiles, q, genero, ciudad, estado, hijos, tabaco, religion]);

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Perfiles</h1>
          <p className="font-body text-sm text-muted-foreground mt-1">
            {filtered.length} de {perfiles.length} perfiles
          </p>
        </div>
      </header>

      {/* Buscador + filtros */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, email o ciudad…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select label="Género" value={genero} onChange={setGenero} options={["Hombre", "Mujer", "Otro"]} />
          <Select label="Ciudad" value={ciudad} onChange={setCiudad} options={ciudades} />
          <Select label="Estado" value={estado} onChange={setEstado} options={ESTADOS} />
          <Select label="Hijos" value={hijos} onChange={setHijos} options={["Tengo", "Quiero tener", "No quiero tener"]} />
          <Select label="Tabaco" value={tabaco} onChange={setTabaco} options={["No fumo", "Ocasional", "Habitual"]} />
          <Select label="Religión" value={religion} onChange={setReligion} options={religiones} />
        </div>
      </div>

      {/* Tabla */}
      <div className="border border-border rounded-2xl overflow-hidden bg-card">
        {loading ? (
          <p className="p-8 text-center font-body text-sm text-muted-foreground">Cargando perfiles…</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center font-body text-sm text-muted-foreground">No hay perfiles que coincidan</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-muted">
                {["Persona", "Edad", "Ciudad", "Género", "Busca", "Estado", "Alta", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
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
                  <td className="px-4 py-3">{estadoBadge(p.estado_perfil)}</td>
                  <td className="px-4 py-3 font-body text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("es-ES")}
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/admin/perfiles/${p.id}`} className="inline-flex items-center gap-1 text-gold hover:underline text-sm font-body font-medium">
                      Abrir <ChevronRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const Select = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="px-3 py-1.5 rounded-lg border border-border bg-background font-body text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-gold/40"
  >
    <option value="all">{label}: Todos</option>
    {options.map((o) => <option key={o} value={o}>{label}: {o}</option>)}
  </select>
);

export default PerfilesList;
