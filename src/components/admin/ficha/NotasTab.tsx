import { useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useUpdatePerfil } from "@/hooks/admin/usePerfiles";
import type { Perfil } from "@/types/admin";

// Nota única (notas_admin) hasta que T2.2 la convierta en historial.
// Se monta con key={perfil.id}: el texto arranca con lo guardado y un refetch no pisa lo que se escribe.
const NotasTab = ({ perfil }: { perfil: Perfil }) => {
  const [notas, setNotas] = useState(perfil.notas_admin || "");
  const updatePerfil = useUpdatePerfil();

  const guardar = () =>
    updatePerfil.mutate(
      { id: perfil.id, cambios: { notas_admin: notas } },
      {
        onSuccess: () => toast({ title: "Guardado", description: "Notas actualizadas." }),
        onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
      },
    );

  return (
    <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <h3 className="font-display text-sm font-semibold text-foreground">Notas privadas (solo admin)</h3>
      <textarea
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        rows={8}
        placeholder="Ej: Muy implicado, busca matrimonio pronto, excelente candidato…"
        className="w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm resize-y"
      />
      <button
        onClick={guardar}
        disabled={updatePerfil.isPending}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background font-body text-sm font-semibold hover:opacity-90 disabled:opacity-50"
      >
        {updatePerfil.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar notas
      </button>
    </section>
  );
};

export default NotasTab;
