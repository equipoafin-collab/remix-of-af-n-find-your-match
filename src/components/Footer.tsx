const Footer = () => {
  return (
    <footer className="py-12 bg-background border-t border-border">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="font-display text-xl font-bold text-primary">Afín</div>
        <div className="flex items-center gap-6 font-body text-sm text-muted-foreground">
          <a href="/privacidad" className="hover:text-foreground transition-colors">Privacidad</a>
          <a href="/terminos" className="hover:text-foreground transition-colors">Términos</a>
          <a href="/aviso-legal" className="hover:text-foreground transition-colors">Aviso Legal</a>
        </div>
        <p className="font-body text-sm text-muted-foreground">
          © 2026 Afín. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
