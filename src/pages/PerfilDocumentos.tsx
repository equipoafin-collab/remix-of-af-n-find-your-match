import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";

const PerfilDocumentos = () => {
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userId, setUserId] = useState("");
  const { toast } = useToast();

  const handleUpload = async () => {
    if (!consent) {
      toast({ title: "Consentimiento requerido", description: "Debes aceptar el consentimiento para subir el documento.", variant: "destructive" });
      return;
    }
    if (!file) {
      toast({ title: "Archivo requerido", description: "Selecciona un archivo PDF antes de subir.", variant: "destructive" });
      return;
    }
    if (!userId.trim()) {
      toast({ title: "ID requerido", description: "Introduce tu identificador de usuario.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const filePath = `user_${userId.trim()}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage
      .from("antecedentes")
      .upload(filePath, file, { cacheControl: "3600", upsert: true });
    setLoading(false);

    if (error) {
      toast({ title: "Error al subir", description: error.message, variant: "destructive" });
    } else {
      setSuccess(true);
      setFile(null);
      toast({ title: "Documento subido", description: "Tu certificado ha sido enviado correctamente." });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type !== "application/pdf") {
      toast({ title: "Formato no válido", description: "Solo se aceptan archivos PDF.", variant: "destructive" });
      return;
    }
    if (selected && selected.size > 10 * 1024 * 1024) {
      toast({ title: "Archivo demasiado grande", description: "El tamaño máximo es 10 MB.", variant: "destructive" });
      return;
    }
    setFile(selected || null);
    setSuccess(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gold/15 mb-2">
              <ShieldCheck className="w-7 h-7 text-gold" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              Verificación de antecedentes
            </h1>
            <p className="font-body text-muted-foreground max-w-md mx-auto">
              Sube tu certificado de antecedentes penales para completar la verificación de tu perfil Premium.
            </p>
          </div>

          {/* Info card */}
          <div className="bg-card rounded-2xl border border-border p-5 flex items-start gap-4">
            <AlertTriangle className="w-5 h-5 text-gold shrink-0 mt-0.5" />
            <div className="font-body text-sm text-muted-foreground leading-relaxed">
              <p>
                Este certificado será usado <span className="font-semibold text-foreground">únicamente para verificar tu perfil Premium</span> y aumentar la confianza en la comunidad.
                Puedes retirar tu consentimiento en cualquier momento enviando un correo a{" "}
                <a href="mailto:equipo.afin@gmail.com" className="text-gold hover:underline">equipo.afin@gmail.com</a>.
              </p>
            </div>
          </div>

          {/* Success state */}
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card rounded-2xl border border-border p-8 text-center space-y-4"
            >
              <CheckCircle2 className="w-12 h-12 text-gold mx-auto" />
              <h2 className="font-display text-xl font-semibold text-foreground">Documento enviado</h2>
              <p className="font-body text-sm text-muted-foreground">
                Hemos recibido tu certificado. Nuestro equipo lo revisará en las próximas 48 horas.
              </p>
              <button
                onClick={() => setSuccess(false)}
                className="px-6 py-3 rounded-full bg-gold text-accent-foreground font-medium text-sm hover:opacity-90 transition-opacity"
              >
                Subir otro documento
              </button>
            </motion.div>
          ) : (
            /* Upload form */
            <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
              {/* User ID */}
              <div>
                <label className="block font-body text-sm font-medium text-foreground mb-1.5">
                  Tu email o nombre completo
                </label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="nombre@email.com"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
              </div>

              {/* File input */}
              <div>
                <label className="block font-body text-sm font-medium text-foreground mb-1.5">
                  Certificado de antecedentes penales (PDF)
                </label>
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed border-border hover:border-gold/50 bg-background cursor-pointer transition-colors"
                >
                  {file ? (
                    <>
                      <FileText className="w-8 h-8 text-gold" />
                      <span className="font-body text-sm text-foreground font-medium">{file.name}</span>
                      <span className="font-body text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <span className="font-body text-sm text-muted-foreground">
                        Haz clic o arrastra tu archivo PDF aquí
                      </span>
                      <span className="font-body text-xs text-muted-foreground">Máximo 10 MB</span>
                    </>
                  )}
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Consent */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={() => setConsent(!consent)}
                  className="mt-1 h-4 w-4 rounded border-border text-gold focus:ring-gold/50 accent-[hsl(var(--ring))]"
                />
                <span className="font-body text-sm text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
                  Doy mi consentimiento para que este documento sea usado solo con fines de verificación de mi perfil Premium conforme a la LOPDGDD.
                </span>
              </label>

              {/* Submit */}
              <button
                onClick={handleUpload}
                disabled={loading || !file || !consent || !userId.trim()}
                className="w-full py-3.5 rounded-full bg-gold text-accent-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? "Subiendo documento..." : "Subir documento"}
              </button>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default PerfilDocumentos;
