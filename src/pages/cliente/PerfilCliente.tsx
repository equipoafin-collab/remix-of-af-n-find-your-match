import { useOutletContext } from "react-router-dom";
import { ChevronDown, Download, Loader2 } from "lucide-react";
import { calculateDisc } from "@/components/DiscSurvey";
import FotoPerfil from "@/components/admin/FotoPerfil";
import { rotuloClaro } from "@/components/cliente/estilos";
import { useMiPerfil } from "@/hooks/cliente/useMiArea";
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
  const pri = DISC_META[primary];
  return (
    <section className={`${tarjeta} p-5 space-y-3`}>
      <p className={rotuloClaro}>Tu perfil DISC</p>
      <p className="font-display text-2xl font-bold text-foreground">
        {pri.emoji} <em className="italic font-normal">{pri.title}</em>
      </p>
      <p className="font-body text-sm text-muted-foreground">{pri.description} Tu segundo estilo: {DISC_META[secondary].title.toLowerCase()}.</p>
      <button
        onClick={() =>
          generateDiscPdf({ userName: perfil.nombre_completo, primary, secondary, percents, pri, sec: DISC_META[secondary] })
        }
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border font-body text-sm text-foreground hover:bg-muted"
      >
        <Download className="w-4 h-4" /> Descargar mi informe DISC
      </button>
    </section>
  );
};

const Escala = ({ valor }: { valor: number }) => (
  <span className="inline-flex gap-1" aria-label={`${valor} de 5`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <span key={n} className={`w-2.5 h-2.5 rounded-full ${n <= valor ? "bg-gold" : "bg-muted"}`} />
    ))}
  </span>
);

/** T16.1 · Su perfil: plan, DISC y sus respuestas del cuestionario por secciones. */
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
        <FotoPerfil path={p.foto_url} nombre={p.nombre_completo} className="w-16 h-16 rounded-full text-xl shrink-0" />
        <div>
          <p className={rotuloClaro}>Tu perfil</p>
          <h1 className="font-display text-3xl font-bold text-foreground leading-tight">
            {nombre} {apellidos.length > 0 && <em className="italic font-normal">{apellidos.join(" ")}</em>}
          </h1>
        </div>
      </header>

      <Plan area={area} />
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

      <p className="font-body text-xs text-muted-foreground text-center">¿Algo no está bien? Díselo a tu psicóloga y lo cambiará.</p>
    </div>
  );
};

export default PerfilCliente;
