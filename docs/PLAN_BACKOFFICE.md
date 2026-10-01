# Afín · Plan de implementación del Backoffice

> **Documento vivo.** Es la fuente de verdad para construir el backoffice de la psicóloga descrito en `Backoffice Funcionalidades.pdf`.
> Una LLM (Lovable, Claude Code u otra) lo irá leyendo e implementando **tarea a tarea, en orden**.
> Última revisión: 30/09/2026.

---

## 0. Instrucciones para la LLM que implemente este plan

1. **Implementa una sola tarea por iteración** (ej. `T1.2`). No adelantes trabajo de tareas posteriores.
2. Antes de empezar, lee la sección de la tarea completa, sus **dependencias** y los **criterios de aceptación**. Si una dependencia no está marcada como hecha, detente y avisa.
3. Al terminar una tarea:
   - Marca su casilla `- [x]` en este documento.
   - Añade una línea en el **Registro de cambios** (sección 7) con fecha, tarea y un resumen de 1 línea.
   - Si has tomado una decisión no prevista, apúntala en la tarea en una línea `> Nota de implementación: …`.
4. **No rompas los flujos públicos** (`/`, `/perfil`, `/quiz`, `/perfil/documentos`, legales). Todo el trabajo del backoffice vive bajo `/admin`.
5. Convenciones del proyecto:
   - Stack: Vite + React 18 + TypeScript + Tailwind + shadcn/ui (`src/components/ui`), React Router 6, TanStack Query, Supabase (Lovable Cloud), Edge Functions en Deno, IA vía Lovable AI Gateway (`LOVABLE_API_KEY`, `https://ai.gateway.lovable.dev/v1/chat/completions`).
   - Idioma de UI y de nombres de tablas/columnas: **español, snake_case**. Código (funciones/variables TS): camelCase.
   - Estilo visual: el ya existente en `src/components/admin/AdminLayout.tsx` y `src/pages/admin/*` (tarjetas `bg-card border border-border rounded-2xl`, color de acento `gold`, fuentes `font-display` / `font-body`).
   - **Migraciones**: un fichero nuevo por tarea en `supabase/migrations/AAAAMMDDHHMMSS_descripcion.sql`. Nunca edites migraciones antiguas. Toda tabla nueva lleva RLS activado y políticas solo-admin (`public.has_role(auth.uid(), 'admin')`) salvo que se indique lo contrario.
   - Tras cada migración, **actualiza a mano** `src/integrations/supabase/types.ts` de forma coherente con la migración (en local no hay CLI de Supabase; Lovable lo regenera al aplicarla). No uses `(supabase as any)` en código nuevo.
   - Acceso a datos en el frontend mediante **hooks de TanStack Query** en `src/hooks/admin/` (ej. `useCliente(id)`, `useTareas(filtros)`), no con `useEffect` + `useState` sueltos.
   - Lógica de negocio pura (cálculos, matching, reglas) en `src/lib/` con **tests en Vitest** (`src/lib/__tests__/`).
   - Toda llamada a IA se hace **desde Edge Functions**, nunca desde el navegador. La respuesta de la IA se pide en JSON estricto y se valida (zod o validación manual) antes de guardarla.
6. Si algo del PDF es ambiguo y no está resuelto en la sección 3.3 (*Decisiones*), aplica el valor por defecto indicado allí y déjalo configurable.

---

## 1. Valoración de lo que hay (estado actual del código)

### 1.1 Resumen ejecutivo

La app es un proyecto Lovable con **una web pública muy trabajada** (landing, cuestionario largo de perfil, test DISC, planes) y **un CRM de administración en fase inicial**. Hay una base aprovechable —autenticación admin, listado y ficha de perfiles, un algoritmo de compatibilidad por reglas bastante completo y una función de IA que genera informes de compatibilidad— pero **faltan casi todas las entidades operativas** que pide el PDF: sesiones, planes vinculados al cliente, tareas, alertas, matches con decisión, vídeos, resúmenes IA y aprendizaje.

**Valoración global respecto al objetivo: ~20 % construido.** Lo existente es un buen punto de partida visual y de matching, pero el modelo de datos necesita reestructurarse antes de construir encima.

### 1.2 Inventario

| Área | Qué existe | Ficheros |
|---|---|---|
| Rutas | Pública + `/admin` con layout lateral. Rutas admin: Dashboard, Perfiles, Ficha, Pagos y 5 *placeholders* (Compatibilidades, Matches, Seguimiento, Notas, Configuración). `/compatibilidad` es una página admin antigua **fuera** del layout. | `src/App.tsx`, `src/components/admin/AdminLayout.tsx`, `src/pages/admin/Placeholder.tsx`, `src/pages/CompatibilityDashboard.tsx` |
| Auth admin | Login email/contraseña Supabase + tabla `user_roles` + función `has_role`. Edge function `create-admin` para crear la primera admin. | `src/pages/AdminLogin.tsx`, `supabase/functions/create-admin` |
| Cuestionario | Formulario público de 9 pasos (~40 campos: datos, estilo de vida, preferencias, valores, escalas 1-5, emociones, reflexiones abiertas, 8 preguntas DISC, foto). Inserta en `perfiles`. | `src/pages/Perfil.tsx` |
| Test DISC | Quiz independiente que guarda en `disc_results` (vinculado a perfiles **solo por email o nombre**). | `src/pages/DiscQuiz.tsx`, `src/lib/matching.ts` |
| Dashboard | 8 tarjetas: registrados, activos, pendientes, nuevos 30 días, pagos, conversión. Dos contadores son fijos ("—", "0"). | `src/pages/admin/Dashboard.tsx` |
| Listado | Tabla con búsqueda y filtros (género, ciudad, estado, hijos, tabaco, religión). Carga **todos** los perfiles en el navegador. | `src/pages/admin/PerfilesList.tsx` |
| Ficha | Cabecera, "calidad del perfil", secciones de datos, escalas, filtros excluyentes, **estado** (`activo/pendiente/pausado/rechazado`) y **una única nota** (`notas_admin`). Botón "Buscar Pareja Compatible" que calcula el ranking en cliente. | `src/pages/admin/PerfilDetalle.tsx` |
| Matching por reglas | v2: filtros duros (género, edad, hijos, religión, política) + puntuación ponderada en 6 dimensiones + `highlights` y `warnings`. Bien planteado. | `src/lib/profileMatching.ts` |
| Informe IA | Edge function `compatibility-report`: recibe 2 perfiles, llama a Gemini y devuelve JSON (score, fortalezas, fricciones, preguntas, análisis). Se exporta a PDF con jsPDF. | `supabase/functions/compatibility-report`, `src/pages/CompatibilityDashboard.tsx` |
| Pagos / planes | Tabla `paid_users` (nombre, email, plan `esencial/premium`, notas) **sin relación con `perfiles`**. CRUD manual. Sin Stripe (hay un `TODO`). Reserva vía Calendly externo. | `src/pages/admin/Pagos.tsx`, `src/components/PlanBookingDialog.tsx` |
| Storage | Bucket `fotos-perfil` (público) y `antecedentes` (privado). | migraciones |
| Tests | Solo el test de ejemplo. | `src/test/` |

### 1.3 Modelo de datos actual

