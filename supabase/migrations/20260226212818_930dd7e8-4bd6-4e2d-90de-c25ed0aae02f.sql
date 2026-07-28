
-- Add emotional profile columns
ALTER TABLE public.perfiles
  ADD COLUMN conflicto TEXT[] DEFAULT '{}',
  ADD COLUMN sentirse_querido TEXT[] DEFAULT '{}';
