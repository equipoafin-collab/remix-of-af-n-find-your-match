import { KeyRound } from "lucide-react";
import type { Perfil } from "@/types/admin";
import { PREGUNTAS_CLAVE } from "@/lib/preguntasClave";
import { Field, Section } from "./Campos";
import VideoPresentacion from "./VideoPresentacion";
import EvolucionCliente from "./EvolucionCliente";

// La evolución incluye el último resumen revisado; las próximas tareas (T6.2) se añaden aquí.
const ResumenTab = ({ perfil: p }: { perfil: Perfil }) => (
  <div className="space-y-6">
    <Section title="Preguntas clave" icon={KeyRound}>
      {PREGUNTAS_CLAVE.map((q) => (
        <Field key={q.clave} label={q.etiqueta} value={q.respuesta(p)} />
      ))}
    </Section>
    <EvolucionCliente perfil={p} />
    <VideoPresentacion perfil={p} />
  </div>
);

export default ResumenTab;
