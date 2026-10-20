import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/** Pantalla entera azul marino, como el final de la portada (CTASection): entrar, crear contraseña, plan terminado. */
const Pantalla = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen bg-primary relative overflow-hidden flex flex-col">
    <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-gold/10 -translate-y-1/2 translate-x-1/2" />
    <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-gold/5 translate-y-1/2 -translate-x-1/2" />
    <header className="relative z-10 pt-8 text-center">
      <Link to="/" className="font-display text-2xl font-bold text-primary-foreground">Afín</Link>
    </header>
    <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm text-center space-y-6">{children}</div>
    </main>
  </div>
);

export default Pantalla;