- `perfiles` — una fila por persona que rellena el cuestionario. Mezcla datos personales, respuestas y campos de CRM (`estado_perfil`, `notas_admin`). No está vinculada a ningún usuario de Auth.
- `disc_results` — resultados del quiz DISC, sin FK a `perfiles`.
- `paid_users` — clientes de pago, sin FK a `perfiles`.
- `user_roles` — roles (`admin`, `user`).

### 1.4 Puntos fuertes

- UI de administración limpia, coherente y fácil de extender.
- El algoritmo `profileMatching.ts` ya separa **filtros duros** y **puntuación** y genera "motivos" y "riesgos": es exactamente la base que pide el PDF.
- Ya hay integración funcionando con el gateway de IA y un prompt de compatibilidad reutilizable para el **informe Premium**.
- RLS activado en todas las tablas y control de rol admin en backend.

### 1.5 Problemas y deuda técnica (a corregir antes o durante el plan)

| # | Problema | Impacto | Se corrige en |
|---|---|---|---|
| P1 | `paid_users`, `perfiles` y `disc_results` no están relacionados (se cruzan por email/nombre). | Imposible tener "una única ficha" con el plan. | T1.1, T1.2 |
| P2 | Estados actuales (`activo/pendiente/pausado/rechazado`) no coinciden con los pedidos (`Activo/Pausado/Baja/Finalizado`). | Reglas de negocio incorrectas. | T1.1 |
| P3 | El matching **no excluye perfiles pausados/rechazados** ni guarda nada: se recalcula en el navegador cada vez y se pierde. | No hay aceptar/rechazar ni aprendizaje. | Fase 4 |
| P4 | Bucket `fotos-perfil` es **público** y permite subir a cualquiera. Fotos de clientes accesibles por URL. | Riesgo de privacidad (RGPD). | T0.2 |
| P5 | `/perfil/documentos` sube a `antecedentes` sin sesión, pero la política exige usuario autenticado dueño de la carpeta → **la subida falla**. | Funcionalidad Premium rota. | T0.2 |
| P6 | Uso de `(supabase as any)` y `any` por todas partes; tipos a medias. | Errores silenciosos. | T0.1 |
| P7 | Datos cargados con `useEffect` sin caché ni invalidación. | Dashboard/ficha se desincronizan al crecer. | T0.3 |
| P8 | Página `/compatibilidad` duplicada fuera del layout admin. | Confusión. | T6.3 |
| P9 | Las notas de la psicóloga y los resúmenes de sesión son **datos de salud** (categoría especial, art. 9 RGPD). Hoy no hay auditoría ni política de acceso específica. | Legal. | T0.2, T9.3 |
| P10 | No hay tests del algoritmo de matching. | Regresiones al evolucionarlo. | T0.4 |

---

## 2. Valoración de lo que se pide (PDF vs. estado actual)

Leyenda: ✅ existe · 🟡 parcial · ❌ no existe

### 2.1 Dashboard

| Requisito | Estado | Comentario |
|---|---|---|
| Clientes activos | 🟡 | Cuenta perfiles "activo", pero no distingue cliente (con plan) de lead. |
| Sesiones del día | ❌ | No existe entidad sesión. |
| Nuevos clientes | 🟡 | Existe "nuevos 30 días" sobre perfiles. |
| Clientes Premium | 🟡 | Solo en `paid_users`, desconectado. |
| Pendientes de matching | ❌ | Requiere matches persistidos. |
| Informes Premium pendientes de enviar | ❌ | Requiere tareas. |
| Feedbacks pendientes tras cita | ❌ | Requiere citas/matches. |
| Clientes con pocas sesiones restantes | ❌ | Requiere contador de sesiones. |
| Clientes de baja o pausados | 🟡 | Estados existen pero con otros valores. |
| Nuevos perfiles compatibles detectados por IA | ❌ | Requiere sugerencias persistidas + detección. |
| Alertas importantes | ❌ | Requiere sistema de alertas. |

### 2.2 Ficha del cliente

| Requisito | Estado | Comentario |
|---|---|---|
| Datos personales | ✅ | |
| Estado (Activo, Pausado, Baja, Finalizado) | 🟡 | Hay que migrar valores y aplicar reglas. |
| Plan (Esencial/Premium) | ❌ | No está en la ficha. |
| Sesiones contratadas / realizadas / pendientes | ❌ | |
| Vídeo de la primera sesión | ❌ | Bucket privado + reproductor. |
| Historial de sesiones | ❌ | |
| Resumen IA tras cada sesión | ❌ | |
| Notas privadas | 🟡 | Un solo campo de texto; debe ser un historial. |
| Próxima cita | ❌ | |

### 2.3 Cuestionario y matching

| Requisito | Estado | Comentario |
|---|---|---|
| 4-5 preguntas clave como base | 🟡 | Ya se recogen tipo de relación, hijos, edad buscada y ciudad. Falta **valores importantes** estructurado y **zona geográfica** normalizada. |
| La IA filtra perfiles incompatibles | 🟡 | Filtros duros por reglas ✅; falta excluir por estado y hacerlo en servidor. |
| Aprende con resúmenes, notas, evolución, preferencias | ❌ | |

### 2.4 Sugerencias automáticas de la IA

| Requisito | Estado | Comentario |
|---|---|---|
| Buscar automáticamente al abrir la ficha | 🟡 | Hoy es con botón y en cliente. |
| % compatibilidad | ✅ | |
| Motivos del match | ✅ | `highlights` (se enriquecerá con IA). |
| Posibles riesgos | ✅ | `warnings` (se enriquecerá con IA). |
| Aceptar / Rechazar | ❌ | |
| Aprender de las decisiones | ❌ | |

### 2.5 Gestión de planes

| Requisito | Estado | Comentario |
|---|---|---|
| Ver siempre el plan del cliente | ❌ | |
| Premium → tarea "enviar informe de compatibilidad" antes de presentar | ❌ | El generador de informes IA ya existe y se reutiliza. |
| Premium → tarea "solicitar/registrar feedback" tras la cita | ❌ | |
| Tareas visibles hasta completarse | ❌ | |

### 2.6 Sesiones, estados y automatizaciones

| Requisito | Estado |
|---|---|
| Resumen IA (estado emocional, temas, avances, objetivos, próximos pasos) revisable y guardable | ❌ |
| Baja → fuera del matching, cancela tareas, conserva historial | ❌ |
| Pausado → fuera de nuevos matches, reactivable | ❌ |
| Avisos: informe Premium pendiente, feedback pendiente, pocas sesiones, plan terminado, nuevo perfil muy compatible, cliente sin seguimiento | ❌ |

### 2.7 Conclusión

El PDF pide un **CRM clínico-operativo con IA**. Lo imprescindible es:
1. **Unificar la ficha** (perfil + plan + DISC) y corregir estados.
2. Crear las entidades **sesiones, sugerencias, matches/citas, tareas, alertas, notas**.
3. Mover el **matching al servidor**, persistirlo y cerrar el ciclo aceptar/rechazar → aprendizaje.
4. Añadir **automatizaciones** (triggers + tarea programada) que generen tareas y alertas.
5. Construir el **Dashboard** encima de todo lo anterior (es lo último, porque solo agrega datos).

Esfuerzo estimado: **8-10 fases, ~45 tareas**. El orden del plan minimiza retrabajo: datos → ficha → sesiones → matching → IA → planes/tareas → automatizaciones → dashboard → pulido.

