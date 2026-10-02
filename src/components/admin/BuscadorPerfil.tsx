import { useState } from "react";
import { Search } from "lucide-react";
import { usePerfiles } from "@/hooks/admin/usePerfiles";
import type { Perfil } from "@/types/admin";

/** Buscador por nombre o email sobre los perfiles ya cargados en caché. */
const BuscadorPerfil = ({ onSelect }: { onSelect: (perfil: Perfil) => void }) => {
  const { data: perfiles = [] } = usePerfiles();
  const [q, setQ] = useState("");
  const s = q.trim().toLowerCase();
  const resultados = s
    ? perfiles.filter((p) => `${p.nombre_completo} ${p.email ?? ""}`.toLowerCase().includes(s)).slice(0, 8)
    : [];

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar perfil por nombre o email…"
        className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background font-body text-sm"
      />
      {resultados.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          {resultados.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(p);
                  setQ("");
                }}
                className="w-full text-left px-3 py-2 hover:bg-muted font-body text-sm"
              >
                {p.nombre_completo} <span className="text-xs text-muted-foreground">{p.email}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default BuscadorPerfil;
