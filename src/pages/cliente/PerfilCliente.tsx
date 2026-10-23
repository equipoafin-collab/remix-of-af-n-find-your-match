import { useState } from "react";
import DiscResultados from "@/components/DiscResultados";
import { useOutletContext } from "react-router-dom";
import { Camera, ChevronDown, Loader2, Pencil } from "lucide-react";
import { calculateDisc } from "@/components/DiscSurvey";
import FotoPerfil from "@/components/admin/FotoPerfil";
import { rotuloClaro } from "@/components/cliente/estilos";
import EditarPreferencias from "@/components/cliente/EditarPreferencias";
import Solicitudes from "@/components/cliente/Solicitudes";
import { toast } from "@/hooks/use-toast";
import { useCambiarFoto, useMiPerfil } from "@/hooks/cliente/useMiArea";
import { fechaLarga, type ContextoArea, type MiAreaAbierta } from "@/lib/areaCliente";
import { respondidos, SECCIONES_PERFIL, type MiPerfil } from "@/lib/cuestionario";
import { DISC_META, resumenDisc } from "@/lib/disc";
import { generateDiscPdf } from "@/lib/generateDiscPdf";

const tarjeta = "bg-card border border-border rounded-2xl";

/** Plan y sesiones, como la tarjeta de Precios de la portada. */
const Plan = ({ area }: { area: MiAreaAbierta }) => {
  const progreso = area.sesiones_contratadas ? Math.min(100, (area.sesiones_realizadas / area.sesiones_contratadas) * 100) : 0;
  return (
    <section className="rounded-2xl border border-gold bg-cream/60 p-5 text-center space-y-2">
      <span className={`${rotuloClaro} inline-block bg-cream px-3 py-1 rounded-full`}>Plan {area.plan === "premium" ? "Premium" : "Esencial"}</span>
      {area.plan_fin && <p className="font-display italic text-lg text-gold-texto">Hasta el {fechaLarga(area.plan_fin)}</p>}
      {area.sesiones_contratadas > 0 && (
        <>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden" aria-hidden="true">
            <div className="h-full bg-gold" style={{ width: `${progreso}%` }} />
          </div>
          <p className="font-body text-[11px] uppercase tracking-wider text-muted-foreground">
            {area.sesiones_realizadas} de {area.sesiones_contratadas} sesiones realizadas
          </p>
        </>
      )}
    </section>
  );
};

/** Su perfil DISC del cuestionario, con el mismo PDF que al terminarlo. */
const Disc = ({ perfil }: { perfil: MiPerfil }) => {
  if (!perfil.disc_respuestas || !Object.keys(perfil.disc_respuestas).length) return null;
  const { primary, secondary, percents } = resumenDisc(calculateDisc(perfil.disc_respuestas).scores);
  return (
    <section className={`${tarjeta} p-5 space-y-3`}>
      <p className={rotuloClaro}>Tu perfil DISC</p>
      <DiscResultados
        primary={primary}
        secondary={secondary}
        percents={percents}
        onDescargar={() =>
          generateDiscPdf({ userName: perfil.nombre_completo, primary, secondary, percents, pri: DISC_META[primary], sec: DISC_META[secondary] })
        }
      />
    </section>
  );
};

/** T16.2 · Lo que puede cambiar él mismo, con "Editar". */
const Preferencias = ({ perfil }: { perfil: MiPerfil }) => {
  const [abierto, setAbierto] = useState(false);
  const filas = [
    ["Provincia", perfil.zona && `${perfil.zona}${perfil.acepta_otras_zonas ? " y otras provincias" : ""}`],
    ["Edad que buscas", perfil.edad_min_busca && perfil.edad_max_busca ? `De ${perfil.edad_min_busca} a ${perfil.edad_max_busca} años` : null],
    ["Tus valores", perfil.valores_importantes?.join(", ")],
    ["Tus aficiones", perfil.hobbies],
  ];
  return (
    <section className={`${tarjeta} p-5 space-y-3`}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-lg font-bold text-foreground">Tus preferencias</p>
        <button onClick={() => setAbierto(true)} className="inline-flex items-center gap-1 font-body text-sm font-semibold text-gold-texto hover:underline">
          <Pencil className="w-3.5 h-3.5" /> Editar
        </button>
      </div>
      <dl className="space-y-2">
        {filas.map(([etiqueta, valor]) => (
          <div key={etiqueta}>
            <dt className="font-body text-xs text-muted-foreground">{etiqueta}</dt>
            <dd className="font-body text-sm text-foreground line-clamp-2">{valor || "Sin indicar"}</dd>
          </div>
        ))}
      </dl>
      <EditarPreferencias perfil={perfil} abierto={abierto} cambiarAbierto={setAbierto} />
    </section>
  );
};