---

## 3. Diseño objetivo

### 3.1 Modelo de datos objetivo

```
perfiles (cliente)  1───n  sesiones
     │  1───n  notas_privadas
     │  1───n  match_sugerencias  n───1 perfiles (candidato)
     │  1───n  matches (presentaciones/citas, par A-B)
     │  1───n  tareas
     │  1───n  alertas
     │  1───1  perfil_aprendizaje (preferencias detectadas + pesos)
     │  1───n  pagos (antes paid_users)
     └  n───1  disc_results
configuracion (clave/valor)     auditoria (log de acceso a datos sensibles)
```

**Decisión clave:** `perfiles` pasa a ser la **entidad cliente única**. Un perfil sin plan es un *lead* (rellenó el cuestionario pero no ha contratado). Todas las tablas nuevas cuelgan de `perfiles.id`.

Nuevas columnas en `perfiles` (T1.1):

| Columna | Tipo | Notas |
|---|---|---|
| `estado_cliente` | enum `estado_cliente` (`activo`,`pausado`,`baja`,`finalizado`) | Sustituye a `estado_perfil`. |
| `plan` | enum `plan_tipo` (`esencial`,`premium`) NULL | NULL = lead. |
| `plan_inicio` / `plan_fin` | date NULL | |
| `sesiones_contratadas` | int default 0 | Editable por la psicóloga. |
| `revisado` | bool default false | Sustituye al antiguo estado "pendiente". |
| `disc_result_id` | uuid FK `disc_results` NULL | |
| `video_presentacion_path` | text NULL | Ruta en bucket privado. |
| `zona` | text NULL | Provincia/zona normalizada (pregunta clave). |
| `acepta_otras_zonas` | bool default false | |
| `valores_importantes` | text[] default '{}' | Pregunta clave (multi-selección). |
| `ultimo_seguimiento_at` | timestamptz NULL | Se actualiza al registrar sesión, nota o feedback. |
| `estado_cambiado_at` | timestamptz | |

Vista `v_clientes` (T1.3): `perfiles` + `sesiones_realizadas`, `sesiones_pendientes = contratadas − realizadas`, `proxima_cita`, `tareas_pendientes`, `alertas_abiertas`, `sugerencias_pendientes`.

Tablas nuevas (se crean en la fase que las necesita):

- **`sesiones`**: `id, perfil_id, fecha_hora, duracion_min, tipo ('primera','seguimiento'), estado ('programada','realizada','cancelada','no_asistio'), video_path, notas_brutas (texto/transcripción), resumen_ia jsonb, resumen_estado ('sin_generar','borrador','revisado'), resumen_revisado_at, created_at`.
  `resumen_ia` = `{ estado_emocional, temas_tratados[], avances[], objetivos[], proximos_pasos[], preferencias_detectadas[] }`.
- **`notas_privadas`**: `id, perfil_id, sesion_id NULL, contenido, created_at, created_by`.
- **`match_sugerencias`**: `id, perfil_id, candidato_id, score, score_reglas, score_ia NULL, desglose jsonb, motivos text[], riesgos text[], estado ('pendiente','aceptada','rechazada','caducada'), motivo_decision text NULL, decidido_at, version_algoritmo, calculado_at` · `UNIQUE(perfil_id, candidato_id)`.
- **`matches`** (presentación y cita entre A y B): `id, perfil_a, perfil_b, sugerencia_id, estado ('propuesto','informe_enviado','cita_agendada','cita_realizada','feedback_registrado','continuan','cerrado'), fecha_cita, lugar, informe jsonb, informe_enviado_at, feedback_a text, feedback_b text, valoracion_a int, valoracion_b int, feedback_at, created_at`.
- **`tareas`**: `id, perfil_id, match_id NULL, tipo ('enviar_informe','registrar_feedback','revisar_resumen','seguimiento','renovacion_plan','manual'), titulo, descripcion, estado ('pendiente','completada','cancelada'), vence_at, origen ('auto','manual'), clave_unica text UNIQUE NULL, completada_at, created_at`.
- **`alertas`**: `id, perfil_id NULL, match_id NULL, tipo, severidad ('info','aviso','urgente'), mensaje, estado ('abierta','vista','resuelta'), clave_unica text UNIQUE, created_at, resuelta_at`.
- **`perfil_aprendizaje`**: `perfil_id PK, preferencias jsonb, ajustes_pesos jsonb, resumen_contexto text, actualizado_at`.
- **`configuracion`**: `clave text PK, valor jsonb` (umbrales y pesos, ver 3.3).
- **`pagos`**: renombrado de `paid_users` + `perfil_id` FK, `importe`, `fecha`.
- **`auditoria`**: `id, user_id, accion, entidad, entidad_id, created_at`.

`clave_unica` en tareas y alertas hace las automatizaciones **idempotentes** (ej. `feedback:match:<id>`), así el proceso programado puede ejecutarse muchas veces sin duplicar.

### 3.2 Arquitectura de IA y matching

Motor en **3 capas**, todo en servidor:

1. **Filtro duro (reglas)** — reutiliza `hardFilterReason` de `profileMatching.ts` + nuevas reglas: el candidato debe estar `activo`, no ser el mismo, no haber sido rechazado antes para este cliente, no tener un match en curso con este cliente, zona compatible (salvo `acepta_otras_zonas`).
2. **Puntuación por reglas (0-100)** — `matchProfiles` actual con pesos leídos de `configuracion` y ajustados por `perfil_aprendizaje.ajustes_pesos` del cliente.
3. **Re-ranking con IA (top N, por defecto 15)** — Edge Function que envía a la IA: 5 preguntas clave + datos del cliente, resúmenes revisados de sus sesiones, notas privadas recientes, preferencias aprendidas y **decisiones anteriores con motivo** (aceptadas/rechazadas); y los datos de cada candidato. Devuelve por candidato `score_ia`, `motivos[]`, `riesgos[]`. Score final = `0.5·reglas + 0.5·IA` (configurable).

**Aprendizaje** (sin entrenar modelos, explicable):
- Cada **aceptar/rechazar** se guarda con motivo opcional (chips: "edad", "distancia", "valores", "físico", "intuición profesional", texto libre).
- Tras cada decisión y tras cada resumen revisado se ejecuta `actualizar-aprendizaje`: la IA destila `preferencias` (lo que el cliente valora/rechaza) y se recalculan `ajustes_pesos` con una regla simple (las dimensiones que más puntuaban en rechazados pierden peso; las de aceptados lo ganan; límite ±30 %).
- Aprendizaje **global**: los ajustes medios de todos los clientes pueden alimentar los pesos por defecto (T5.5, opcional).

Caché: las sugerencias se guardan en `match_sugerencias`. Al abrir la ficha se muestran al instante y se **recalculan en segundo plano** si tienen más de 24 h o si el cliente ha cambiado (nuevo resumen, nota, decisión o nuevo perfil en la base).

### 3.3 Decisiones y valores por defecto (confirmar con la psicóloga)

