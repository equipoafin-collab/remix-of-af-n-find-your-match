
-- Create profiles table for user form submissions
CREATE TABLE public.perfiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre_completo TEXT NOT NULL,
  edad INTEGER NOT NULL,
  ciudad TEXT NOT NULL,
  tipo_relacion TEXT NOT NULL,
  hijos TEXT NOT NULL,
  tabaco TEXT NOT NULL,
  deseo_familia INTEGER NOT NULL CHECK (deseo_familia BETWEEN 1 AND 5),
  ambicion_profesional INTEGER NOT NULL CHECK (ambicion_profesional BETWEEN 1 AND 5),
  nivel_social INTEGER NOT NULL CHECK (nivel_social BETWEEN 1 AND 5),
  estilo_vida_activo INTEGER NOT NULL CHECK (estilo_vida_activo BETWEEN 1 AND 5),
  necesidad_independencia INTEGER NOT NULL CHECK (necesidad_independencia BETWEEN 1 AND 5),
  relacion_sana TEXT NOT NULL,
  aprendizaje_ultima_relacion TEXT NOT NULL,
  vida_en_10_anios TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public form)
CREATE POLICY "Anyone can submit a profile" ON public.perfiles
  FOR INSERT WITH CHECK (true);

-- No public read access (only admin/service role can read)
