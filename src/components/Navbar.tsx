import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleAnchor = (hash: string) => {
    setIsOpen(false);
    if (location.pathname !== "/") {
      navigate("/" + hash);
    } else {
      const el = document.querySelector(hash);
      el?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleCTA = () => {
    setIsOpen(false);
    navigate("/quiz");
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50"
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="font-display text-2xl font-bold text-primary tracking-tight">
          Afín
        </a>

        <div className="hidden md:flex items-center gap-8">
          <button onClick={() => { setIsOpen(false); navigate("/quienes-somos"); }} className="text-sm font-body font-semibold text-foreground hover:text-primary transition-colors">
            Quiénes somos
          </button>
          <button onClick={() => handleAnchor("#como-funciona")} className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors">
            Cómo funciona
          </button>
          <button onClick={() => handleAnchor("#diferencia")} className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors">
            Nuestra diferencia
          </button>
          <button onClick={() => handleAnchor("#testimonios")} className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors">
            Testimonios
          </button>
          <button onClick={() => handleAnchor("#precios")} className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors">
            Precios
          </button>
          <button onClick={handleCTA} className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            Comenzar
          </button>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-foreground"
          aria-label="Menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M3 12h18M3 6h18M3 18h18" />
            )}
          </svg>
        </button>
      </div>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="md:hidden bg-background border-t border-border px-6 py-4 flex flex-col gap-4"
        >
          <button onClick={() => { setIsOpen(false); navigate("/quienes-somos"); }} className="text-sm font-semibold text-foreground text-left">Quiénes somos</button>
          <button onClick={() => handleAnchor("#como-funciona")} className="text-sm text-muted-foreground text-left">Cómo funciona</button>
          <button onClick={() => handleAnchor("#diferencia")} className="text-sm text-muted-foreground text-left">Nuestra diferencia</button>
          <button onClick={() => handleAnchor("#testimonios")} className="text-sm text-muted-foreground text-left">Testimonios</button>
          <button onClick={() => handleAnchor("#precios")} className="text-sm text-muted-foreground text-left">Precios</button>
          
          <button onClick={handleCTA} className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium w-full">
            Comenzar
          </button>
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;
