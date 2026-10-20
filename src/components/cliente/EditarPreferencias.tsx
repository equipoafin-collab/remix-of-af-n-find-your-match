import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { useActualizarMiPerfil } from "@/hooks/cliente/useMiArea";
import { CAMPOS_EDITABLES, errorPreferencias, type MiPerfil, type Preferencias } from "@/lib/cuestionario";
import { MAX_VALORES, PROVINCIAS, VALORES_IMPORTANTES } from "@/lib/preguntasClave";
import { botonDorado } from "./estilos";

const campo = "w-full px-4 py-3 rounded-2xl border border-border bg-background font-body text-sm focus:outline-none focus:ring-2 focus:ring-gold/50";
const etiqueta = "block font-body text-xs text-muted-foreground mb-1.5";

const preferenciasDe = (p: MiPerfil) => Object.fromEntries(CAMPOS_EDITABLES.map((c) => [c, p[c]])) as Preferencias;

// Se monta al abrir: siempre empieza con lo guardado.
const Formulario = ({ perfil, cerrar }: { perfil: MiPerfil; cerrar: () => void }) => {
  const guardar = useActualizarMiPerfil();
  const [p, setP] = useState<Preferencias>(() => ({ ...preferenciasDe(perfil), valores_importantes: perfil.valores_importantes ?? [] }));
  const [error, setError] = useState("");

  const cambiar = <K extends keyof Preferencias>(campo: K, valor: Preferencias[K]) => {
    setP((actual) => ({ ...actual, [campo]: valor }));
    setError("");
  };
  const alternarValor = (v: string) => {
    const valores = p.valores_importantes;
    if (valores.includes(v)) cambiar("valores_importantes", valores.filter((x) => x !== v));
    else if (valores.length < MAX_VALORES) cambiar("valores_importantes", [...valores, v]);
  };
  const edad = (texto: string) => (texto === "" ? null : Number(texto));

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const problema = errorPreferencias(p);
    if (problema) return setError(problema);
    guardar.mutate(p, {
      onSuccess: (cambiados) => {
        toast({ title: cambiados.length ? "Preferencias guardadas" : "No había nada que cambiar", description: cambiados.length ? "Tu psicóloga lo verá en tu ficha." : undefined });
        cerrar();
      },
      onError: (e) => setError(e.message),
    });
  };

  return (
    <form onSubmit={enviar} className="space-y-5 mt-4" noValidate>
      <div>
        <label htmlFor="zona" className={etiqueta}>Provincia</label>
        <select id="zona" value={p.zona ?? ""} onChange={(e) => cambiar("zona", e.target.value)} className={campo}>
          <option value="" disabled>Elige tu provincia</option>
          {PROVINCIAS.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
      </div>
      <label className="flex items-center justify-between gap-4">
        <span className="font-body text-sm text-foreground">¿Aceptas personas de otras provincias?</span>
        <Switch checked={p.acepta_otras_zonas} onCheckedChange={(v) => cambiar("acepta_otras_zonas", v)} />
      </label>
      <fieldset>
        <legend className={etiqueta}>Edad que buscas</legend>
        <div className="flex items-center gap-3">
          <input type="number" inputMode="numeric" min={18} max={99} aria-label="Edad mínima" value={p.edad_min_busca ?? ""} onChange={(e) => cambiar("edad_min_busca", edad(e.target.value))} className={campo} />
          <span className="font-body text-sm text-muted-foreground">a</span>
          <input type="number" inputMode="numeric" min={18} max={99} aria-label="Edad máxima" value={p.edad_max_busca ?? ""} onChange={(e) => cambiar("edad_max_busca", edad(e.target.value))} className={campo} />
        </div>
      </fieldset>
      <fieldset>
        <legend className={etiqueta}>Tus valores más importantes (hasta {MAX_VALORES})</legend>
        <div className="flex flex-wrap gap-2">
          {VALORES_IMPORTANTES.map((v) => {
            const elegido = p.valores_importantes.includes(v);
            return (
              <button
                key={v}
                type="button"
                aria-pressed={elegido}
                onClick={() => alternarValor(v)}
                className={`px-3 py-1.5 rounded-full border font-body text-sm transition-colors ${elegido ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:bg-muted"}`}
              >
                {v}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div>
        <label htmlFor="hobbies" className={etiqueta}>Tus aficiones e intereses</label>
        <textarea id="hobbies" rows={4} maxLength={1000} value={p.hobbies ?? ""} onChange={(e) => cambiar("hobbies", e.target.value)} className={`${campo} resize-none`} />
      </div>
      {error && <p role="alert" className="font-body text-sm text-rose-700">{error}</p>}
      <button type="submit" disabled={guardar.isPending} className={`${botonDorado} w-full`}>
        {guardar.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Guardar cambios
      </button>
    </form>
  );
};

/** T16.2 · Editar sus preferencias: provincia, otras provincias, edad que busca, valores y aficiones. */
const EditarPreferencias = ({ perfil, abierto, cambiarAbierto }: { perfil: MiPerfil; abierto: boolean; cambiarAbierto: (v: boolean) => void }) => (
  <Sheet open={abierto} onOpenChange={cambiarAbierto}>
    <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl">
      <SheetHeader className="text-left">
        <SheetTitle className="font-display text-2xl">Tus <em className="italic font-normal">preferencias</em></SheetTitle>
        <SheetDescription className="font-body">Al guardarlas, tu psicóloga recibe un aviso y tus propuestas se recalculan.</SheetDescription>
      </SheetHeader>
      {abierto && <Formulario perfil={perfil} cerrar={() => cambiarAbierto(false)} />}
    </SheetContent>
  </Sheet>
);

export default EditarPreferencias;
