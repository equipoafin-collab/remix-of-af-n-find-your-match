import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import BuscadorPerfil from "@/components/admin/BuscadorPerfil";
import CompartirEnlace from "@/components/admin/CompartirEnlace";
import { useCrearMatch } from "@/hooks/admin/useMatches";
import { usePerfil } from "@/hooks/admin/usePerfiles";
import { avisoNuevoMatch, limpiarMotivos, MAX_MOTIVOS_CLIENTE, nuevoMatchManual } from "@/lib/matches";
import type { Cliente } from "@/types/admin";

const campo = "mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm";
const etiqueta = "font-body text-xs text-muted-foreground uppercase tracking-wider";
const sinArea = "aún no tiene área (le falta el plan pagado): lo verá cuando lo tenga.";

type Creado = { otro: Cliente; conCita: boolean };

// Se monta al abrir: cada vez empieza vacío.
const Formulario = ({ cliente, alCrear }: { cliente: Cliente; alCrear: (creado: Creado) => void }) => {
  const crear = useCrearMatch();
  const [otroId, setOtroId] = useState<string>();
  const { data: otro } = usePerfil(otroId); // de v_clientes: trae con_area
  const [texto, setTexto] = useState("");
  const [fecha, setFecha] = useState("");
  const [lugar, setLugar] = useState("");
  const motivos = limpiarMotivos(texto);

  const guardar = () => {
    if (!otro) return;
    const match = nuevoMatchManual({ perfilA: cliente.id, perfilB: otro.id, motivos, fechaCita: fecha ? new Date(fecha).toISOString() : null, lugar });
    crear.mutate(match, {
      onSuccess: () => alCrear({ otro, conCita: !!fecha }),
      onError: (e) => toast({ title: "No se pudo crear el match", description: e.message, variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <span className={etiqueta}>Con quién</span>
        <div className="mt-1">
          {otroId ? (
            <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-border bg-background">
              <p className="font-body text-sm">{otro?.nombre_completo ?? "Cargando…"} <span className="text-xs text-muted-foreground">{otro?.email}</span></p>
              <button onClick={() => setOtroId(undefined)} className="text-muted-foreground hover:text-foreground" title="Cambiar de persona">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <BuscadorPerfil
              onSelect={(p) => (p.id === cliente.id ? toast({ title: "Elige a otra persona", variant: "destructive" }) : setOtroId(p.id))}
            />
          )}
        </div>
        {[cliente, otro].filter((p): p is Cliente => !!p && !p.con_area).map((p) => (
          <p key={p.id} className="mt-1 font-body text-xs text-amber-700">{p.nombre_completo} {sinArea}</p>
        ))}
      </div>

      <label className="block">
        <span className={etiqueta}>Por qué os hemos presentado (uno por línea, hasta {MAX_MOTIVOS_CLIENTE})</span>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={4}
          className={campo}
          placeholder={"Los dos queréis formar una familia\nPlanes activos el fin de semana"}
        />
      </label>
      <p className="font-body text-xs text-amber-700">
        Lo leerán los dos: no pongas religión, política, salud, apellidos ni datos de contacto.
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className={etiqueta}>Cita (opcional)</span>
          <input aria-label="Fecha y hora de la cita" type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} className={campo} />
        </label>
        <label className="block">
          <span className={etiqueta}>Lugar</span>
          <input aria-label="Lugar" value={lugar} onChange={(e) => setLugar(e.target.value)} maxLength={200} placeholder="Opcional" className={campo} />
        </label>
      </div>

      <div className="flex justify-end">
        <button
          onClick={guardar}
          disabled={!otro || !motivos.length || crear.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background font-body text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {crear.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Crear y presentar a los dos
        </button>
      </div>
    </div>
  );
};

/** Tras crearlo: el aviso para cada uno por correo o WhatsApp. La app aún no envía emails (Fase 12). */
const Avisos = ({ personas, conCita, cerrar }: { personas: Cliente[]; conCita: boolean; cerrar: () => void }) => {
  const enlace = `${window.location.origin}/mi-area/matches`;
  return (
    <div className="space-y-4">
      <p className="font-body text-sm text-foreground">
        Match creado{conCita ? " con su cita" : ""}. Ya está en su área: avisa a cada uno para que entre a verlo.
      </p>
      {window.location.hostname === "localhost" && (
        <p className="font-body text-xs text-rose-700">Estás en local: el enlace apunta a localhost y no les funcionará.</p>
      )}
      {personas.map((p) => (
        <div key={p.id} className="space-y-2">
          <p className="font-body text-sm font-semibold text-foreground">{p.nombre_completo}</p>
          {p.con_area ? (
            <CompartirEnlace
              enlace={enlace}
              email={p.email?.trim() ?? ""}
              etiqueta={`Enlace para ${p.nombre_completo}`}
              asunto="Tienes un nuevo match en Afín"
              cuerpo={avisoNuevoMatch(p.nombre_completo, enlace, conCita)}
            />
          ) : (
            <p className="font-body text-xs text-amber-700">Sin aviso: {sinArea}</p>
          )}
        </div>
      ))}
      <div className="flex justify-end">
        <button onClick={cerrar} className="px-4 py-2 rounded-xl border border-border font-body text-sm text-foreground hover:bg-muted">Listo</button>
      </div>
    </div>
  );
};

/** T6.6 · La psicóloga empareja al cliente con quien elija, sin pasar por las sugerencias, y se lo presenta a los dos. */
const CrearMatch = ({ perfilId }: { perfilId: string }) => {
  const { data: cliente } = usePerfil(perfilId); // la misma consulta que la ficha: ya está en caché
  const [abierto, setAbierto] = useState(false);
  const [creado, setCreado] = useState<Creado | null>(null);
  const cambiar = (abrir: boolean) => {
    setAbierto(abrir);
    if (!abrir) setCreado(null);
  };
  if (!cliente) return null;

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gold text-accent-foreground text-xs font-body font-semibold"
      >
        <Plus className="w-3.5 h-3.5" /> Crear match
      </button>
      <Dialog open={abierto} onOpenChange={cambiar}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Crear match para {cliente.nombre_completo}</DialogTitle>
            <DialogDescription className="font-body">
              Elige con quién. Al crearlo, los dos lo ven en su área con el nombre de pila, la edad, la zona, la foto y las aficiones del otro, estos motivos y la cita si la pones.
            </DialogDescription>
          </DialogHeader>
          {abierto && (creado
            ? <Avisos personas={[cliente, creado.otro]} conCita={creado.conCita} cerrar={() => cambiar(false)} />
            : <Formulario cliente={cliente} alCrear={setCreado} />)}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CrearMatch;
