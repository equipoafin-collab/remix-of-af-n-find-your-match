import { useState } from "react";
import { Loader2, Send, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useCancelarRonda, useEnviarRonda, useRondas } from "@/hooks/admin/usePropuestas";
import type { Sugerencia } from "@/hooks/admin/useSugerencias";
import { errorRonda, frasePorDefecto, MAX_FRASE, PERSONAS_POR_RONDA, preseleccionar, puedeProponerse } from "@/lib/propuestas";

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long" });
const onError = (error: Error) => toast({ title: "No se pudo", description: error.message, variant: "destructive" });
type Ronda = NonNullable<ReturnType<typeof useRondas>["data"]>[number];

const RondaAbierta = ({ ronda, sugerencias }: { ronda: Ronda; sugerencias: Sugerencia[] }) => {
  const cancelar = useCancelarRonda();
  const nombre = (id: string) => sugerencias.find((s) => s.candidato_id === id)?.candidato?.nombre_completo ?? "Persona ya no sugerida";
  return (
    <div className="space-y-3">
      <p className="font-body text-sm text-foreground">
        Enviada el {fecha(ronda.enviada_at)}; caduca el {fecha(ronda.caduca_at)} si no responde. Aún no ha elegido.
      </p>
      <ul className="font-body text-sm text-foreground list-disc pl-5">{ronda.candidatos.map((id) => <li key={id}>{nombre(id)}</li>)}</ul>
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

// Se monta al abrir: preselecciona las 4 mejores con permiso y su primer motivo como frase.
const NuevaRonda = ({ perfilId, sugerencias, cerrar }: { perfilId: string; sugerencias: Sugerencia[]; cerrar: () => void }) => {
  const enviar = useEnviarRonda();
  const pendientes = sugerencias.filter((s) => s.estado === "pendiente");
  const [elegidos, setElegidos] = useState<string[]>(() => preseleccionar(pendientes));
  const [frases, setFrases] = useState<Record<string, string>>(() =>
    Object.fromEntries(pendientes.map((s) => [s.candidato_id, frasePorDefecto(s.motivos)])),
  );
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
                <input
                  value={frases[s.candidato_id] ?? ""}
                  onChange={(e) => setFrases((f) => ({ ...f, [s.candidato_id]: e.target.value }))}
                  maxLength={MAX_FRASE}
                  placeholder="Por qué se lo proponemos (opcional)"
                  aria-label={`Frase para ${s.candidato?.nombre_completo}`}
                  className="mt-2 w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm"
                />
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

/** T19.2 · Ronda de 4 propuestas para que el cliente diga con quién se ve más (lo verá en su área, T19.3). */
const RondaPropuestas = ({ perfilId, sugerencias }: { perfilId: string; sugerencias: Sugerencia[] }) => {
  const [abierto, setAbierto] = useState(false);
  const { data: rondas = [] } = useRondas(perfilId);
  const abierta = rondas.find((r) => r.estado === "abierta" && new Date(r.caduca_at) > new Date());

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
              {PERSONAS_POR_RONDA} personas para que diga con quién se ve más. Elegir no crea un match: la otra persona no sabe nada.
            </DialogDescription>
          </DialogHeader>
          {abierto && (abierta
            ? <RondaAbierta ronda={abierta} sugerencias={sugerencias} />
            : <NuevaRonda perfilId={perfilId} sugerencias={sugerencias} cerrar={() => setAbierto(false)} />)}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RondaPropuestas;
