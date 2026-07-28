
ALTER TABLE public.disc_results
  ADD COLUMN IF NOT EXISTS strength_1 text DEFAULT '',
  ADD COLUMN IF NOT EXISTS strength_2 text DEFAULT '',
  ADD COLUMN IF NOT EXISTS strength_3 text DEFAULT '',
  ADD COLUMN IF NOT EXISTS weakness_1 text DEFAULT '',
  ADD COLUMN IF NOT EXISTS weakness_2 text DEFAULT '',
  ADD COLUMN IF NOT EXISTS weakness_3 text DEFAULT '',
  ADD COLUMN IF NOT EXISTS love_language_1 text DEFAULT '',
  ADD COLUMN IF NOT EXISTS love_language_2 text DEFAULT '',
  ADD COLUMN IF NOT EXISTS love_language_3 text DEFAULT '',
  ADD COLUMN IF NOT EXISTS conflict_style_1 text DEFAULT '',
  ADD COLUMN IF NOT EXISTS conflict_style_2 text DEFAULT '',
  ADD COLUMN IF NOT EXISTS compatibility_tip_1 text DEFAULT '',
  ADD COLUMN IF NOT EXISTS compatibility_tip_2 text DEFAULT '',
  ADD COLUMN IF NOT EXISTS compatibility_tip_3 text DEFAULT '';
