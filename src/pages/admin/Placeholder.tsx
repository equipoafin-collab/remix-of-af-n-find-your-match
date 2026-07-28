import { Construction } from "lucide-react";

const Placeholder = ({ title, description }: { title: string; description: string }) => (
  <div className="p-8">
    <div className="max-w-xl mx-auto mt-16 bg-card border border-border rounded-2xl p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-gold/15 flex items-center justify-center mx-auto mb-4">
        <Construction className="w-6 h-6 text-gold" />
      </div>
      <h1 className="font-display text-xl font-bold text-foreground">{title}</h1>
      <p className="font-body text-sm text-muted-foreground mt-2">{description}</p>
      <p className="font-body text-xs text-muted-foreground/70 mt-4">
        Disponible en la Fase 2 del CRM.
      </p>
    </div>
  </div>
);

export default Placeholder;