| Tema | Valor por defecto | Clave en `configuracion` |
|---|---|---|
| Sesiones por plan | Esencial 1/mes, Premium 2/mes (según `Pricing`). `sesiones_contratadas` editable. | `sesiones_por_plan` |
| "Pocas sesiones restantes" | ≤ 1 pendiente | `umbral_pocas_sesiones` |
| "Tiempo sin seguimiento" | 21 días | `dias_sin_seguimiento` |
| "Alta compatibilidad" | ≥ 80 % | `umbral_alta_compatibilidad` |
| Plazo feedback tras cita | 3 días | `dias_feedback` |
| Nº de sugerencias mostradas | 10 (IA re-rankea las 15 mejores por reglas) | `num_sugerencias` |
| Origen de las citas/sesiones | **Alta manual** en la ficha (MVP). Integración Calendly por webhook en T9.4 (opcional). | — |
| Vídeo primera sesión | Subida manual (mp4/mov, máx. 500 MB) a bucket privado; reproducción con URL firmada. | — |
| Generación del resumen | La psicóloga pega sus notas o transcripción → IA genera borrador → ella revisa y guarda. Transcripción automática del vídeo/audio: T3.5 (opcional). | — |
| ¿Quién es "cliente"? | Perfil con `plan` no nulo. Sin plan = lead (visible en Perfiles, no cuenta como cliente). | — |
| Estado "Finalizado" | Plan terminado o pareja encontrada. Igual que Pausado a efectos de matching, pero no genera alertas. | — |

---

## 4. Plan de implementación por fases

> Formato de cada tarea: **Objetivo · Cambios · Criterios de aceptación · Depende de**.

### FASE 0 — Cimientos y saneamiento

- [x] **T0.1 · Tipos y limpieza**
  - Objetivo: poder construir sin `any`.
  - Cambios: `types.ts` ya está al día con las migraciones (no hay que regenerarlo); eliminar `(supabase as any)` en `PerfilDetalle.tsx` y `Pagos.tsx`; crear `src/types/admin.ts` con tipos derivados (`Perfil = Tables<'perfiles'>`, etc.); dejar el lint en verde: quitar los `any` explícitos de `src/pages/**` y `supabase/functions/compatibility-report`, poner llaves en los `case` de `Perfil.tsx` y cambiar el `require` de `tailwind.config.ts` por `import`. `src/components/ui` está excluido del lint (shadcn).
  - Aceptación: `npm run build`, `npm run typecheck` y `npm run lint` sin errores (se admiten los warnings `react-refresh`); no queda `supabase as any` en `src/`.
  > Nota de implementación: `src/types/admin.ts` exporta `Perfil`, `PaidUser`, `DiscResult` y `PlanTipo`. En `compatibility-report` el cliente Supabase sigue sin tipar (Deno); solo se tipan los parámetros explícitos (`DiscResumen`).

- [x] **T0.2 · Seguridad y privacidad**
  - Cambios (migración):
    - `fotos-perfil` → privado; lectura solo admin; subida anónima limitada a imágenes (`image/*`, ≤ 5 MB) con ruta `perfiles/<uuid>.<ext>`. En `Perfil.tsx` guardar la **ruta** en `foto_url` (no la URL pública) y en admin mostrar con `createSignedUrl`. Crear helper `src/lib/storage.ts` → `getSignedUrl(bucket, path)`.
    - Arreglar `antecedentes`: política INSERT anónima permitida solo en carpeta `user_*/` y solo `application/pdf`; SELECT solo admin. (Alternativa mejor si hay tiempo: enlace con token por cliente.)
    - Crear bucket privado `videos-sesiones` (solo admin: select/insert/update/delete).
    - Crear tabla `auditoria` + función `registrar_auditoria(accion, entidad, entidad_id)`.
  - Aceptación: una URL pública antigua de foto ya no es accesible sin firma; subida desde `/perfil/documentos` funciona sin sesión; un usuario no-admin no puede leer ningún bucket.
  > Nota de implementación: tamaño y tipo MIME se limitan en la configuración de cada bucket (`file_size_limit`, `allowed_mime_types`), no en la política; la de `antecedentes` exige además extensión `.pdf`. Las fotos antiguas siguen en la raíz del bucket: la migración solo convierte `foto_url` de URL pública a ruta. En `/perfil/documentos` la carpeta se sanea con `claveSegura` (Storage no admite tildes) y se sube sin `upsert`, porque la subida anónima solo tiene INSERT. `registrar_auditoria` exige rol admin; los procesos de servidor (service role, cron) insertan en `auditoria` directamente. `videos-sesiones` admite 500 MB, pero el límite global de subida del proyecto puede ser menor: revisarlo en T2.3. En el admin, las fotos se pintan con `FotoPerfil` (URL firmada vía `useSignedUrl`).

- [x] **T0.3 · Capa de datos con React Query**
  - Cambios: `src/hooks/admin/` con `usePerfiles`, `usePerfil(id)`, `useUpdatePerfil`. Migrar `Dashboard`, `PerfilesList`, `PerfilDetalle`, `Pagos` a estos hooks. Invalidar queries tras mutaciones.
  - Aceptación: mismas pantallas funcionando; al guardar en la ficha, el listado refleja el cambio sin recargar.
  > Nota de implementación: además de `usePerfiles`/`usePerfil`/`useUpdatePerfil` hay `usePagos`/`useCrearPago`/`useEliminarPago` y `useConteoDisc`. Las claves de perfiles cuelgan de `["perfiles"]`, así que invalidar ese prefijo refresca listado, fichas y Dashboard (que reutiliza la caché de `usePerfiles` en vez de su propia consulta). El formulario de estado/notas de la ficha es un subcomponente con `key={perfil.id}` para que un refetch no pise lo que se está escribiendo.

- [x] **T0.4 · Tests del matching actual**
  - Cambios: `src/lib/__tests__/profileMatching.test.ts` con perfiles de ejemplo (fixtures en `src/lib/__tests__/fixtures.ts`): género, edad, hijos, religión, política excluyen; misma ciudad suma; ranking ordenado.
  - Aceptación: `npm test` en verde con ≥ 10 casos.

- [x] **T0.5 · Tabla `configuracion`**
  - Cambios: migración con tabla y valores por defecto de la sección 3.3 y los pesos actuales (`WEIGHTS`). Hook `useConfiguracion()` y helper servidor para leerla.
  - Aceptación: valores visibles en consola/SQL; hook devuelve objeto tipado.
  > Nota de implementación: claves `sesiones_por_plan`, `umbral_pocas_sesiones`, `dias_sin_seguimiento`, `umbral_alta_compatibilidad`, `dias_feedback`, `num_sugerencias` y `pesos_algoritmo` (JSON en camelCase para casar con `WEIGHTS`, ahora exportado). Tipo y valores por defecto en `src/lib/configuracion.ts` (`construirConfiguracion` rellena las claves que falten); el helper de servidor es `supabase/functions/_shared/configuracion.ts` → `leerConfiguracion(supabase)`. El nº de candidatos que re-rankea la IA (15) y el peso reglas/IA (0,5/0,5) se añadirán en T5.2, que es quien los usa.

### FASE 1 — Cliente único: estados, plan y sesiones contratadas

- [ ] **T1.1 · Estados y plan en `perfiles`** · Depende de T0.1
  - Cambios (migración):
    - Enums `estado_cliente` y `plan_tipo`; columnas de la tabla 3.1.
    - Migrar datos: `estado_perfil` `activo→activo`, `pendiente→activo + revisado=false`, `pausado→pausado`, `rechazado→baja`. Resto `revisado=true`.
    - Mantener `estado_perfil` temporalmente (deprecado) hasta T9.5.
    - Trigger `before update` que rellena `estado_cambiado_at`.
  - Aceptación: todos los perfiles tienen `estado_cliente`; la UI usa los 4 estados nuevos con badges (Activo verde, Pausado gris, Baja rojo, Finalizado azul).

