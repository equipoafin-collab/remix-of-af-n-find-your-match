import { User, Heart, Cigarette, Briefcase, Sparkles, ShieldAlert } from "lucide-react";
import type { Perfil } from "@/types/admin";
import { Field, Scale, Section } from "./Campos";

const CuestionarioTab = ({ perfil: p }: { perfil: Perfil }) => (
  <div className="space-y-6">
    <Section title="Datos personales" icon={User}>
      <Field label="Nombre" value={p.nombre_completo} />
      <Field label="Email" value={p.email} />
      <Field label="Teléfono" value={p.telefono} />
      <Field label="Edad" value={p.edad} />
      <Field label="Ciudad" value={p.ciudad} />
      <Field label="Género" value={p.genero} />
      <Field label="Estatura" value={p.estatura ? `${p.estatura} cm` : null} />
      <Field label="Peso" value={p.peso ? `${p.peso} kg` : null} />
    </Section>

    <Section title="Estilo de vida" icon={Cigarette}>
      <Field label="Tabaco" value={p.tabaco} />
      <Field label="Alcohol" value={p.alcohol} />
      <Field label="Fin de semana" value={p.fin_de_semana} />
      <Field label="Hobbies" value={p.hobbies} />
    </Section>

    <Section title="Familia y objetivos" icon={Heart}>
      <Field label="Hijos" value={p.hijos} />
      <Field label="¿Desea casarse?" value={p.desea_casarse} />
      <Field label="Tipo de relación" value={p.tipo_relacion} />
      <Field label="Busca género" value={p.busca_genero} />
      <Field label="Rango edad" value={p.edad_min_busca && p.edad_max_busca ? `${p.edad_min_busca} - ${p.edad_max_busca}` : null} />
    </Section>

    <Section title="Valores" icon={Sparkles}>
      <Field label="Religión" value={p.religion} />
      <Field label="Importa religión pareja" value={p.importa_religion ? `Sí (busca ${p.religion_pareja})` : "No"} />
      <Field label="Ideología" value={p.ideologia} />
      <Field label="Política preferida pareja" value={p.importa_politica ? p.politica_pareja : "No le importa"} />
    </Section>

    <Section title="Escalas de personalidad" icon={Briefcase}>
      <Scale label="Deseo de familia" value={p.deseo_familia} />
      <Scale label="Ambición profesional" value={p.ambicion_profesional} />
      <Scale label="Nivel social" value={p.nivel_social} />
      <Scale label="Estilo de vida activo" value={p.estilo_vida_activo} />
      <Scale label="Necesidad independencia" value={p.necesidad_independencia} />
      <Field label="Perfil DISC" value={p.disc_perfil} />
    </Section>

    <Section title="Filtros excluyentes (no aceptaría)" icon={ShieldAlert}>
      <Field label="Hijos" value={p.hijos === "No quiero tener" ? "❌ Personas con hijos / que quieran" : "Sin restricción"} />
      <Field label="Religión" value={p.importa_religion ? `Solo ${p.religion_pareja}` : "Sin restricción"} />
      <Field label="Política" value={p.importa_politica ? `Solo ${p.politica_pareja}` : "Sin restricción"} />
      <Field label="Tatuajes" value={p.tatuajes_pareja && p.tatuajes_pareja !== "Me da igual" ? `Prefiere: ${p.tatuajes_pareja}` : "Sin restricción"} />
    </Section>
  </div>
);

export default CuestionarioTab;
