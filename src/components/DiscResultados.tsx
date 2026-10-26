import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { DISC_META, type DiscType } from "@/lib/disc";

const ORDEN: DiscType[] = ["D", "I", "S", "C"];
// Mismos tonos apagados que el PDF.
const COLOR: Record<DiscType, string> = { D: "#a8483e", I: "#be913c", S: "#568062", C: "#48628c" };

const PESTANAS = [
  { id: "fortalezas", label: "Fortalezas" },
  { id: "pareja", label: "En pareja" },
  { id: "amor", label: "Amor" },
  { id: "conflicto", label: "Conflictos" },
] as const;

interface Props {
  primary: DiscType;
  secondary: DiscType;
  percents: Record<DiscType, number>;
  nombre?: string | null;
  onDescargar: () => void;
}

/** Relato cercano por estilo: así te ves, lo que regalas y dónde puedes crecer. */
const RELATO: Record<DiscType, { brillo: string; crecer: string }> = {
  D: {
    brillo: "Seguro que te reconoces en esto: cuando algo te importa, no esperas a que pase, vas a por ello. Decides rápido, te pones al frente cuando hace falta y los problemas no te asustan, los miras de frente. Esa energía es contagiosa y hace que la gente a tu alrededor se sienta segura contigo.",
    crecer: "A veces esa misma fuerza puede sonar a prisa o a querer tenerlo todo bajo control. Si te permites bajar el ritmo y preguntar cómo se siente la otra persona antes de resolver, descubrirás una conexión todavía más profunda.",
  },
  I: {
    brillo: "Tú iluminas las habitaciones en las que entras. Te sale natural conectar con la gente, contagiar entusiasmo y hacer que cualquier plan se convierta en una buena historia. Cuando hay tensión, tu empatía y tu sentido del humor suavizan las cosas como pocas personas saben hacer.",
    crecer: "Puede que a veces te cueste aterrizar los planes o que te duela más de lo que muestras cuando no te sientes vista o visto. Darte permiso para pedir lo que necesitas, y sostener la constancia en lo cotidiano, hará que tus relaciones crezcan con raíces firmes.",
  },
  S: {
    brillo: "Eres ese refugio al que la gente quiere volver. Escuchas de verdad, cuidas los detalles y das una calma que se nota. Tu lealtad no es de palabra: se demuestra día a día, con paciencia y con una presencia en la que se puede confiar.",
    crecer: "Por cuidar tanto la armonía, a veces callas lo que te molesta o te cuesta abrirte a los cambios. Tu voz importa tanto como la de los demás: decir lo que sientes también es una forma de cuidar la relación.",
  },
  C: {
    brillo: "Te tomas las cosas en serio, y eso es un regalo. Piensas antes de actuar, cuidas la calidad de todo lo que haces y tu forma de querer es fiel y reflexiva. Cuando das tu palabra, la cumples, y eso genera una confianza enorme.",
    crecer: "Tu exigencia a veces se vuelve contra ti, o hace que te cueste mostrar lo que sientes hasta estar del todo seguro o segura. Permitirte un poco de imperfección y espontaneidad abrirá espacio a momentos muy bonitos.",
  },
};

