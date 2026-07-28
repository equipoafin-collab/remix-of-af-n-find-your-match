
CREATE TABLE public.disc_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  score_d integer NOT NULL DEFAULT 0,
  score_i integer NOT NULL DEFAULT 0,
  score_s integer NOT NULL DEFAULT 0,
  score_c integer NOT NULL DEFAULT 0,
  percent_d real NOT NULL DEFAULT 0,
  percent_i real NOT NULL DEFAULT 0,
  percent_s real NOT NULL DEFAULT 0,
  percent_c real NOT NULL DEFAULT 0,
  primary_style text NOT NULL,
  secondary_style text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.disc_results ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public quiz)
CREATE POLICY "Anyone can submit disc results"
  ON public.disc_results FOR INSERT
  WITH CHECK (true);

-- Admins can view all results
CREATE POLICY "Admins can view disc results"
  ON public.disc_results FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
