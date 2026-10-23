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
  onDescargar: () => void;
}

/** Resultados DISC visuales (anillo, barras animadas y pestañas) antes de descargar el PDF. */
const DiscResultados = ({ primary, secondary, percents, onDescargar }: Props) => {
  const [listo, setListo] = useState(false);
  const [activo, setActivo] = useState<DiscType>(primary);
  const [pestana, setPestana] = useState<(typeof PESTANAS)[number]["id"]>("fortalezas");
  useEffect(() => {
    const t = setTimeout(() => setListo(true), 80);
    return () => clearTimeout(t);
  }, []);

  const pri = DISC_META[primary];
  const sel = DISC_META[activo];

  // Anillo: un arco por tipo.
  const R = 54;
  const C = 2 * Math.PI * R;
  let acumulado = 0;

  return (
    <div className="space-y-6">
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
            <span className="font-display text-4xl" style={{ color: COLOR[activo] }}>{activo}</span>
            <span className="font-body text-sm font-semibold text-foreground">{percents[activo]}%</span>
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
        <div key={pestana} className="pt-4 animate-in fade-in duration-300 font-body text-sm text-foreground space-y-2">
          {pestana === "fortalezas" && (
            <div className="grid sm:grid-cols-2 gap-4">
              <ul className="space-y-1.5">
                <li className="text-xs uppercase tracking-wider text-muted-foreground">Fortalezas</li>
                {pri.fortalezas.map((f) => <li key={f} className="flex gap-2"><span style={{ color: COLOR.S }}>—</span>{f}</li>)}
              </ul>
              <ul className="space-y-1.5">
                <li className="text-xs uppercase tracking-wider text-muted-foreground">Para crecer</li>
                {pri.mejoras.map((f) => <li key={f} className="flex gap-2"><span style={{ color: COLOR.I }}>—</span>{f}</li>)}
              </ul>
            </div>
          )}
          {pestana === "pareja" && (<><p>{pri.enPareja}</p><p className="text-muted-foreground">{pri.compatibility}</p></>)}
          {pestana === "amor" && (
            <>
              <p>{pri.amor}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {pri.necesidades.map((n) => <span key={n} className="px-3 py-1 rounded-full border border-border bg-cream/60 text-xs">{n}</span>)}
              </div>
            </>
          )}
          {pestana === "conflicto" && (<><p>{pri.conflicto}</p><p className="text-muted-foreground">{pri.comunicacion}</p></>)}
        </div>
      </div>

      <button
        type="button"
        onClick={onDescargar}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background font-body text-sm hover:opacity-90"
      >
        <Download className="w-4 h-4" /> Descargar mi informe DISC completo
      </button>
    </div>
  );
};

export default DiscResultados;
