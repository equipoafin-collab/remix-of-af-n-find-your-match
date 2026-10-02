import { KeyRound } from "lucide-react";
import type { Perfil } from "@/types/admin";
import { Field, Section } from "./Campos";
import VideoPresentacion from "./VideoPresentacion";

// Las 5 preguntas clave de la sección 2.3. T4.2 las centraliza en src/lib/preguntasClave.ts;
// el último resumen de sesión (T3.3) y las próximas tareas (T6.2) se añaden aquí.
const ResumenTab = ({ perfil: p }: { perfil: Perfil }) => (
  <div className="space-y-6">
    <Section title="Preguntas clave" icon={KeyRound}>
      <Field label="Tipo de relación" value={p.tipo_relacion} />
      <Field label="Hijos" value={p.hijos} />
      <Field label="Rango de edad que busca" value={p.edad_min_busca && p.edad_max_busca ? `${p.edad_min_busca} - ${p.edad_max_busca}` : null} />
      <Field label="Zona" value={`${p.zona ?? p.ciudad}${p.acepta_otras_zonas ? " · abierto/a a otras zonas" : ""}`} />
      <Field label="Valores importantes" value={p.valores_importantes.join(", ")} />
    </Section>
    <VideoPresentacion perfil={p} />
  </div>
);

export default ResumenTab;
