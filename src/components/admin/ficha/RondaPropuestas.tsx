import { useState } from "react";
import { Loader2, RefreshCw, Send, Sparkles, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useCancelarRonda, useEnviarRonda, useGenerarEjemplos, useRondas } from "@/hooks/admin/usePropuestas";
import type { Sugerencia } from "@/hooks/admin/useSugerencias";
import {
  DIMENSIONES_EJEMPLO, errorEjemplos, errorRonda, MAX_FRASE, MAX_RASGO, PERSONAS_POR_RONDA, preseleccionar, puedeProponerse,
  type PerfilEjemplo,
} from "@/lib/propuestas";

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long" });
const onError = (error: Error) => toast({ title: "No se pudo", description: error.message, variant: "destructive" });
type Ronda = NonNullable<ReturnType<typeof useRondas>["data"]>[number];
const nombreEn = (sugerencias: Sugerencia[], id: string | null) =>
  sugerencias.find((s) => s.candidato_id === id)?.candidato?.nombre_completo ?? "Persona ya no sugerida";
const ejemplosDe = (r: Ronda) => (r.ejemplos ?? []) as unknown as PerfilEjemplo[];
const etiqueta = (e: PerfilEjemplo) => DIMENSIONES_EJEMPLO[e.dimension]?.etiqueta ?? e.dimension;

/** T19.4 · Qué respondió en la última ronda, para tenerlo en cuenta en la siguiente. */
const resultado = (r: Ronda, sugerencias: Sugerencia[]) =>
  r.estado === "caducada" ? "caducó sin respuesta."
  : r.ninguno ? `no le encajó ninguna${r.motivo ? ` (${r.motivo})` : ""}.`
  : r.de_ejemplo ? `se ve más con el perfil de ejemplo de ${ejemplosDe(r).find((e) => e.id === r.elegido_ejemplo)?.nombre ?? "?"}.`
  : `se ve más con ${nombreEn(sugerencias, r.elegido_id)}.`;

const RondaAbierta = ({ ronda, sugerencias }: { ronda: Ronda; sugerencias: Sugerencia[] }) => {
  const cancelar = useCancelarRonda();
  return (
    <div className="space-y-3">
      <p className="font-body text-sm text-foreground">
        Enviada el {fecha(ronda.enviada_at)}; caduca el {fecha(ronda.caduca_at)} si no responde. Aún no ha elegido.
      </p>
      <ul className="font-body text-sm text-foreground list-disc pl-5">
        {ronda.de_ejemplo
          ? ejemplosDe(ronda).map((e) => <li key={e.id}>{e.nombre}, {e.edad} · perfil de ejemplo (cambia: {etiqueta(e).toLowerCase()})</li>)
          : ronda.candidatos.map((id) => <li key={id}>{nombreEn(sugerencias, id)}</li>)}
      </ul>
      <div className="flex justify-end">
        <button
          onClick={() => cancelar.mutate({ id: ronda.id, perfilId: ronda.perfil_id }, { onSuccess: () => toast({ title: "Ronda cancelada" }), onError })}
          disabled={cancelar.isPending}
          className="px-3 py-1.5 rounded-lg font-body text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-50"
        >
          Cancelar ronda
        </button>
      </div>
    </div>
  );
};