/** Resultados DISC visuales (anillo, barras animadas y pestañas) antes de descargar el PDF. */
const DiscResultados = ({ primary, secondary, percents, nombre, onDescargar }: Props) => {
  const [listo, setListo] = useState(false);
  const [activo, setActivo] = useState<DiscType>(primary);
  const [pestana, setPestana] = useState<(typeof PESTANAS)[number]["id"]>("fortalezas");
  useEffect(() => {
    const t = setTimeout(() => setListo(true), 80);
    return () => clearTimeout(t);
  }, []);

  const pri = DISC_META[primary];
  const sel = DISC_META[activo];
  const nom = nombre?.trim().split(/\s+/)[0] || "";
  const relato = RELATO[primary];
  const necesidades = pri.necesidades.map((n) => n.charAt(0).toLowerCase() + n.slice(1));
  const listaNec = necesidades.length > 1 ? `${necesidades.slice(0, -1).join(", ")} y ${necesidades.at(-1)}` : necesidades[0];

  // Anillo: un arco por tipo.
  const R = 54;
  const C = 2 * Math.PI * R;
  let acumulado = 0;

  return (
    <div className="space-y-6">
      <div
        className="relative overflow-hidden rounded-2xl p-6 sm:p-8 text-center animate-in fade-in zoom-in-95 duration-700"
        style={{ background: `radial-gradient(circle at 30% 20%, ${COLOR[primary]}55, transparent 60%), radial-gradient(circle at 80% 90%, ${COLOR[secondary]}40, transparent 55%), hsl(var(--primary))` }}
      >
        <p className="font-body text-xs uppercase tracking-[0.3em] text-primary-foreground/70">{nom ? `${nom}, tu estilo principal es` : "Tu estilo principal es"}</p>
        <p className="font-display text-5xl sm:text-6xl mt-3 text-primary-foreground">{pri.title}</p>
        <p className="font-display text-7xl sm:text-8xl leading-none mt-2" style={{ color: COLOR[primary] }}>
          {listo ? percents[primary] : 0}<span className="text-4xl">%</span>
        </p>
        <p className="font-display italic text-primary-foreground/80 mt-4 max-w-md mx-auto">{pri.frase}</p>
        <p className="font-body text-sm text-primary-foreground/70 mt-3">
          con un toque <strong className="text-primary-foreground">{DISC_META[secondary].title.toLowerCase()}</strong> ({percents[secondary]}%)
        </p>
      </div>

      <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-center">
        <div className="relative w-40 h-40 mx-auto">
          <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
            <circle cx="70" cy="70" r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth="14" />
            {ORDEN.map((t) => {
              const largo = (percents[t] / 100) * C;
              const offset = -acumulado;
              acumulado += largo;
              return (
                <circle
                  key={t}
                  cx="70" cy="70" r={R} fill="none"
                  stroke={COLOR[t]}
                  strokeWidth={activo === t ? 18 : 14}
                  strokeDasharray={`${listo ? largo : 0} ${C}`}
                  strokeDashoffset={offset}
                  className="cursor-pointer transition-all duration-1000 ease-out"
                  onMouseEnter={() => setActivo(t)}
                  onClick={() => setActivo(t)}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-display text-3xl" style={{ color: COLOR[activo] }}>{percents[activo]}%</span>
            <span className="font-body text-xs text-muted-foreground">{DISC_META[activo].title}</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-display text-2xl text-foreground">
            Eres <em className="italic" style={{ color: COLOR[primary] }}>{pri.title}</em>
          </p>
          <p className="font-display italic text-muted-foreground">{pri.frase}</p>
          <p className="font-body text-sm text-muted-foreground">
            {pri.description} Tu segundo estilo es <strong className="text-foreground">{DISC_META[secondary].title.toLowerCase()}</strong> ({percents[secondary]}%).
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {ORDEN.map((t, i) => (
          <button
            key={t}
            type="button"
            onMouseEnter={() => setActivo(t)}
            onClick={() => setActivo(t)}
            className={`w-full grid grid-cols-[1.5rem_6.5rem_1fr_2.5rem] items-center gap-3 text-left rounded-lg px-2 py-1 transition-colors ${activo === t ? "bg-muted" : ""}`}
          >
            <span className="font-display text-lg" style={{ color: COLOR[t] }}>{t}</span>
            <span className="font-body text-xs text-muted-foreground">{DISC_META[t].title}</span>
            <span className="h-2 rounded-full bg-muted overflow-hidden">
              <span
                className="block h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: listo ? `${percents[t]}%` : 0, backgroundColor: COLOR[t], transitionDelay: `${i * 120}ms` }}
              />
            </span>
            <span className="font-body text-sm text-foreground text-right">{percents[t]}%</span>
          </button>
        ))}
        <p className="font-body text-xs text-muted-foreground text-center">
          {sel.title}: {sel.description}
        </p>
      </div>

      <div>
        <div className="flex gap-1 border-b border-border overflow-x-auto">
          {PESTANAS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPestana(p.id)}
              className={`px-3 py-2 font-body text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${pestana === p.id ? "border-gold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div key={pestana} className="pt-4 animate-in fade-in duration-300 font-body text-sm text-foreground space-y-2 leading-relaxed">
          {pestana === "fortalezas" && (
            <div className="space-y-3 leading-relaxed">
              <p>{nom ? `${nom}, ` : ""}{relato.brillo.charAt(0).toLowerCase() + relato.brillo.slice(1)}</p>
              <p className="border-l-2 pl-4 italic text-muted-foreground" style={{ borderColor: COLOR[primary] }}>{relato.crecer}</p>
            </div>
          )}
          {pestana === "pareja" && (<><p>{pri.enPareja}</p><p className="text-muted-foreground">{pri.compatibility}</p></>)}
          {pestana === "amor" && (
            <div className="space-y-3 leading-relaxed">
              <p>{pri.amor}</p>
              <p>Para sentirte en casa con alguien, {nom || "tú"} necesitas {listaNec}. No es pedir demasiado: es saber lo que te hace bien.</p>
            </div>
          )}
          {pestana === "conflicto" && (<><p>{pri.conflicto}</p><p className="text-muted-foreground">{pri.comunicacion}</p></>)}
        </div>
      </div>

      <button
        type="button"
        onClick={onDescargar}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground font-body text-sm hover:opacity-90"
      >
        <Download className="w-4 h-4" /> Descargar mi informe DISC completo
      </button>
    </div>
  );
};

export default DiscResultados;