/** T16.2 · Su foto, con "Cambiar foto". */
const Foto = ({ perfil }: { perfil: MiPerfil }) => {
  const cambiar = useCambiarFoto();
  const elegir = (fichero: File | undefined) => {
    if (!fichero) return;
    cambiar.mutate(fichero, {
      onSuccess: () => toast({ title: "Foto cambiada", description: "Tu psicóloga recibe un aviso para verla." }),
      onError: (e) => toast({ title: "No se pudo cambiar la foto", description: e.message, variant: "destructive" }),
    });
  };
  return (
    <div className="relative shrink-0">
      <FotoPerfil path={perfil.foto_url} nombre={perfil.nombre_completo} className="w-16 h-16 rounded-full text-xl" />
      <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow" title="Cambiar foto">
        {cambiar.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
        <span className="sr-only">Cambiar foto</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={cambiar.isPending}
          onChange={(e) => { elegir(e.target.files?.[0]); e.target.value = ""; }}
        />
      </label>
    </div>
  );
};

const Escala = ({ valor }: { valor: number }) => (
  <span className="inline-flex gap-1" aria-label={`${valor} de 5`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <span key={n} className={`w-2.5 h-2.5 rounded-full ${n <= valor ? "bg-gold" : "bg-muted"}`} />
    ))}
  </span>
);

/** T16.1 · Su perfil: plan, preferencias (T16.2), DISC y sus respuestas del cuestionario por secciones. */
const PerfilCliente = () => {
  const { area, userId } = useOutletContext<ContextoArea>();
  const perfil = useMiPerfil(userId);

  if (perfil.isPending) return <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto mt-10" aria-label="Cargando" />;
  if (perfil.isError || !perfil.data) {
    return <p className="font-body text-sm text-rose-700 text-center mt-10">No hemos podido cargar tu perfil. Vuelve a intentarlo en un momento.</p>;
  }
  const p = perfil.data;
  const [nombre, ...apellidos] = p.nombre_completo.trim().split(/\s+/);

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-4">
        <Foto perfil={p} />
        <div>
          <p className={rotuloClaro}>Tu perfil</p>
          <h1 className="font-display text-3xl font-bold text-foreground leading-tight">
            {nombre} {apellidos.length > 0 && <em className="italic font-normal">{apellidos.join(" ")}</em>}
          </h1>
        </div>
      </header>

      <Plan area={area} />
      <Preferencias perfil={p} />
      <Disc perfil={p} />

      {SECCIONES_PERFIL.map((s) => {
        const campos = respondidos(s.campos, p);
        if (!campos.length) return null;
        return (
          <details key={s.titulo} className={`${tarjeta} group`}>
            <summary className="flex items-center justify-between gap-3 p-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <span className="font-display text-lg font-bold text-foreground">{s.titulo}</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <dl className="px-4 pb-4 space-y-3">
              {campos.map((c) => (
                <div key={c.etiqueta}>
                  <dt className="font-body text-xs text-muted-foreground">{c.etiqueta}</dt>
                  <dd className="font-body text-sm text-foreground whitespace-pre-line mt-0.5">
                    {c.escala ? <Escala valor={Number(c.v)} /> : c.v}
                  </dd>
                </div>
              ))}
            </dl>
          </details>
        );
      })}

      <Solicitudes area={area} />
      <p className="font-body text-xs text-muted-foreground text-center">¿Quieres cambiar algo más? Díselo a tu psicóloga y lo cambiará.</p>
    </div>
  );
};

export default PerfilCliente;