- [ ] **T1.2 · Vincular pagos y DISC al perfil** · Depende de T1.1
  - Cambios: renombrar `paid_users` → `pagos` (o crear vista compatible), añadir `perfil_id` FK y rellenarla por email (case-insensitive). Para cada pago vinculado, copiar `plan` a `perfiles.plan`. Rellenar `perfiles.disc_result_id` por email. Listar en un informe SQL los que no casen para revisión manual.
  - Cambios UI: `Pagos.tsx` permite elegir el perfil al crear un pago (buscador) y muestra enlace a la ficha. Al crear/editar un pago se actualiza el plan del perfil.
  - Aceptación: un cliente de pago aparece con su plan en listado y ficha; no hay filas de pago nuevas sin `perfil_id`.

- [ ] **T1.3 · Vista `v_clientes` y contadores de sesiones** · Depende de T1.1 (la tabla `sesiones` se crea aquí, vacía, con el esquema de 3.1)
  - Cambios: crear tabla `sesiones` (solo esquema + RLS) y vista `v_clientes` con `sesiones_realizadas`, `sesiones_pendientes`, `proxima_cita`. (Las columnas de tareas/alertas/sugerencias se añaden a la vista en sus fases.)
  - Aceptación: consulta a `v_clientes` devuelve contadores correctos con datos de prueba.

- [ ] **T1.4 · Listado de clientes actualizado** · Depende de T1.3
  - Cambios: `PerfilesList` lee de `v_clientes`; nuevas columnas **Plan** (badge siempre visible), **Sesiones (realizadas/contratadas)**, **Próxima cita**; filtros por plan, estado nuevo y "solo clientes / solo leads". Paginación en servidor (25 por página) y búsqueda con `ilike`.
  - Aceptación: filtros combinables; rendimiento correcto con 1.000 perfiles de prueba.

- [ ] **T1.5 · Reglas de cambio de estado** · Depende de T1.1
  - Cambios: función SQL `cambiar_estado_cliente(perfil_id, nuevo_estado, motivo)` que:
    - **Baja**: marca `cancelada` todas sus `tareas` pendientes, `caducada` sus `match_sugerencias` pendientes (y las que le tienen como candidato), cierra alertas abiertas. **No borra nada.**
    - **Pausado / Finalizado**: caduca sugerencias pendientes donde aparece como candidato; conserva tareas.
    - **Reactivar (→ activo)**: solo cambia estado; todo el historial sigue.
    - Registra el cambio en `auditoria` y como nota automática en `notas_privadas`.
  - (Las tablas tareas/alertas/sugerencias se crean en fases posteriores: la función debe comprobar su existencia o implementarse aquí y **ampliarse** en T4.1 y T7.1 — dejar comentario `-- AMPLIAR EN T4.1/T7.1`.)
  - UI: selector de estado en la ficha con diálogo de confirmación que explica las consecuencias.
  - Aceptación: pasar a Baja y volver a Activo conserva sesiones, notas y matches.

### FASE 2 — Ficha del cliente (una sola pantalla con todo)

- [ ] **T2.1 · Nuevo layout de ficha con pestañas** · Depende de T1.4
  - Cambios: dividir `PerfilDetalle.tsx` en componentes dentro de `src/components/admin/ficha/`. Cabecera fija con: foto, nombre, edad, zona, **badge de estado**, **badge de plan**, **sesiones realizadas/contratadas/pendientes** (barra), **próxima cita**, contador de tareas pendientes y alertas.
  - Pestañas: **Resumen** · **Sugerencias IA** · **Sesiones** · **Matches** · **Tareas** · **Notas** · **Cuestionario** · **Documentos**.
  - "Cuestionario" contiene las secciones actuales de datos; "Resumen" muestra las 5 preguntas clave, último resumen de sesión, próximas tareas y vídeo.
  - Aceptación: toda la información actual sigue visible; la cabecera muestra plan y estado siempre.

- [ ] **T2.2 · Notas privadas con historial** · Depende de T2.1
  - Cambios: tabla `notas_privadas`; migrar `notas_admin` existente como primera nota. Pestaña Notas: lista cronológica, crear/editar/borrar, vincular opcionalmente a una sesión. Al crear nota → actualizar `ultimo_seguimiento_at`.
  - Aceptación: notas persistentes, ordenadas, solo visibles para admin.

- [ ] **T2.3 · Vídeo de la primera sesión** · Depende de T0.2, T2.1
  - Cambios: en Resumen, bloque "Vídeo de presentación": subir (barra de progreso), reproducir (`<video>` con URL firmada de 1 h), reemplazar, eliminar. Ruta `videos-sesiones/<perfil_id>/presentacion.<ext>` guardada en `perfiles.video_presentacion_path`.
  - Aceptación: se sube y reproduce; la URL caduca; un no-admin no puede acceder.

- [ ] **T2.4 · Editar plan y sesiones contratadas desde la ficha** · Depende de T1.2
  - Cambios: diálogo "Plan" (tipo, fecha inicio/fin, sesiones contratadas, con sugerencia automática según plan y meses).
  - Aceptación: cambios reflejados en cabecera, listado y vista.

### FASE 3 — Sesiones y resumen automático con IA

- [ ] **T3.1 · CRUD de sesiones** · Depende de T1.3, T2.1
  - Cambios: pestaña Sesiones: listado (fecha, tipo, estado, badge del resumen), crear/programar, marcar como realizada / cancelada / no asistió. La primera sesión se marca `tipo='primera'` y puede asociar el vídeo.
  - Aceptación: los contadores de la cabecera cambian al marcar sesiones realizadas; "próxima cita" = siguiente sesión programada o cita de match, la más próxima.

- [ ] **T3.2 · Edge Function `resumen-sesion`** · Depende de T3.1
  - Entrada: `sesion_id`. Lee `notas_brutas` de la sesión, datos clave del cliente y los 3 últimos resúmenes revisados (para medir evolución).
  - Salida JSON validada: `{ estado_emocional, temas_tratados[], avances[], objetivos[], proximos_pasos[], preferencias_detectadas[] }`. Guarda en `sesiones.resumen_ia` con `resumen_estado='borrador'`.
  - Reutilizar el patrón de auth admin y gestión de errores 429/402 de `compatibility-report`. Extraer ese código común a `supabase/functions/_shared/` (auth, cors, llamada IA, parseo JSON).
  - Aceptación: con unas notas de ejemplo devuelve las 5 secciones en español; errores de IA se muestran con toast.

- [ ] **T3.3 · Revisión y guardado del resumen** · Depende de T3.2
  - Cambios: al marcar una sesión como realizada se abre un panel "Notas de la sesión" (textarea) + botón **Generar resumen con IA**. El borrador aparece en campos editables por sección; botones **Guardar como revisado** y **Regenerar**. Al guardar: `resumen_estado='revisado'`, `resumen_revisado_at`, `ultimo_seguimiento_at` del perfil.
  - Aceptación: la psicóloga solo tiene que revisar y guardar; el historial muestra cada resumen desplegable.

