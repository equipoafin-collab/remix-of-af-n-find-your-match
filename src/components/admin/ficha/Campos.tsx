import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export const Field = ({ label, value }: { label: string; value: ReactNode }) => (
  <div>
    <p className="font-body text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="font-body text-sm text-foreground mt-0.5">{value || <span className="text-muted-foreground/60">—</span>}</p>
  </div>
);

export const Section = ({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) => (
  <section className="bg-card border border-border rounded-2xl p-5">
    <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-gold" /> {title}
    </h3>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
  </section>
);

export const Scale = ({ label, value }: { label: string; value: number | null }) => (
  <div>
    <p className="font-body text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-gold" style={{ width: `${((value || 0) / 5) * 100}%` }} />
      </div>
      <span className="font-body text-xs text-muted-foreground tabular-nums">{value ?? 0}/5</span>
    </div>
  </div>
);
