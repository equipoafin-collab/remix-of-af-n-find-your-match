import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import FotoPerfil from "@/components/admin/FotoPerfil";
import { botonDorado, rotulo, rotuloClaro } from "@/components/cliente/estilos";
import { useMiRonda, useResponderRonda } from "@/hooks/cliente/useMiArea";
import { toast } from "@/hooks/use-toast";
import type { ContextoArea } from "@/lib/areaCliente";
import { diasParaCaducar, MOTIVOS_NINGUNA, motivoNinguna, type MiRonda, type PersonaPropuesta } from "@/lib/propuestas";

const Tarjeta = ({ p, elegida, elegir }: { p: PersonaPropuesta; elegida: boolean; elegir: () => void }) => (
  <button
    type="button"
    onClick={elegir}
    aria-pressed={elegida}
    className={`text-left rounded-2xl p-3 flex flex-col gap-1.5 transition-colors ${elegida ? "border-2 border-gold bg-gold/10" : "border border-primary-foreground/20 bg-primary-foreground/5 hover:bg-primary-foreground/10"}`}
  >
    <div className="flex items-center justify-between">
      <FotoPerfil path={p.foto_url} nombre={p.nombre} className="w-12 h-12 rounded-full text-base text-foreground" />
      {elegida && <span className="w-6 h-6 rounded-full bg-gold text-accent-foreground flex items-center justify-center"><Check className="w-4 h-4" /></span>}
    </div>
    <p className="font-display text-lg font-bold text-primary-foreground leading-tight">{p.nombre}, {p.edad}</p>
    {p.zona && <p className="font-body text-xs text-primary-foreground/60">{p.zona}</p>}
    {p.aficiones && <p className="font-body text-xs text-primary-foreground/80 line-clamp-2">{p.aficiones}</p>}
    {p.frase && <p className="font-display italic text-sm text-gold leading-snug">{p.frase}</p>}
  </button>
);

