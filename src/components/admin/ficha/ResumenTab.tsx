import { Link } from "react-router-dom";
import { KeyRound, ListChecks } from "lucide-react";
import type { Perfil } from "@/types/admin";
import { PREGUNTAS_CLAVE } from "@/lib/preguntasClave";
import { useTareas } from "@/hooks/admin/useTareas";
import { ListaTareas } from "@/components/admin/tareas/ListaTareas";
import { Field, Section } from "./Campos";
import VideoPresentacion from "./VideoPresentacion";
import EvolucionCliente from "./EvolucionCliente";

const MAX_PROXIMAS = 5;

const ProximasTareas = ({ perfil }: { perfil: Perfil }) => {
  const { data: tareas = [] } = useTareas({ perfilId: perfil.id, estado: "pendiente" });
  return (
    <section className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-5 flex items-center justify-between gap-3">
        <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-gold" /> Próximas tareas
        </h3>
        {tareas.length > MAX_PROXIMAS && (
          <Link to="?tab=tareas" className="font-body text-xs text-gold hover:underline">Ver las {tareas.length}</Link>
        )}
      </div>
      <ListaTareas tareas={tareas.slice(0, MAX_PROXIMAS)} vacio="No hay tareas pendientes." />
    </section>
  );
};

// La evolución incluye el último resumen revisado.
const ResumenTab = ({ perfil: p }: { perfil: Perfil }) => (
  <div className="space-y-6">
    <Section title="Preguntas clave" icon={KeyRound}>
      {PREGUNTAS_CLAVE.map((q) => (
        <Field key={q.clave} label={q.etiqueta} value={q.respuesta(p)} />
      ))}
    </Section>
    <ProximasTareas perfil={p} />
    <EvolucionCliente perfil={p} />
    <VideoPresentacion perfil={p} />
  </div>
);

export default ResumenTab;
