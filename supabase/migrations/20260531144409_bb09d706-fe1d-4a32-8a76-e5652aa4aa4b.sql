
-- Add critical fields for matching algorithm to perfiles
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS religion TEXT,
  ADD COLUMN IF NOT EXISTS religion_pareja TEXT,
  ADD COLUMN IF NOT EXISTS importa_religion BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ideologia TEXT,
  ADD COLUMN IF NOT EXISTS alcohol TEXT,
  ADD COLUMN IF NOT EXISTS desea_casarse TEXT,
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS estado_perfil TEXT NOT NULL DEFAULT 'activo',
  ADD COLUMN IF NOT EXISTS notas_admin TEXT;

-- Indexes for faster CRM queries
CREATE INDEX IF NOT EXISTS idx_perfiles_ciudad ON public.perfiles (ciudad);
CREATE INDEX IF NOT EXISTS idx_perfiles_genero ON public.perfiles (genero);
CREATE INDEX IF NOT EXISTS idx_perfiles_estado ON public.perfiles (estado_perfil);
CREATE INDEX IF NOT EXISTS idx_perfiles_created_at ON public.perfiles (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_perfiles_email ON public.perfiles (email);

-- Allow admins to UPDATE perfiles (for estado_perfil and notas_admin)
CREATE POLICY "Admins can update profiles"
ON public.perfiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for profile photos (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos-perfil', 'fotos-perfil', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: anyone can upload (during onboarding), anyone can read (public bucket)
CREATE POLICY "Public read fotos-perfil"
ON storage.objects FOR SELECT
USING (bucket_id = 'fotos-perfil');

CREATE POLICY "Anyone can upload fotos-perfil"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'fotos-perfil');

CREATE POLICY "Admins can delete fotos-perfil"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'fotos-perfil' AND public.has_role(auth.uid(), 'admin'));