const RondaAbierta = ({ ronda }: { ronda: Extract<MiRonda, { estado: "abierta" }> }) => {
  const responder = useResponderRonda();
  const [elegida, setElegida] = useState<PersonaPropuesta | null>(null);
  const [ninguna, setNinguna] = useState(false);
  const [chips, setChips] = useState<string[]>([]);
  const [texto, setTexto] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  const dias = diasParaCaducar(ronda.caduca_at);
  const motivo = motivoNinguna(chips, texto);

  const enviar = () =>
    responder.mutate(
      { rondaId: ronda.id, elegido: ninguna ? null : elegida?.id ?? null, motivo: ninguna ? motivo : "" },
      {
        onSuccess: () => toast({ title: "Enviado", description: "Tu psicóloga lo revisará y te contará." }),
        onError: (e) => toast({ title: "No se pudo enviar", description: e.message, variant: "destructive" }),
      },
    );

  return (
    <section className="bg-primary rounded-3xl px-4 py-6 space-y-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-gold/10 -translate-y-1/2 translate-x-1/3" />
      <div className="relative space-y-2">
        <p className={rotulo}>Propuesta de tu psicóloga</p>
        <h1 className="font-display text-3xl font-bold text-primary-foreground leading-tight">¿Con quién te <em className="italic font-normal">ves más</em>?</h1>
        <p className="font-body text-sm text-primary-foreground/70">
          {ronda.personas.length} {ronda.personas.length === 1 ? "persona elegida" : "personas elegidas"} para ti · {dias === 1 ? "queda 1 día" : `quedan ${dias} días`}
        </p>
      </div>

      {ronda.personas.length ? (
        <div className="relative grid grid-cols-2 gap-2">
          {ronda.personas.map((p) => (
            <Tarjeta key={p.id} p={p} elegida={!ninguna && elegida?.id === p.id} elegir={() => { setElegida(p); setNinguna(false); }} />
          ))}
        </div>
      ) : (
        <p className="relative font-body text-sm text-primary-foreground/80">Las personas de esta propuesta ya no están disponibles. Tu psicóloga te preparará otra.</p>
      )}

      {ninguna && (
        <div className="relative rounded-2xl border border-primary-foreground/20 p-3 space-y-2">
          <p className="font-body text-sm text-primary-foreground">¿Por qué no te encaja ninguna?</p>
          <div className="flex flex-wrap gap-2">
            {MOTIVOS_NINGUNA.map((m) => {
              const activo = chips.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => setChips((c) => (activo ? c.filter((x) => x !== m) : [...c, m]))}
                  className={`px-3 py-1.5 rounded-full border font-body text-sm ${activo ? "bg-gold text-accent-foreground border-gold" : "border-primary-foreground/30 text-primary-foreground"}`}
                >
                  {m}
                </button>
              );
            })}
          </div>
          <textarea
            rows={2}
            maxLength={300}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Si quieres, cuéntanos algo más"
            aria-label="Cuéntanos algo más"
            className="w-full px-4 py-2.5 rounded-2xl bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/40 font-body text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gold/50"
          />
        </div>
      )}

      <div className="relative space-y-2">
        <button
          onClick={() => setConfirmar(true)}
          disabled={responder.isPending || (ninguna ? !motivo : !elegida)}
          className={`${botonDorado} w-full`}
        >
          {responder.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {ninguna ? "Enviar a tu psicóloga" : elegida ? `Me veo más con ${elegida.nombre}` : "Elige a una persona"}
        </button>
        <button
          onClick={() => { setNinguna(!ninguna); setElegida(null); }}
          className="w-full py-2 font-body text-sm text-primary-foreground/80 hover:text-primary-foreground"
        >
          {ninguna ? "Volver a las propuestas" : "Ninguna me encaja"}
        </button>
        <p className="font-body text-xs text-primary-foreground/60 text-center">Tu psicóloga lo revisará y te contará. Ellos no sabrán nada.</p>
      </div>

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">{ninguna ? "¿Ninguna te encaja?" : `¿Te ves más con ${elegida?.nombre}?`}</AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              Solo se puede responder una vez. Tu psicóloga lo revisará y te contará; no se crea ninguna cita todavía.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={enviar}>Sí, enviar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

/** T19.3 · "¿Con quién te ves más?": su ronda de propuestas; una vez respondida, solo lo que eligió. */
const PropuestasCliente = () => {
  const { userId } = useOutletContext<ContextoArea>();
  const ronda = useMiRonda(userId);

  if (ronda.isPending) return <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto mt-10" aria-label="Cargando" />;
  if (ronda.isError) return <p className="font-body text-sm text-rose-700 text-center mt-10">No hemos podido cargar tus propuestas. Vuelve a intentarlo en un momento.</p>;

  const r = ronda.data;
  if (r?.estado === "abierta") return <RondaAbierta ronda={r} />;

  return (
    <div className="space-y-4">
      <header>
        <p className={rotuloClaro}>Propuestas</p>
        <h1 className="font-display text-3xl font-bold text-foreground leading-tight">Tus <em className="italic font-normal">propuestas</em></h1>
      </header>
      <section className="bg-card border border-border rounded-2xl p-5 space-y-1">
        {r?.estado === "respondida" ? (
          <>
            <p className="font-display text-lg font-bold text-foreground">
              {r.ninguno ? "Nos has dicho que ninguna te encajaba" : <>Te ves más con <em className="italic font-normal">{r.elegido ?? "esa persona"}</em></>}
            </p>
            <p className="font-body text-sm text-muted-foreground">
              {r.ninguno ? "Tu psicóloga lo tendrá en cuenta para la próxima propuesta." : "Tu psicóloga lo revisará y te contará."}
            </p>
          </>
        ) : (
          <p className="font-body text-sm text-muted-foreground">Aún no tienes propuestas. Cuando tu psicóloga te prepare una, la verás aquí.</p>
        )}
      </section>
    </div>
  );
};

export default PropuestasCliente;
