# Afín · Guía para Claude Code

App de matchmaking profesional (Afín). Web pública + backoffice (`/admin`) para la psicóloga.
Proyecto creado en **Lovable**, sincronizado con GitHub (`equipoafin-collab/remix-of-af-n-find-your-match`).
Backend: **Lovable Cloud** (Supabase gestionado por Lovable, project_id en `supabase/config.toml`).

## Plan de trabajo (LEER SIEMPRE)
- La hoja de ruta es `docs/PLAN_BACKOFFICE.md`. Lee su **sección 0** antes de tocar nada.
- Implementa **una sola tarea por petición** (ej. `T0.1`), en el orden del plan. Si una dependencia no está marcada `[x]`, para y avisa.
- Al terminar una tarea:
  1. `npm run build`, `npm run lint` y `npm test` deben pasar.
  2. Marca la casilla de la tarea en el plan y añade una línea al **Registro de cambios** (sección 7).
  3. Commit con el formato `T0.1: descripción corta` (no hagas push salvo que se pida).
  4. Resume al usuario qué ha cambiado y si hay pasos manuales (ver "Base de datos").

## Comandos
- `npm install` · `npm run dev` · `npm run build` · `npm run lint` · `npm test`

## Stack y convenciones
- Vite + React 18 + TypeScript + Tailwind + shadcn/ui (`src/components/ui`, no modificar salvo necesidad), React Router 6, TanStack Query, Supabase JS, Edge Functions en Deno (`supabase/functions`).
- IA: Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`, secreto `LOVABLE_API_KEY`). Solo desde Edge Functions, nunca desde el navegador. Respuestas en JSON validado.
- Nombres de tablas/columnas y textos de UI en **español, snake_case**. Código TS en camelCase.
- Estilo visual: el de `src/components/admin/AdminLayout.tsx` y `src/pages/admin/*`.
- Datos en frontend mediante hooks de TanStack Query en `src/hooks/admin/`. Nada de `(supabase as any)` en código nuevo.
- Lógica pura (matching, reglas, cálculos) en `src/lib/` con tests Vitest en `src/lib/__tests__/`.
- No romper las rutas públicas: `/`, `/perfil`, `/quiz`, `/perfil/documentos`, `/quienes-somos`, legales.

## Base de datos (Lovable Cloud) — IMPORTANTE
- No hay acceso directo a Supabase desde local (ni CLI, ni service key). No intentes `supabase db push` ni `supabase link`.
- Cada cambio de esquema = **un fichero nuevo** `supabase/migrations/AAAAMMDDHHMMSS_descripcion.sql`. Nunca edites migraciones existentes.
- Toda tabla nueva: RLS activado + políticas solo admin con `public.has_role(auth.uid(), 'admin')`, salvo que el plan diga otra cosa.
- SQL idempotente cuando sea posible (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).
- `src/integrations/supabase/types.ts` lo genera Lovable. Si una tarea añade tablas/columnas, actualiza ese fichero a mano de forma coherente con la migración para que compile; Lovable lo regenerará después.
- `src/integrations/supabase/client.ts` y `.env` no se tocan.
- Al terminar una tarea con migración, avisa al usuario: **"Aplica esta migración en Lovable"** e indica el nombre del fichero.

## Seguridad y datos sensibles
- Notas de la psicóloga, resúmenes de sesión y vídeos son datos de salud (RGPD art. 9): siempre buckets privados, URLs firmadas y acceso solo admin.
- Nunca subas secretos al repo ni los imprimas en logs.
