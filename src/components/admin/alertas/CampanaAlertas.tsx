import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAlertas, useAlertasSinVer } from "@/hooks/admin/useAlertas";
import { ListaAlertas } from "./ListaAlertas";

const MAX_EN_PANEL = 8;

/** Campana del menú con las alertas sin ver y un panel con las pendientes más importantes. */
const CampanaAlertas = () => {
  const { data: sinVer = 0 } = useAlertasSinVer();
  const { data: pendientes = [] } = useAlertas({ estado: "pendientes", limite: 50 });

  return (
    <Popover>
      <PopoverTrigger
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title={sinVer ? `${sinVer} alertas sin ver` : "Alertas"}
        aria-label={sinVer ? `${sinVer} alertas sin ver` : "Alertas"}
      >
        <Bell className="w-5 h-5" />
        {sinVer > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-body font-bold flex items-center justify-center">
            {sinVer > 99 ? "99+" : sinVer}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" side="right" className="w-96 p-0">
        <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
          <p className="font-display text-sm font-semibold text-foreground">Alertas</p>
          <Link to="/admin/alertas" className="font-body text-xs text-gold-texto hover:underline">Ver todas</Link>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          <ListaAlertas alertas={pendientes.slice(0, MAX_EN_PANEL)} mostrarCliente compacta vacio="No hay alertas pendientes." />
        </div>
        {pendientes.length > MAX_EN_PANEL && (
          <Link to="/admin/alertas" className="block px-3 py-2 border-t border-border font-body text-xs text-muted-foreground hover:text-foreground">
            y {pendientes.length - MAX_EN_PANEL} más…
          </Link>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default CampanaAlertas;
