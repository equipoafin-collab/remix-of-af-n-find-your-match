import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { motion } from "framer-motion";
import { LogOut, Sparkles, AlertTriangle, Heart, MessageCircle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

type Perfil = Tables<"perfiles">;
type DiscResult = Tables<"disc_results">;

interface CompatReport {
  score: number;
  nivel: string;
  resumen: string;
  fortalezas: string[];
  fricciones: string[];
  preguntas_sugeridas: string[];
  analisis_detallado: string;
}

interface DiscProfile {
  primary: string;
  secondary: string;
  percent_d: number;
  percent_i: number;
  percent_s: number;
  percent_c: number;
}

interface ReportResult {
  report: CompatReport;
  profiles: {
    a: { id: string; nombre: string; edad: number; ciudad: string; disc?: DiscProfile | null };
    b: { id: string; nombre: string; edad: number; ciudad: string; disc?: DiscProfile | null };
  };
}

const DISC_BAR_COLORS: Record<string, string> = {
  D: "bg-red-500",
  I: "bg-yellow-500",
  S: "bg-green-500",
  C: "bg-blue-500",
};

const DISC_BADGE_COLORS: Record<string, string> = {
  D: "bg-red-100 text-red-700",
  I: "bg-yellow-100 text-yellow-700",
  S: "bg-green-100 text-green-700",
  C: "bg-blue-100 text-blue-700",
};

const DISC_LABELS: Record<string, string> = {
  D: "Dominancia",
  I: "Influencia",
  S: "Estabilidad",
  C: "Cumplimiento",
};

const CompatibilityDashboard = () => {
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [discResults, setDiscResults] = useState<DiscResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedA, setSelectedA] = useState("");
  const [selectedB, setSelectedB] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<ReportResult | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/admin/login", { replace: true }); return; }
      const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
      if (!role) { await supabase.auth.signOut(); navigate("/admin/login", { replace: true }); return; }
      const [perfilesRes, discRes] = await Promise.all([
        supabase.from("perfiles").select("*").order("created_at", { ascending: false }),
        supabase.from("disc_results").select("*"),
      ]);
      setPerfiles(perfilesRes.data || []);
      setDiscResults(discRes.data || []);
      setLoading(false);
    };
    init();
  }, [navigate]);

  // Match DISC results to perfiles by email or name
  const discByPerfilId = useMemo(() => {
    const map: Record<string, DiscResult> = {};
    perfiles.forEach((p) => {
      const match = discResults.find(
        (d) => (p.email && d.email === p.email) || d.name === p.nombre_completo
      );
      if (match) map[p.id] = match;
    });
    return map;
  }, [perfiles, discResults]);

  const handleGenerate = async () => {
    if (!selectedA || !selectedB || selectedA === selectedB) {
      toast({ title: "Selecciona dos perfiles diferentes", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setResult(null);

    const { data, error } = await supabase.functions.invoke("compatibility-report", {
      body: { profile_id_1: selectedA, profile_id_2: selectedB },
    });

    setGenerating(false);
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || "No se pudo generar el informe", variant: "destructive" });
      return;
    }
    setResult(data as ReportResult);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  const handleExportPDF = () => {
    if (!result) return;
    const doc = new jsPDF();
    const margin = 20;
    let y = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - margin * 2;

    const addText = (text: string, size: number, bold = false, color: [number, number, number] = [30, 30, 30]) => {
      doc.setFontSize(size);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(text, maxWidth);
      if (y + lines.length * size * 0.5 > 280) { doc.addPage(); y = 20; }
      doc.text(lines, margin, y);
      y += lines.length * size * 0.45 + 4;
    };

    addText("Informe de Compatibilidad · Afín", 18, true, [180, 140, 60]);
    y += 4;
    addText(`${result.profiles.a.nombre}  ×  ${result.profiles.b.nombre}`, 13, false, [100, 100, 100]);
    y += 6;
    addText(`Score: ${result.report.score}% — ${result.report.nivel}`, 22, true);
    y += 2;
    addText(result.report.resumen, 11);
    y += 6;

    addText("Fortalezas", 14, true, [16, 185, 129]);
    result.report.fortalezas.forEach((f) => addText(`  ✓  ${f}`, 10));
    y += 4;

    addText("Posibles fricciones", 14, true, [251, 146, 60]);
    result.report.fricciones.forEach((f) => addText(`  ⚠  ${f}`, 10));
    y += 4;

    addText("Preguntas sugeridas", 14, true, [180, 140, 60]);
    result.report.preguntas_sugeridas.forEach((q, i) => addText(`  ${i + 1}. ${q}`, 10));
    y += 4;

    addText("Análisis detallado", 14, true);
    addText(result.report.analisis_detallado, 10);

    doc.save(`compatibilidad-${result.profiles.a.nombre}-${result.profiles.b.nombre}.pdf`);
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 60) return "text-gold";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const scoreBarColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-gold";
    if (score >= 40) return "bg-orange-400";
    return "bg-red-400";
  };

  if (loading) {
    return <main className="min-h-screen bg-background flex items-center justify-center"><p className="font-body text-muted-foreground">Cargando...</p></main>;
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-gold" />
          <h1 className="font-display text-xl font-bold text-foreground">Compatibilidad · Afín</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/admin")} className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors">
            ← Panel Admin
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Profile selector */}
        <div className="bg-card rounded-2xl border border-border p-6 mb-8">
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">Seleccionar perfiles</h2>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block font-body text-sm text-muted-foreground mb-1">Perfil A</label>
              <select value={selectedA} onChange={(e) => setSelectedA(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-3 font-body text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50">
                <option value="">Seleccionar...</option>
                {perfiles.filter((p) => p.id !== selectedB).map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre_completo} ({p.edad}, {p.ciudad})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-body text-sm text-muted-foreground mb-1">Perfil B</label>
              <select value={selectedB} onChange={(e) => setSelectedB(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-3 font-body text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50">
                <option value="">Seleccionar...</option>
                {perfiles.filter((p) => p.id !== selectedA).map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre_completo} ({p.edad}, {p.ciudad})</option>
                ))}
              </select>
            </div>
          </div>
          {/* DISC profiles for selected users */}
          {(selectedA || selectedB) && (
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              {[selectedA, selectedB].map((id, idx) => {
                const disc = id ? discByPerfilId[id] : null;
                const perfil = perfiles.find((p) => p.id === id);
                const label = idx === 0 ? "A" : "B";
                return (
                  <div key={label} className="rounded-xl border border-border bg-muted/30 p-4">
                    <p className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-2">
                      DISC · Perfil {label}{perfil ? ` — ${perfil.nombre_completo}` : ""}
                    </p>
                    {disc ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${DISC_BADGE_COLORS[disc.primary_style] || ""}`}>
                            {disc.primary_style} — {DISC_LABELS[disc.primary_style] || disc.primary_style}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DISC_BADGE_COLORS[disc.secondary_style] || ""}`}>
                            {disc.secondary_style}
                          </span>
                        </div>
                        {(["D", "I", "S", "C"] as const).map((type) => {
                          const pct = disc[`percent_${type.toLowerCase()}` as keyof DiscResult] as number;
                          return (
                            <div key={type} className="flex items-center gap-2">
                              <span className="font-body text-xs font-semibold text-foreground w-4">{type}</span>
                              <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                                <div className={`h-full rounded-full ${DISC_BAR_COLORS[type]}`} style={{ width: `${Math.round(pct)}%` }} />
                              </div>
                              <span className="font-body text-xs text-muted-foreground w-8 text-right">{Math.round(pct)}%</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="font-body text-xs text-muted-foreground italic">
                        {id ? "Sin test DISC completado" : "Selecciona un perfil"}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <button onClick={handleGenerate} disabled={generating || !selectedA || !selectedB} className="px-6 py-3 rounded-full bg-gold text-accent-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
            {generating ? "Generando informe..." : "Generar informe de compatibilidad"}
          </button>
        </div>

        {/* Report */}
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Export button */}
            <div className="flex justify-end">
              <button onClick={handleExportPDF} className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-border bg-card text-foreground text-sm font-medium hover:bg-accent transition-colors">
                <Download className="w-4 h-4" /> Exportar PDF
              </button>
            </div>
            <div className="bg-card rounded-2xl border border-border p-8 text-center">
              <p className="font-body text-sm text-muted-foreground mb-2">
                {result.profiles.a.nombre} × {result.profiles.b.nombre}
              </p>
              <div className={`font-display text-6xl font-bold ${scoreColor(result.report.score)} mb-2`}>
                {result.report.score}%
              </div>
              <div className="inline-block px-4 py-1 rounded-full bg-gold/15 text-gold text-sm font-medium mb-4">
                {result.report.nivel}
              </div>
              <div className="w-full bg-border rounded-full h-3 mb-4 max-w-md mx-auto">
                <div className={`h-3 rounded-full transition-all duration-700 ${scoreBarColor(result.report.score)}`} style={{ width: `${result.report.score}%` }} />
              </div>
              <p className="font-body text-muted-foreground max-w-lg mx-auto">{result.report.resumen}</p>
            </div>

            {/* DISC Compatibility Summary */}
            {(result.profiles.a.disc || result.profiles.b.disc) && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Sparkles className="w-5 h-5 text-gold" />
                  <h3 className="font-display text-lg font-semibold text-foreground">Compatibilidad DISC</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  {[
                    { label: result.profiles.a.nombre, disc: result.profiles.a.disc },
                    { label: result.profiles.b.nombre, disc: result.profiles.b.disc },
                  ].map(({ label, disc }) => (
                    <div key={label} className="space-y-3">
                      <p className="font-body text-sm font-semibold text-foreground">{label}</p>
                      {disc ? (
                        <>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${DISC_BADGE_COLORS[disc.primary] || ""}`}>
                              {disc.primary} — {DISC_LABELS[disc.primary] || disc.primary}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DISC_BADGE_COLORS[disc.secondary] || ""}`}>
                              {disc.secondary}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {(["D", "I", "S", "C"] as const).map((type) => {
                              const key = `percent_${type.toLowerCase()}` as keyof DiscProfile;
                              const pct = disc[key] as number;
                              return (
                                <div key={type} className="flex items-center gap-2">
                                  <span className="font-body text-xs font-semibold text-foreground w-4">{type}</span>
                                  <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                                    <div className={`h-full rounded-full ${DISC_BAR_COLORS[type]}`} style={{ width: `${Math.round(pct)}%` }} />
                                  </div>
                                  <span className="font-body text-xs text-muted-foreground w-8 text-right">{Math.round(pct)}%</span>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <p className="font-body text-xs text-muted-foreground italic">Sin test DISC completado</p>
                      )}
                    </div>
                  ))}
                </div>
                {result.profiles.a.disc && result.profiles.b.disc && (
                  <div className="mt-5 pt-5 border-t border-border">
                    <p className="font-body text-sm text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-foreground">{result.profiles.a.nombre}</span> tiene perfil{" "}
                      <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${DISC_BADGE_COLORS[result.profiles.a.disc.primary]}`}>{result.profiles.a.disc.primary}</span>
                      {" "}y <span className="font-semibold text-foreground">{result.profiles.b.nombre}</span> tiene perfil{" "}
                      <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${DISC_BADGE_COLORS[result.profiles.b.disc.primary]}`}>{result.profiles.b.disc.primary}</span>.
                      {" "}
                      {result.profiles.a.disc.primary !== result.profiles.b.disc.primary
                        ? "Sus estilos son diferentes, lo que puede generar una dinámica complementaria donde cada uno aporta lo que al otro le falta."
                        : "Comparten el mismo estilo dominante, lo que facilita la comprensión mutua pero puede amplificar los puntos débiles del perfil."}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-display text-lg font-semibold text-foreground">Fortalezas</h3>
                </div>
                <ul className="space-y-2">
                  {result.report.fortalezas.map((f, i) => (
                    <li key={i} className="font-body text-sm text-foreground flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                  <h3 className="font-display text-lg font-semibold text-foreground">Posibles fricciones</h3>
                </div>
                <ul className="space-y-2">
                  {result.report.fricciones.map((f, i) => (
                    <li key={i} className="font-body text-sm text-foreground flex items-start gap-2">
                      <span className="text-orange-400 mt-0.5">⚠</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Preguntas sugeridas */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageCircle className="w-5 h-5 text-gold" />
                <h3 className="font-display text-lg font-semibold text-foreground">Preguntas sugeridas para la primera conversación</h3>
              </div>
              <ol className="space-y-3">
                {result.report.preguntas_sugeridas.map((q, i) => (
                  <li key={i} className="font-body text-sm text-foreground flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-gold/15 text-gold flex items-center justify-center text-xs font-semibold shrink-0">{i + 1}</span>
                    {q}
                  </li>
                ))}
              </ol>
            </div>

            {/* Análisis detallado */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="font-display text-lg font-semibold text-foreground mb-3">Análisis detallado</h3>
              <p className="font-body text-sm text-muted-foreground leading-relaxed">{result.report.analisis_detallado}</p>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
};

export default CompatibilityDashboard;
