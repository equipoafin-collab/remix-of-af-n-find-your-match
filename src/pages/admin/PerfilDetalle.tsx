import type { ComponentType } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { usePerfil } from "@/hooks/admin/usePerfiles";
import { useCalculoAutomatico } from "@/hooks/admin/useSugerencias";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Perfil } from "@/types/admin";
import CabeceraFicha from "@/components/admin/ficha/CabeceraFicha";
import AlertasCliente from "@/components/admin/ficha/AlertasCliente";
import ResumenTab from "@/components/admin/ficha/ResumenTab";
import SugerenciasTab from "@/components/admin/ficha/SugerenciasTab";
import NotasTab from "@/components/admin/ficha/NotasTab";
import SesionesTab from "@/components/admin/ficha/SesionesTab";
import MatchesTab from "@/components/admin/ficha/MatchesTab";
import TareasTab from "@/components/admin/ficha/TareasTab";
import CuestionarioTab from "@/components/admin/ficha/CuestionarioTab";
import DocumentosTab from "@/components/admin/ficha/DocumentosTab";

// Orden de la sección T2.1. Una pestaña sin componente sale deshabilitada ("Próximamente").
const PESTANAS: { id: string; label: string; Contenido?: ComponentType<{ perfil: Perfil }> }[] = [
  { id: "resumen", label: "Resumen", Contenido: ResumenTab },
  { id: "sugerencias", label: "Sugerencias IA", Contenido: SugerenciasTab },
  { id: "sesiones", label: "Sesiones", Contenido: SesionesTab },
  { id: "matches", label: "Matches", Contenido: MatchesTab },
  { id: "tareas", label: "Tareas", Contenido: TareasTab },
  { id: "notas", label: "Notas", Contenido: NotasTab },
  { id: "cuestionario", label: "Cuestionario", Contenido: CuestionarioTab },
  { id: "documentos", label: "Documentos", Contenido: DocumentosTab },
];

const PerfilDetalle = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data: cliente, isLoading: loading } = usePerfil(id);
  // T4.5: las sugerencias se ponen al día en segundo plano en cuanto se abre la ficha, en cualquier pestaña.
  useCalculoAutomatico(id);
  const pestana = params.get("tab") ?? "resumen";

  if (loading) return <div className="p-8 font-body text-muted-foreground">Cargando perfil…</div>;
  if (!cliente) return <div className="p-8 font-body text-muted-foreground">Perfil no encontrado.</div>;

  return (
    <div className="p-8 pt-4 space-y-4 max-w-6xl">
      <button onClick={() => navigate("/admin/perfiles")} className="inline-flex items-center gap-1 text-sm font-body text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Volver a perfiles
      </button>

      <CabeceraFicha cliente={cliente} />
      <AlertasCliente perfilId={cliente.id} />

      <Tabs value={pestana} onValueChange={(tab) => setParams({ tab }, { replace: true })}>
        <TabsList className="h-auto flex-wrap justify-start">
          {PESTANAS.map((t) => (
            <TabsTrigger key={t.id} value={t.id} disabled={!t.Contenido} title={t.Contenido ? undefined : "Próximamente"} className="font-body">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {PESTANAS.map(({ id: tab, Contenido }) =>
          Contenido ? (
            <TabsContent key={tab} value={tab} className="mt-4">
              <Contenido key={cliente.id} perfil={cliente} />
            </TabsContent>
          ) : null,
        )}
      </Tabs>
    </div>
  );
};

export default PerfilDetalle;
