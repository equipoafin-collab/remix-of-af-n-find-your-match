import { rotuloClaro } from "@/components/cliente/estilos";

/** Secciones del área que aún no están hechas (Fases 16-19). */
const Proximamente = ({ titulo }: { titulo: string }) => (
  <section className="bg-card border border-border rounded-2xl px-5 py-10 text-center space-y-2">
    <p className={rotuloClaro}>Muy pronto</p>
    <h1 className="font-display text-2xl font-bold text-foreground">{titulo}</h1>
    <p className="font-body text-sm text-muted-foreground">Estamos preparando esta parte de tu área.</p>
  </section>
);

export default Proximamente;