- [ ] **T3.4 · Evolución del cliente** · Depende de T3.3
  - Cambios: en Resumen, línea temporal compacta con el estado emocional y avances de cada sesión revisada.
  - Aceptación: se ve la evolución de las últimas sesiones de un vistazo.

- [ ] **T3.5 · (Opcional) Transcripción automática** · Depende de T3.2
  - Cambios: Edge Function que, a partir de un audio/vídeo subido, genera la transcripción (modelo con entrada de audio disponible en el gateway) y la guarda en `notas_brutas`.
  - Aceptación: subir audio → transcripción → botón generar resumen.

### FASE 4 — Cuestionario clave y motor de matching v3 (servidor + persistencia)

- [ ] **T4.1 · Tabla `match_sugerencias`** · Depende de T1.1
  - Cambios: tabla según 3.1 + índices `(perfil_id, estado)`, `(candidato_id)`. Ampliar `cambiar_estado_cliente` (T1.5). Añadir `sugerencias_pendientes` a `v_clientes`.
  - Aceptación: RLS solo admin; función de estado caduca sugerencias.

- [ ] **T4.2 · Preguntas clave del cuestionario** · Depende de T1.1
  - Cambios en `Perfil.tsx` (flujo público) **sin alargarlo**:
    - `zona`: sustituir/complementar ciudad libre por selector de provincia (lista de provincias de España + "Otra"), y checkbox "Estoy abierto/a a conocer gente de otras zonas".
    - `valores_importantes`: multi-selección (máx. 3) de una lista cerrada: Familia, Honestidad, Fe/espiritualidad, Ambición, Libertad, Estabilidad, Humor, Cultura, Salud/deporte, Compromiso social.
  - Constante compartida `src/lib/preguntasClave.ts` que define las **5 preguntas clave** (tipo_relacion, hijos, rango edad, zona, valores_importantes) con etiqueta y opciones; la ficha y el matching la usan.
  - Script/SQL de relleno: `zona` a partir de `ciudad` cuando coincida con una provincia.
  - Aceptación: nuevos perfiles guardan zona y valores; ficha muestra "Preguntas clave" en Resumen.

- [ ] **T4.3 · Algoritmo v3 compartido** · Depende de T4.2, T0.4, T0.5
  - Cambios en `src/lib/profileMatching.ts` (mantener tests pasando, añadir nuevos):
    - Filtros duros nuevos: candidato con `estado_cliente='activo'`; zona incompatible si ninguno acepta otras zonas y `zona` distinta; excluir ids recibidos en `excluirIds` (rechazados previos, matches en curso).
    - Nueva dimensión **valores_importantes** (Jaccard) dentro de "valores"; geografía usa `zona` además de ciudad.
    - Pesos inyectables: `matchProfiles(a, b, { pesos, ajustes })`.
    - Exportar `VERSION_ALGORITMO = 'v3'`.
  - El fichero debe ser **puro** (sin imports de navegador) para poder copiarse/importarse desde la Edge Function (`supabase/functions/_shared/profileMatching.ts`; documentar cómo mantener ambos sincronizados o usar import relativo si el bundler lo permite).
  - Aceptación: tests nuevos para estado, zona, valores y pesos.

- [ ] **T4.4 · Edge Function `sugerencias-calcular`** · Depende de T4.1, T4.3
  - Entrada: `perfil_id`, `forzar?: boolean`.
  - Pasos: cargar cliente + pool de candidatos activos (solo columnas necesarias) → excluir rechazados/en curso → puntuar por reglas → top `num_sugerencias` → **upsert** en `match_sugerencias` (no pisa las `aceptada`/`rechazada`; actualiza score de las `pendiente`; marca `caducada` las pendientes que ya no entran).
  - Aceptación: llamar dos veces no duplica; respeta decisiones previas.

- [ ] **T4.5 · Pestaña "Sugerencias IA" con aceptar/rechazar** · Depende de T4.4, T2.1
  - Cambios: al **abrir la ficha** se leen las sugerencias guardadas (instantáneo) y se lanza `sugerencias-calcular` en segundo plano si están obsoletas (> 24 h o `perfiles.updated_at` posterior). Tarjeta por candidato: foto, nombre, edad, zona, plan, **% compatibilidad**, **motivos**, **riesgos**, desglose por dimensión (barras) y botones **Aceptar** / **Rechazar** (este último con chips de motivo + texto opcional). Enlace a la ficha del candidato.
  - Filtros: pendientes / aceptadas / rechazadas.
  - Eliminar el botón "Buscar Pareja Compatible" manual (sustituir por "Recalcular").
  - Aceptación: aceptar/rechazar persiste y desaparece de pendientes; un rechazado no vuelve a aparecer.

### FASE 5 — IA de sugerencias y aprendizaje

- [ ] **T5.1 · Contexto del cliente para la IA** · Depende de T3.3, T2.2
  - Cambios: tabla `perfil_aprendizaje`. Función compartida `construirContextoCliente(perfil_id)` en `_shared/` que junta: preguntas clave, datos resumidos del cuestionario, DISC, últimos 5 resúmenes revisados, últimas 10 notas, `preferencias` aprendidas y últimas 20 decisiones (candidato resumido + aceptada/rechazada + motivo). Limitar a ~6.000 tokens (recortar lo más antiguo).
  - Aceptación: test manual de la función devuelve un texto estructurado y acotado.

- [ ] **T5.2 · Re-ranking con IA** · Depende de T4.4, T5.1
  - Cambios en `sugerencias-calcular`: tras el ranking por reglas, enviar el **top 15** a la IA con el contexto. Respuesta JSON por candidato: `{ candidato_id, score_ia (0-100), motivos[] (máx 4), riesgos[] (máx 3) }`. Guardar `score_ia`, combinar `score = round(peso_reglas·score_reglas + peso_ia·score_ia)`, sustituir `motivos/riesgos` por los de la IA (conservando los de reglas en `desglose`). Si la IA falla → quedarse con reglas y marcar `score_ia = null` (la UI muestra "solo reglas").
  - Aceptación: motivos y riesgos personalizados y en español; nunca se bloquea la ficha si la IA falla.

- [ ] **T5.3 · Aprender de las decisiones** · Depende de T4.5, T5.1
  - Cambios: Edge Function `actualizar-aprendizaje(perfil_id)` llamada tras cada aceptar/rechazar y tras guardar un resumen revisado:
    1. Recalcula `ajustes_pesos` (regla de 3.2) a partir del desglose de sugerencias aceptadas vs. rechazadas (mínimo 3 decisiones para empezar a ajustar).
    2. Pide a la IA que actualice `preferencias` (`{ valora: [], evita: [], notas: '' }`) a partir de decisiones, resúmenes (`preferencias_detectadas`) y notas.
    3. Marca las sugerencias pendientes del cliente como obsoletas para que se recalculen.
  - UI: en Sugerencias, bloque plegable "Lo que la IA ha aprendido de este cliente" (preferencias + ajustes de peso), editable por la psicóloga.
  - Aceptación: tras rechazar varios candidatos por "distancia", el peso de geografía sube para ese cliente y el ranking cambia.