// Se monta al abrir: preselecciona las 4 mejores con permiso. Las frases empiezan vacías (T19.7): el motivo de la IA
// está escrito para la psicóloga y solo se enseña como referencia.
const NuevaRonda = ({ perfilId, sugerencias, cerrar }: { perfilId: string; sugerencias: Sugerencia[]; cerrar: () => void }) => {
  const enviar = useEnviarRonda();
  const pendientes = sugerencias.filter((s) => s.estado === "pendiente");
  const [elegidos, setElegidos] = useState<string[]>(() => preseleccionar(pendientes));
  const [frases, setFrases] = useState<Record<string, string>>({});
  const conPermiso = pendientes.filter(puedeProponerse).length;
  const problema = errorRonda(elegidos, frases);

  const alternar = (id: string) =>
    setElegidos((e) => (e.includes(id) ? e.filter((x) => x !== id) : e.length < PERSONAS_POR_RONDA ? [...e, id] : e));

  const mandar = () =>
    enviar.mutate(
      {
        perfilId,
        candidatos: elegidos,
        frases: Object.fromEntries(elegidos.map((id) => [id, (frases[id] ?? "").trim()]).filter(([, f]) => f)),
      },
      { onSuccess: () => { toast({ title: "Ronda enviada", description: "La verá en su área durante 7 días." }); cerrar(); }, onError },
    );

  if (conPermiso < PERSONAS_POR_RONDA) {
    return (
      <p className="font-body text-sm text-muted-foreground">
        Hacen falta {PERSONAS_POR_RONDA} sugerencias pendientes de personas que hayan aceptado aparecer en propuestas; ahora hay {conPermiso}.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="font-body text-xs text-amber-700">
        Las frases las leerá el cliente: nada de religión, política, salud, apellidos ni contacto. De cada persona verá su nombre de pila, edad, zona, foto y aficiones.
      </p>
      <ul className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
        {pendientes.map((s) => {
          const permiso = puedeProponerse(s);
          const elegido = elegidos.includes(s.candidato_id);
          return (
            <li key={s.id} className={`rounded-xl border p-3 ${elegido ? "border-gold bg-gold/5" : "border-border"} ${permiso ? "" : "opacity-60"}`}>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={elegido}
                  disabled={!permiso || (!elegido && elegidos.length >= PERSONAS_POR_RONDA)}
                  onChange={() => alternar(s.candidato_id)}
                  className="accent-gold"
                />
                <span className="flex-1 font-body text-sm text-foreground">
                  {s.candidato?.nombre_completo} · {s.candidato?.edad} años · {Math.round(s.score)}%
                </span>
                {!permiso && <span className="font-body text-xs text-muted-foreground">Sin permiso para propuestas</span>}
              </label>
              {elegido && (
                <>
                  <input
                    value={frases[s.candidato_id] ?? ""}
                    onChange={(e) => setFrases((f) => ({ ...f, [s.candidato_id]: e.target.value }))}
                    maxLength={MAX_FRASE}
                    placeholder="Por qué se lo proponemos, hablándole al cliente (opcional)"
                    aria-label={`Frase para ${s.candidato?.nombre_completo}`}
                    className="mt-2 w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm"
                  />
                  {s.motivos[0] && (
                    <p className="mt-1 font-body text-[11px] text-muted-foreground">IA, solo para ti (no se envía): {s.motivos[0]}</p>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between gap-3">
        <span className="font-body text-sm text-muted-foreground">{elegidos.length}/{PERSONAS_POR_RONDA} elegidas</span>
        <button
          onClick={mandar}
          disabled={!!problema || enviar.isPending}
          title={problema ?? undefined}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background font-body text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {enviar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Enviar ronda
        </button>
      </div>
    </div>
  );
};

// T19.5 · Perfiles inventados por la IA para conocer qué busca: la psicóloga los revisa, puede retocar cómo es cada uno y
// escribe las frases, que empiezan vacías (T19.7). "cambio" es solo para ella.
const NuevaRondaEjemplo = ({ perfilId, cerrar }: { perfilId: string; cerrar: () => void }) => {
  const generar = useGenerarEjemplos();
  const enviar = useEnviarRonda();
  const [ejemplos, setEjemplos] = useState<PerfilEjemplo[] | null>(null);
  const problema = ejemplos ? errorEjemplos(ejemplos) : null;

  const crear = () => generar.mutate(perfilId, { onSuccess: setEjemplos, onError });
  const cambiar = (i: number, campo: "rasgo" | "frase", valor: string) =>
    setEjemplos((xs) => xs && xs.map((e, j) => (j === i ? { ...e, [campo]: valor } : e)));
  const mandar = () =>
    ejemplos && enviar.mutate(
      { perfilId, ejemplos: ejemplos.map((e) => ({ ...e, rasgo: e.rasgo.trim(), frase: (e.frase ?? "").trim() })) },
      {
        onSuccess: () => { toast({ title: "Ronda de ejemplo enviada", description: "La verá en su área durante 7 días, marcada como perfiles de ejemplo." }); cerrar(); },
        onError,
      },
    );

  const botonGenerar = (texto: string, Icono: typeof Sparkles, clase: string) => (
    <button onClick={crear} disabled={generar.isPending} className={`inline-flex items-center gap-2 rounded-xl font-body text-sm disabled:opacity-50 ${clase}`}>
      {generar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icono className="w-4 h-4" />} {texto}
    </button>
  );

  if (!ejemplos) {
    return (
      <div className="space-y-3">
        <p className="font-body text-sm text-foreground">
          La IA inventa {PERSONAS_POR_RONDA} perfiles que encajan con lo que busca salvo en una cosa cada uno: edad, estilo de vida, valores o
          ambición. Con quién se ve más dice qué le importa menos. No son personas reales y el cliente lo verá.
        </p>
        <div className="flex justify-end">
          {botonGenerar(`Generar ${PERSONAS_POR_RONDA} perfiles de ejemplo`, Sparkles, "px-4 py-2 bg-foreground text-background font-semibold hover:opacity-90")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="font-body text-xs text-amber-700">
        Lo leerá el cliente: revisa cómo es cada perfil y, si quieres, añade una frase. Nada de religión, política, salud ni aspecto físico.
      </p>
      <ul className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
        {ejemplos.map((e, i) => (
          <li key={i} className="rounded-xl border border-border p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="font-body text-sm text-foreground"><span className="font-semibold">{e.nombre}, {e.edad}</span>{e.zona && ` · ${e.zona}`}</p>
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 font-body text-[11px] text-muted-foreground">Cambia: {etiqueta(e).toLowerCase()}</span>
            </div>
            {e.aficiones && <p className="font-body text-xs text-muted-foreground">{e.aficiones}</p>}
            <textarea
              rows={2}
              value={e.rasgo}
              maxLength={MAX_RASGO}
              onChange={(ev) => cambiar(i, "rasgo", ev.target.value)}
              aria-label={`Cómo es ${e.nombre}`}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm resize-none"
            />
            <input
              value={e.frase ?? ""}
              onChange={(ev) => cambiar(i, "frase", ev.target.value)}
              maxLength={MAX_FRASE}
              placeholder="Por qué se lo proponemos, hablándole al cliente (opcional)"
              aria-label={`Frase para ${e.nombre}`}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm"
            />
            {e.cambio && <p className="font-body text-[11px] text-muted-foreground">Solo para ti (no se envía): {e.cambio}</p>}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {botonGenerar("Generar otros", RefreshCw, "px-3 py-2 border border-border text-foreground hover:bg-muted")}
        <button
          onClick={mandar}
          disabled={!!problema || enviar.isPending}
          title={problema ?? undefined}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background font-body text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {enviar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Enviar ronda de ejemplo
        </button>
      </div>
    </div>
  );
};

// Con personas reales o con perfiles de ejemplo. Abre en ejemplo mientras no haya 4 personas con permiso (T19.1).
const Nueva = ({ perfilId, sugerencias, cerrar }: { perfilId: string; sugerencias: Sugerencia[]; cerrar: () => void }) => {
  const conPermiso = sugerencias.filter((s) => s.estado === "pendiente" && puedeProponerse(s)).length;
  const [modo, setModo] = useState<"reales" | "ejemplo">(conPermiso >= PERSONAS_POR_RONDA ? "reales" : "ejemplo");
  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Tipo de ronda" className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {(["reales", "ejemplo"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={modo === m}
            onClick={() => setModo(m)}
            className={`rounded-lg px-3 py-1.5 font-body text-sm ${modo === m ? "bg-background text-foreground font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {m === "reales" ? "Personas reales" : "Perfiles de ejemplo"}
          </button>
        ))}
      </div>
      {modo === "reales"
        ? <NuevaRonda perfilId={perfilId} sugerencias={sugerencias} cerrar={cerrar} />
        : <NuevaRondaEjemplo perfilId={perfilId} cerrar={cerrar} />}
    </div>
  );
};

/** T19.2 · Ronda de 4 propuestas para que el cliente diga con quién se ve más (lo verá en su área, T19.3). */
const RondaPropuestas = ({ perfilId, sugerencias }: { perfilId: string; sugerencias: Sugerencia[] }) => {
  const [abierto, setAbierto] = useState(false);
  const { data: rondas = [] } = useRondas(perfilId);
  const abierta = rondas.find((r) => r.estado === "abierta" && new Date(r.caduca_at) > new Date());
  const ultima = rondas.find((r) => r.estado === "respondida" || r.estado === "caducada");

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className={`px-4 py-2 rounded-xl font-body text-sm font-semibold inline-flex items-center gap-2 border ${abierta ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "border-border text-foreground hover:bg-muted"}`}
      >
        <Users className="w-4 h-4" /> {abierta ? `Ronda enviada · caduca el ${fecha(abierta.caduca_at)}` : "Ronda de propuestas"}
      </button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{abierta ? "Ronda de propuestas enviada" : "Enviar una ronda de propuestas"}</DialogTitle>
            <DialogDescription className="font-body">
              {PERSONAS_POR_RONDA} personas, o perfiles de ejemplo, para que diga con quién se ve más. Elegir no crea un match: nadie más lo sabe.
            </DialogDescription>
          </DialogHeader>
          {!abierta && ultima && (
            <p className="font-body text-sm text-foreground rounded-lg bg-muted px-3 py-2">
              Última ronda{ultima.de_ejemplo ? " de ejemplo" : ""} ({fecha(ultima.enviada_at)}): {resultado(ultima, sugerencias)}
            </p>
          )}
          {abierto && (abierta
            ? <RondaAbierta ronda={abierta} sugerencias={sugerencias} />
            : <Nueva perfilId={perfilId} sugerencias={sugerencias} cerrar={() => setAbierto(false)} />)}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RondaPropuestas;
