import { useState } from "react";
import { Check, ExternalLink, CreditCard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface PlanInfo {
  name: string;
  price: string;
  period: string;
  features: string[];
  calendlyUrl: string;
}

const PLANS: Record<"esencial" | "premium", PlanInfo> = {
  esencial: {
    name: "Esencial",
    price: "160",
    period: "/mes",
    features: [
      "1 sesión mensual de 60 minutos con especialista",
      "Presentaciones a candidatos compatibles contigo en restaurantes de tu ciudad",
      "Feedback personal tras la cita, incluyendo la perspectiva de la otra parte",
    ],
    calendlyUrl: "https://calendly.com/equipo-afin/30min",
  },
  premium: {
    name: "Premium",
    price: "250",
    period: "/mes",
    features: [
      "2 sesiones mensuales con especialistas",
      "Presentaciones prioritarias frente a candidatos con perfil similar",
      "✦ Verificación completa de antecedentes penales — exclusivo Premium",
      "Feedback detallado y recomendaciones personalizadas tras cada cita",
      "Formulario de compatibilidad con cada persona que te vamos a presentar",
    ],
    calendlyUrl: "https://calendly.com/equipo-afin/30min",
  },
};

interface Props {
  plan: "esencial" | "premium" | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PlanBookingDialog = ({ plan, open, onOpenChange }: Props) => {
  const [consent, setConsent] = useState(false);

  if (!plan) return null;
  const info = PLANS[plan];

  const handleBook = () => {
    // TODO: integrate Stripe payment here before redirecting
    window.open(info.calendlyUrl, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setConsent(false); }}>
      <DialogContent className="sm:max-w-md rounded-2xl border-border bg-background">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-bold text-foreground">
            Plan {info.name}
          </DialogTitle>
          <DialogDescription className="font-body text-sm text-muted-foreground">
            Revisa los detalles del plan antes de reservar tu sesión.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Price */}
          <div className="flex items-baseline gap-1">
            <span className="font-display text-4xl font-bold text-foreground">€{info.price}</span>
            <span className="font-body text-sm text-muted-foreground">{info.period}</span>
          </div>

          {/* Features */}
          <ul className="space-y-2.5">
            {info.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 font-body text-sm text-foreground">
                <Check className="w-4 h-4 mt-0.5 shrink-0 text-gold" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          {/* Payment placeholder */}
          <div className="rounded-xl border border-border bg-muted/40 p-4 flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-body text-sm font-medium text-foreground">Pago seguro</p>
              <p className="font-body text-xs text-muted-foreground">
                El pago se activará próximamente. Por ahora puedes reservar tu sesión directamente.
              </p>
            </div>
          </div>

          {/* LOPD Consent */}
          <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-border bg-card p-4">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 w-5 h-5 accent-[hsl(var(--ring))] rounded shrink-0"
            />
            <span className="font-body text-xs text-muted-foreground leading-relaxed">
              He leído y acepto la{" "}
              <a href="/privacidad" target="_blank" className="text-gold underline hover:opacity-80">
                política de privacidad
              </a>{" "}
              y los{" "}
              <a href="/terminos" target="_blank" className="text-gold underline hover:opacity-80">
                términos y condiciones
              </a>
              . Consiento el tratamiento de mis datos conforme al RGPD/LOPDGDD para el servicio de
              compatibilidad de Afín.
            </span>
          </label>

          {/* CTA */}
          <button
            onClick={handleBook}
            disabled={!consent}
            className="w-full group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-gold to-warm text-white font-body font-semibold text-sm shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            Reservar sesión <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlanBookingDialog;