- [ ] **T5.4 · Detección de nuevos perfiles compatibles** · Depende de T4.4
  - Cambios: trigger `after insert` en `perfiles` (y al pasar a `activo`) que encola el nuevo perfil (tabla `cola_matching` o columna `pendiente_matching`). El proceso programado (T7.3) calcula ese perfil **contra todos los clientes activos con plan** solo por reglas (barato) y, si alguno supera `umbral_alta_compatibilidad`, crea/actualiza la sugerencia y una **alerta** "Nuevo perfil muy compatible con X".
  - Aceptación: al insertar un perfil de prueba muy compatible aparece la alerta en el siguiente ciclo.

- [ ] **T5.5 · (Opcional) Aprendizaje global** · Depende de T5.3
  - Cambios: en Configuración, mostrar los ajustes de peso medios de todos los clientes y botón "Aplicar como pesos por defecto".

### FASE 6 — Matches, citas, informes y gestión de planes

- [ ] **T6.1 · Tabla `matches` y flujo de presentación** · Depende de T4.5
  - Cambios: al **Aceptar** una sugerencia se crea un `match` (A = cliente, B = candidato, estado `propuesto`) — si ya existe el par (en cualquier orden) se reutiliza. Pestaña **Matches** de la ficha: lista con estado, fecha de cita, lugar y acciones para avanzar de estado (`informe_enviado`, `cita_agendada` con fecha/lugar, `cita_realizada`, `feedback_registrado`, `continuan`, `cerrado`).
  - Aceptación: el flujo completo se puede recorrer; las citas aparecen como "próxima cita" de ambos.

- [ ] **T6.2 · Tareas (tabla + UI básica)** · Depende de T1.1
  - Cambios: tabla `tareas` (3.1). Pestaña **Tareas** en la ficha y panel global `/admin/tareas` (nueva ruta y entrada de menú, sustituye a "Seguimiento" o se añade al menú): filtros por tipo/estado/vencimiento, marcar completada, crear tarea manual. Las tareas pendientes **no desaparecen hasta completarse o cancelarse**; vencidas en rojo.
  - Aceptación: CRUD funcionando; `tareas_pendientes` añadido a `v_clientes`.

- [ ] **T6.3 · Informe de compatibilidad integrado** · Depende de T6.1
  - Cambios: mover la funcionalidad de `CompatibilityDashboard.tsx` a un botón **"Generar informe"** dentro de cada match. Llama a `compatibility-report` (ampliado para incluir preguntas clave y contexto de T5.1), guarda en `matches.informe`, permite editar, exportar PDF (reutilizar jsPDF) y **marcar como enviado** (`informe_enviado_at`). Redirigir `/compatibilidad` → `/admin`.
  - Aceptación: informe guardado y exportable desde la ficha; la página antigua ya no se usa.

- [ ] **T6.4 · Tareas automáticas del plan Premium** · Depende de T6.1, T6.2, T6.3
  - Triggers SQL sobre `matches`:
    - Al crear un match: por cada lado (A y B) cuyo cliente sea **Premium** → tarea `enviar_informe` ("Enviar informe de compatibilidad a <cliente> sobre <candidato>"), `clave_unica = 'informe:<match_id>:<perfil_id>'`. Se **completa automáticamente** al marcar `informe_enviado_at`.
    - Bloqueo suave: si hay tarea `enviar_informe` pendiente, al pasar a `cita_agendada` mostrar aviso "El informe aún no se ha enviado" (se puede continuar).
    - Al pasar a `cita_realizada`: tarea `registrar_feedback` para cada lado Premium (y, si se decide, también Esencial, ya que el plan incluye feedback) con `vence_at = fecha_cita + dias_feedback`. Se completa al registrar el feedback.
  - Aceptación: recorrer el flujo con un Premium genera y cierra las dos tareas sin intervención; con Esencial no se genera la de informe.

- [ ] **T6.5 · Registro de feedback** · Depende de T6.1
  - Cambios: diálogo en el match para registrar feedback de A y de B (texto + valoración 1-5 + "¿quieren volver a verse?"). Se guarda en el match, actualiza `ultimo_seguimiento_at` y dispara `actualizar-aprendizaje` para ambos.
  - Aceptación: feedback visible en la ficha de ambos clientes.

### FASE 7 — Alertas y automatizaciones

- [ ] **T7.1 · Tabla `alertas` y centro de avisos** · Depende de T1.1
  - Cambios: tabla `alertas` (3.1). Icono de campana en `AdminLayout` con contador de abiertas y panel desplegable; página `/admin/alertas` con filtros; en la ficha, banda superior con las alertas del cliente. Acciones: marcar vista, resolver, ir a la ficha. Ampliar `cambiar_estado_cliente` (cerrar alertas en Baja). Añadir `alertas_abiertas` a `v_clientes`.
  - Aceptación: alertas creadas a mano por SQL se ven y se resuelven.

- [ ] **T7.2 · Función `evaluar_automatizaciones()`** · Depende de T7.1, T6.4, T3.1
  - Función SQL (o Edge Function si requiere IA) **idempotente** que crea alertas (y tareas cuando aplique) usando `clave_unica`, y **resuelve automáticamente** las que ya no aplican:

    | Regla | Condición | Resultado |
    |---|---|---|
    | Informe Premium pendiente | tarea `enviar_informe` pendiente > 2 días | alerta `aviso` |
    | Feedback pendiente | match `cita_realizada` sin feedback y `now() > vence_at` | alerta `urgente` |
    | Pocas sesiones | cliente activo con `sesiones_pendientes ≤ umbral_pocas_sesiones` | alerta `aviso` + tarea `renovacion_plan` |
    | Plan terminado | `sesiones_pendientes = 0` o `plan_fin < hoy` | alerta `urgente` + sugerir pasar a Finalizado |
    | Nuevo perfil muy compatible | (T5.4) | alerta `info` |
    | Sin seguimiento | activo con plan y `ultimo_seguimiento_at` > `dias_sin_seguimiento` | alerta `aviso` + tarea `seguimiento` |
    | Resumen sin revisar | sesión `realizada` con resumen `borrador` o `sin_generar` > 2 días | tarea `revisar_resumen` |

  - Ninguna regla se aplica a clientes en `baja`; `pausado` y `finalizado` solo generan "Plan terminado" si procede.
  - Aceptación: ejecutar la función 3 veces seguidas no duplica nada; datos de prueba disparan cada regla.

- [ ] **T7.3 · Ejecución programada** · Depende de T7.2, T5.4
  - Cambios: activar `pg_cron` (+ `pg_net` si hace falta llamar a Edge Functions). Job cada hora: `evaluar_automatizaciones()`; job cada 15 min: procesar `cola_matching` (T5.4). Botón "Ejecutar ahora" en Configuración.
  - Aceptación: los jobs aparecen en `cron.job` y se ejecutan; la última ejecución se muestra en Configuración.

- [ ] **T7.4 · Triggers en tiempo real** · Depende de T7.2
  - Cambios: al marcar una sesión como realizada, al registrar feedback o al cambiar plan, llamar a `evaluar_automatizaciones_cliente(perfil_id)` (versión por cliente) para que avisos y tareas se actualicen al instante, sin esperar al cron.
  - Aceptación: marcar la última sesión como realizada crea al momento la alerta "Plan terminado".

- [ ] **T7.5 · (Opcional) Resumen diario por email**
  - Cambios: Edge Function diaria que envía a la psicóloga un email con sesiones del día, tareas vencidas y alertas urgentes (proveedor tipo Resend; requiere secreto).

