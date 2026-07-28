
CREATE TABLE public.paid_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  plan TEXT NOT NULL CHECK (plan IN ('esencial', 'premium')),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.paid_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view paid users" ON public.paid_users
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert paid users" ON public.paid_users
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update paid users" ON public.paid_users
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete paid users" ON public.paid_users
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