### FASE 8 — Dashboard completo

- [ ] **T8.1 · Función `dashboard_resumen()`** · Depende de Fases 1-7
  - Una función SQL que devuelve en una sola llamada todos los contadores del PDF: clientes activos, sesiones del día, nuevos clientes (30 días, con plan), Premium, pendientes de matching (activos con plan sin match en curso ni sugerencias aceptadas en los últimos X días), informes Premium pendientes, feedbacks pendientes, pocas sesiones, baja/pausados, nuevos perfiles compatibles (alertas tipo IA de 7 días), alertas urgentes abiertas.
  - Aceptación: respuesta < 300 ms con 1.000 perfiles.

- [ ] **T8.2 · Nuevo Dashboard** · Depende de T8.1
  - Cambios en `src/pages/admin/Dashboard.tsx`:
    - Fila de KPIs (tarjetas clicables que llevan al listado filtrado correspondiente).
    - **Agenda de hoy**: sesiones y citas del día con hora y enlace a la ficha.
    - **Alertas importantes** (urgentes primero).
    - **Tareas pendientes** (vencidas primero) con completar en línea.
    - **Nuevos perfiles compatibles detectados por la IA** (últimos 7 días) con acceso directo a la sugerencia.
    - Eliminar tarjetas fijas ("—", "Próximamente").
  - Aceptación: todos los puntos del apartado "Dashboard" del PDF visibles y enlazados; los números coinciden con los listados filtrados.

### FASE 9 — Vistas agregadas, configuración y cierre

- [ ] **T9.1 · Sustituir placeholders**
  - `Compatibilidades` → vista global de sugerencias pendientes de todos los clientes (ordenadas por score) con aceptar/rechazar.
  - `Matches Aprobados` → todos los matches con estado, filtros y embudo (propuestos → cita → continúan).
  - `Seguimiento` → tablero kanban de matches por estado (o redirigir a `/admin/tareas`).
  - `Notas Privadas` → buscador global de notas y resúmenes.
  - Aceptación: no queda ningún `Placeholder` en rutas.

- [ ] **T9.2 · Pantalla de Configuración**
  - Editar valores de `configuracion` (umbrales, pesos del algoritmo, peso reglas/IA, sesiones por plan), ver estado de los jobs, gestionar administradoras (invitar por email vía Edge Function protegida).
  - Aceptación: cambiar un umbral cambia el comportamiento de las automatizaciones en el siguiente ciclo.

- [ ] **T9.3 · RGPD y seguridad de datos sensibles**
  - Registrar en `auditoria` las lecturas de notas, resúmenes y vídeos. Exportación de todos los datos de un cliente (JSON/PDF) y borrado definitivo bajo petición (derecho de supresión), distinto de "Baja". Revisar textos de consentimiento del cuestionario para incluir: tratamiento por la psicóloga, uso de IA para matching y resúmenes, y proveedor de IA. **Validar con asesoría legal.**
  - Aceptación: exportación y borrado funcionan; auditoría registra accesos.

- [ ] **T9.4 · (Opcional) Integración Calendly**
  - Webhook `invitee.created` / `invitee.canceled` → Edge Function que crea/cancela `sesiones` enlazando por email al perfil (requiere plan de Calendly con webhooks).

- [ ] **T9.5 · Limpieza final**
  - Eliminar `estado_perfil` y `notas_admin` (ya migrados), código muerto (`CompatibilityDashboard.tsx`, `Placeholder.tsx` si no se usa), revisar accesibilidad y responsive del admin, datos de prueba (`supabase/seed.sql`) con 30 perfiles variados para QA.
  - Aceptación: build, lint y tests en verde; checklist de QA de la sección 5 completo.

---

## 5. Checklist de QA final (mapeo 1:1 con el PDF)

- [ ] Al abrir el backoffice veo en el Dashboard los 11 indicadores pedidos.
- [ ] Cada cliente tiene una única ficha con datos, estado, plan, sesiones (contratadas/realizadas/pendientes), vídeo, historial, resúmenes IA, notas y próxima cita.
- [ ] El cuestionario recoge las 5 preguntas clave y el matching las usa como filtro.
- [ ] Al abrir una ficha aparecen automáticamente los perfiles más compatibles con %, motivos, riesgos y botones Aceptar/Rechazar.
- [ ] Las decisiones de la psicóloga cambian las siguientes recomendaciones.
- [ ] El plan es visible siempre (listado, cabecera de ficha, sugerencias).
- [ ] Un match con cliente Premium crea la tarea de informe; tras la cita, la de feedback; ambas visibles hasta completarse.
- [ ] Tras cada sesión, la IA genera un resumen con las 5 secciones y la psicóloga solo revisa y guarda.
- [ ] Baja: sale del matching, tareas canceladas, historial intacto. Pausado: fuera de nuevos matches y reactivable.
- [ ] Se generan los 6 avisos automáticos del PDF sin intervención manual.

---

## 6. Resumen del orden y dependencias

```
F0 Cimientos ──► F1 Cliente único ──► F2 Ficha ──► F3 Sesiones + resumen IA
                        │                               │
                        └──► F4 Matching v3 ──► F5 IA + aprendizaje
                                     │                  │
                                     └──► F6 Matches, informes, tareas Premium
                                                        │
                                          F7 Alertas y automatizaciones
                                                        │
                                          F8 Dashboard ──► F9 Cierre
```

Prioridad si hay que recortar (MVP útil para la psicóloga): **F0 → F1 → F2 → T3.1-T3.3 → F4 → T6.1-T6.4 → T7.1-T7.3 → F8**. Lo opcional: T3.5, T5.5, T7.5, T9.4.

---

## 7. Registro de cambios

| Fecha | Tarea | Cambio |
|---|---|---|
| 30/09/2026 | — | Creación del plan a partir del análisis del repositorio y del PDF de funcionalidades. |
| 30/09/2026 | — | Ajustes previos: `types.ts` se actualiza a mano, script `npm run typecheck`, `src/components/ui` fuera del lint y alcance de T0.1 ampliado para dejar el lint en verde. |
| 01/10/2026 | T0.1 | Tipos derivados en `src/types/admin.ts`, fuera los `any`/`supabase as any`, llaves en `case` de `Perfil.tsx` e `import` en `tailwind.config.ts`: lint con 0 errores. |
| 01/10/2026 | T0.2 | Buckets `fotos-perfil` y `antecedentes` privados con subida anónima acotada, bucket `videos-sesiones` solo admin, tabla `auditoria` + `registrar_auditoria`; fotos en admin con URL firmada. |
| 01/10/2026 | T0.3 | Hooks de TanStack Query en `src/hooks/admin/` (perfiles, pagos, conteo DISC); Dashboard, Perfiles, Ficha y Pagos ya no llaman a Supabase directamente. |
| 01/10/2026 | T0.4 | 15 tests de `profileMatching` (filtros de género, edad, hijos, religión y política; ciudad, objetivos, avisos; ranking y pares) con fixtures `crearPerfil`, `ana` y `luis`. |
| 01/10/2026 | T0.5 | Tabla `configuracion` (clave/valor, solo admin) con los valores por defecto de 3.3 y los pesos del matching; `useConfiguracion()` tipado y `leerConfiguracion()` para Edge Functions. |
