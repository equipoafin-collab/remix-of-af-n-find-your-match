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

- [x] **T1.1 · Estados y plan en `perfiles`** · Depende de T0.1
  - Cambios (migración):
    - Enums `estado_cliente` y `plan_tipo`; columnas de la tabla 3.1.
    - Migrar datos: `estado_perfil` `activo→activo`, `pendiente→activo + revisado=false`, `pausado→pausado`, `rechazado→baja`. Resto `revisado=true`.
    - Mantener `estado_perfil` temporalmente (deprecado) hasta T9.5.
    - Trigger `before update` que rellena `estado_cambiado_at`.
  - Aceptación: todos los perfiles tienen `estado_cliente`; la UI usa los 4 estados nuevos con badges (Activo verde, Pausado gris, Baja rojo, Finalizado azul).
  > Nota de implementación: `estado_cliente`, `revisado` y `estado_cambiado_at` (= `created_at` en los perfiles existentes) solo se rellenan desde `estado_perfil` la primera vez que se aplica la migración, para que reaplicarla no pise cambios posteriores. La política de INSERT anónimo de `perfiles` ahora exige los campos del CRM a su valor por defecto (sin plan, sesiones 0, sin revisar…); la admin puede insertar cualquiera. `sesiones_contratadas` lleva `CHECK >= 0`. En la UI, `EstadoBadge`/`SinRevisarBadge` (`src/components/admin/EstadoBadge.tsx`); el listado añade el filtro "sin revisar", la ficha una casilla "Perfil revisado" y el Dashboard cuenta como pendientes los `revisado = false`. El selector de estado de la ficha sigue siendo un `select` simple hasta T1.5.

- [x] **T1.2 · Vincular pagos y DISC al perfil** · Depende de T1.1
  - Cambios: renombrar `paid_users` → `pagos` (o crear vista compatible), añadir `perfil_id` FK y rellenarla por email (case-insensitive). Para cada pago vinculado, copiar `plan` a `perfiles.plan`. Rellenar `perfiles.disc_result_id` por email. Listar en un informe SQL los que no casen para revisión manual.
  - Cambios UI: `Pagos.tsx` permite elegir el perfil al crear un pago (buscador) y muestra enlace a la ficha. Al crear/editar un pago se actualiza el plan del perfil.
  - Aceptación: un cliente de pago aparece con su plan en listado y ficha; no hay filas de pago nuevas sin `perfil_id`.
  > Nota de implementación: `paid_users` se renombra a `pagos` (+ `perfil_id`, `importe`, `fecha`; `plan` pasa al enum `plan_tipo`) y queda una vista `paid_users` (`security_invoker`) para que el admin publicado siga leyendo hasta que se fusione la fase; **borrarla en T9.5**. Desde esa vista no se pueden crear pagos: `CHECK (perfil_id IS NOT NULL) NOT VALID` obliga a que todo pago nuevo tenga perfil sin tocar los antiguos sin casar. El plan del perfil lo fija un trigger (`pagos_copiar_plan`) al crear o editar un pago, no la UI. Emails casados con `lower(trim())`; si hay varios perfiles con el mismo email gana el más reciente (igual con DISC). El informe de pagos sin casar es el `SELECT` final de la migración; en `/admin/pagos` salen como "Sin perfil · Vincular" con buscador. Plan visible con `PlanBadge` ("Lead" si no tiene) en listado, ficha y pagos. Los DISC nuevos no se vinculan solos: queda para cuando se use `disc_result_id`.

- [x] **T1.3 · Vista `v_clientes` y contadores de sesiones** · Depende de T1.1 (la tabla `sesiones` se crea aquí, vacía, con el esquema de 3.1)
  - Cambios: crear tabla `sesiones` (solo esquema + RLS) y vista `v_clientes` con `sesiones_realizadas`, `sesiones_pendientes`, `proxima_cita`. (Las columnas de tareas/alertas/sugerencias se añaden a la vista en sus fases.)
  - Aceptación: consulta a `v_clientes` devuelve contadores correctos con datos de prueba.
  > Nota de implementación: `tipo`, `estado` y `resumen_estado` de `sesiones` son enums (`sesion_tipo`, `sesion_estado`, `resumen_estado`); `duracion_min` por defecto 60; `ON DELETE CASCADE` desde `perfiles` (solo el borrado definitivo de T9.3 borra sesiones). `v_clientes` es `security_invoker` (aplica la RLS de quien consulta) y usa `p.*`, que se fija al crearla: si `perfiles` cambia de columnas (p. ej. T9.5) hay que hacer `DROP VIEW` + `CREATE`; las columnas nuevas de otras fases van al final con `CREATE OR REPLACE`. `sesiones_pendientes` no baja de 0 y `proxima_cita` solo cuenta sesiones `programada` futuras (las citas de matches se suman en T6.1). Probado en Postgres 15 local con datos de prueba.

- [x] **T1.4 · Listado de clientes actualizado** · Depende de T1.3
  - Cambios: `PerfilesList` lee de `v_clientes`; nuevas columnas **Plan** (badge siempre visible), **Sesiones (realizadas/contratadas)**, **Próxima cita**; filtros por plan, estado nuevo y "solo clientes / solo leads". Paginación en servidor (25 por página) y búsqueda con `ilike`.
  - Aceptación: filtros combinables; rendimiento correcto con 1.000 perfiles de prueba.
  > Nota de implementación: hook `useClientes(filtros, pagina)` (`src/hooks/admin/useClientes.ts`, clave bajo `["perfiles"]`, `keepPreviousData`); el filtro de plan y el de "solo clientes / solo leads" son un único selector (clientes, esencial, premium, leads) porque miran la misma columna. Búsqueda `ilike` en nombre, email y ciudad con 300 ms de espera; `filtroBusqueda` (`src/lib/busqueda.ts`, con tests) pone el valor entre comillas para que comas y paréntesis no rompan el filtro `or` de PostgREST. Las opciones de ciudad y religión salen de `useOpcionesFiltro` (tope de 1.000 filas de PostgREST, marcado con `ponytail:`). Supabase tipa las columnas de una vista como anulables, así que el hook devuelve `Cliente` (`Perfil` + contadores, en `src/types/admin.ts`). Rendimiento medido en Postgres 15 local con 1.000 perfiles y 2.000 sesiones: página, `count` y filtros combinados < 2 ms.

- [x] **T1.5 · Reglas de cambio de estado** · Depende de T1.1
  - Cambios: función SQL `cambiar_estado_cliente(perfil_id, nuevo_estado, motivo)` que:
    - **Baja**: marca `cancelada` todas sus `tareas` pendientes, `caducada` sus `match_sugerencias` pendientes (y las que le tienen como candidato), cierra alertas abiertas. **No borra nada.**
    - **Pausado / Finalizado**: caduca sugerencias pendientes donde aparece como candidato; conserva tareas.
    - **Reactivar (→ activo)**: solo cambia estado; todo el historial sigue.
    - Registra el cambio en `auditoria` y como nota automática en `notas_privadas`.
  - (Las tablas tareas/alertas/sugerencias se crean en fases posteriores: la función debe comprobar su existencia o implementarse aquí y **ampliarse** en T4.1 y T7.1 — dejar comentario `-- AMPLIAR EN T4.1/T7.1`.)
  - UI: selector de estado en la ficha con diálogo de confirmación que explica las consecuencias.
  - Aceptación: pasar a Baja y volver a Activo conserva sesiones, notas y matches.
  > Nota de implementación: `cambiar_estado_cliente(_perfil_id, _nuevo_estado, _motivo)` es `SECURITY DEFINER` con comprobación de admin dentro (porque `auditoria` no admite INSERT directo), bloquea la fila, no hace nada si el estado no cambia y registra `{ de, a, motivo }` en la nueva columna `auditoria.detalle`. `notas_privadas` aún no existe, así que la nota automática queda para T2.2; las tareas se cancelan desde T6.2 (no T4.1/T7.1). Todo marcado con `-- AMPLIAR EN …` en la función. La ficha ya no cambia el estado con un update directo: `CambiarEstado` (`src/components/admin/ficha/`) abre un diálogo con las consecuencias y un motivo opcional y llama a la función vía `useCambiarEstado`; "Guardar cambios" guarda solo revisado y notas. Probado en Postgres 15 local: Baja → Activo conserva sesiones y plan; no-admin, anónimo y perfil inexistente fallan.

### FASE 2 — Ficha del cliente (una sola pantalla con todo)

- [x] **T2.1 · Nuevo layout de ficha con pestañas** · Depende de T1.4
  - Cambios: dividir `PerfilDetalle.tsx` en componentes dentro de `src/components/admin/ficha/`. Cabecera fija con: foto, nombre, edad, zona, **badge de estado**, **badge de plan**, **sesiones realizadas/contratadas/pendientes** (barra), **próxima cita**, contador de tareas pendientes y alertas.
  - Pestañas: **Resumen** · **Sugerencias IA** · **Sesiones** · **Matches** · **Tareas** · **Notas** · **Cuestionario** · **Documentos**.
  - "Cuestionario" contiene las secciones actuales de datos; "Resumen" muestra las 5 preguntas clave, último resumen de sesión, próximas tareas y vídeo.
  - Aceptación: toda la información actual sigue visible; la cabecera muestra plan y estado siempre.
  > Nota de implementación: componentes en `src/components/admin/ficha/` (`CabeceraFicha`, `ResumenTab`, `SugerenciasTab`, `NotasTab`, `CuestionarioTab`, `DocumentosTab`, `Campos`); la lista de pestañas es `PESTANAS` en `PerfilDetalle.tsx` y la activa va en `?tab=` para poder enlazarla. Sesiones, Matches y Tareas salen deshabilitadas hasta T3.1/T6.1/T6.2 (basta con darles `Contenido`); los contadores de tareas y alertas de la cabecera llegan con T6.2/T7.1, y en Resumen el último resumen, las próximas tareas y el vídeo con T3.3/T6.2/T2.3. `usePerfil` lee ahora de `v_clientes` (devuelve `Cliente`). La cabecera es `sticky` e incluye el selector de estado y la casilla "revisado" (se guarda al marcarla); la nota única `notas_admin` pasa a la pestaña Notas. Documentos lista los PDF de `antecedentes` cuya carpeta `user_<email o nombre>` casa con el perfil sin mayúsculas (`esCarpetaDelPerfil`, con tests) y los abre con URL firmada.

- [x] **T2.2 · Notas privadas con historial** · Depende de T2.1
  - Cambios: tabla `notas_privadas`; migrar `notas_admin` existente como primera nota. Pestaña Notas: lista cronológica, crear/editar/borrar, vincular opcionalmente a una sesión. Al crear nota → actualizar `ultimo_seguimiento_at`.
  - Aceptación: notas persistentes, ordenadas, solo visibles para admin.
  > Nota de implementación: `notas_privadas` lleva además `automatica` (notas del sistema); `created_by` por defecto `auth.uid()`; `ON DELETE CASCADE` desde `perfiles` y `SET NULL` desde `sesiones`; contenido vacío rechazado por `CHECK`. `notas_admin` se copia una sola vez, al crear la tabla (reaplicar no resucita notas borradas), y la copia no cuenta como seguimiento. El trigger `notas_seguimiento` pone `ultimo_seguimiento_at` al crear una nota manual. Hecho lo pendiente de T1.5: `cambiar_estado_cliente` deja una nota automática "Cambio de estado: X → Y. Motivo: …". La pestaña Notas lista de la más reciente a la más antigua, con crear/editar/borrar y selector de sesión (solo si el cliente tiene sesiones; `useSesiones` lo reutilizará T3.1). `notas_admin` ya no se escribe desde la UI.

- [x] **T2.3 · Vídeo de la primera sesión** · Depende de T0.2, T2.1
  - Cambios: en Resumen, bloque "Vídeo de presentación": subir (barra de progreso), reproducir (`<video>` con URL firmada de 1 h), reemplazar, eliminar. Ruta `videos-sesiones/<perfil_id>/presentacion.<ext>` guardada en `perfiles.video_presentacion_path`.
  - Aceptación: se sube y reproduce; la URL caduca; un no-admin no puede acceder.
  > Nota de implementación: sin migración (el bucket y la columna ya existían). supabase-js no informa del progreso, así que `subirConProgreso` (`src/lib/storage.ts`) sube con `XMLHttpRequest` a la API REST de Storage con la sesión de la admin (`x-upsert`). Validación de formato y tamaño en `src/lib/video.ts` (con tests). Al reemplazar con otra extensión se borra el fichero anterior, y se pide una firma nueva para que el navegador no reproduzca el vídeo viejo. El límite global de subida del proyecto no se puede consultar desde local: si es menor de 500 MB, la subida falla con un 413 que la UI explica. Comprobado por API que un anónimo no puede firmar, listar ni leer en público el bucket.

- [x] **T2.4 · Editar plan y sesiones contratadas desde la ficha** · Depende de T1.2
  - Cambios: diálogo "Plan" (tipo, fecha inicio/fin, sesiones contratadas, con sugerencia automática según plan y meses).
  - Aceptación: cambios reflejados en cabecera, listado y vista.
  > Nota de implementación: sin migración. Botón "Plan" junto a la etiqueta del plan en la cabecera (`EditarPlan`), que además muestra las fechas del plan. Al cambiar plan o fechas se propone `sesiones_por_plan[plan] × meses` (`src/lib/plan.ts`, con tests; meses = días entre fechas, ambas incluidas, / 30,44, redondeado y mínimo 1) y se puede ajustar a mano; al dar de alta un plan el inicio por defecto es hoy. "Sin plan" devuelve el perfil a lead. Fechas al revés o sesiones no enteras bloquean el guardado (solo en el formulario: no hay `CHECK` en BD). Guarda con `useUpdatePerfil`, que refresca cabecera, listado y `v_clientes`.

### FASE 3 — Sesiones y resumen automático con IA

- [x] **T3.1 · CRUD de sesiones** · Depende de T1.3, T2.1
  - Cambios: pestaña Sesiones: listado (fecha, tipo, estado, badge del resumen), crear/programar, marcar como realizada / cancelada / no asistió. La primera sesión se marca `tipo='primera'` y puede asociar el vídeo.
  - Aceptación: los contadores de la cabecera cambian al marcar sesiones realizadas; "próxima cita" = siguiente sesión programada o cita de match, la más próxima.
  > Nota de implementación: migración con índice único parcial `uq_sesiones_una_primera` (una primera no cancelada por cliente) y trigger `sesiones_seguimiento` que pone `ultimo_seguimiento_at` al registrar o marcar una sesión realizada (sin retroceder ni pasar de ahora), como pide 3.1. Pestaña Sesiones (`SesionesTab`): alta con fecha, duración, tipo y estado (fecha pasada → "realizada" por defecto; "primera" por defecto si aún no hay), y cambio de estado con un selector por fila, que también permite corregir. Sin borrar ni reprogramar: una sesión equivocada se cancela y se crea otra. "Asociar el vídeo": la primera sesión enlaza al vídeo de presentación de Resumen, sin duplicar la ruta en `sesiones.video_path` (queda para T3.5). La próxima cita ya la daba `v_clientes`; las citas de match se suman en T6.1.

- [x] **T3.2 · Edge Function `resumen-sesion`** · Depende de T3.1
  - Entrada: `sesion_id`. Lee `notas_brutas` de la sesión, datos clave del cliente y los 3 últimos resúmenes revisados (para medir evolución).
  - Salida JSON validada: `{ estado_emocional, temas_tratados[], avances[], objetivos[], proximos_pasos[], preferencias_detectadas[] }`. Guarda en `sesiones.resumen_ia` con `resumen_estado='borrador'`.
  - Reutilizar el patrón de auth admin y gestión de errores 429/402 de `compatibility-report`. Extraer ese código común a `supabase/functions/_shared/` (auth, cors, llamada IA, parseo JSON).
  - Aceptación: con unas notas de ejemplo devuelve las 5 secciones en español; errores de IA se muestran con toast.
  > Nota de implementación: código común en `supabase/functions/_shared/` (`http.ts` CORS y `json()`, `auth.ts` `exigirAdmin`, `ia.ts` `pedirJSON` + `ErrorIA` 429/402/500, y sin dependencias de Deno `json.ts` `parsearJSON` y `resumen.ts` tipo `ResumenSesion` + `validarResumen`, probados con Vitest desde `src/lib/__tests__/resumenSesion.test.ts`); `compatibility-report` pasa a usarlo. `preferencias_detectadas` es opcional; las otras cuatro listas y el estado emocional, obligatorios. La función no escribe notas en los logs y registra `generar_resumen_ia` en `auditoria`. Hook `useGenerarResumen` con toast del mensaje real de la función (`FunctionsHttpError.context`). Despliegue: Lovable despliega solas las funciones que llegan a `main` (unos 9 min tras fusionar la PR #6). Probado en producción con notas inventadas en el perfil de prueba: ~3 s, 6 secciones en español guardadas como `borrador`; sin notas devuelve 400 con mensaje claro. Decisión posterior: la función ya no envía a la IA los criterios del cuestionario (qué busca, edades, zona, valores), solo nombre, edad y género; los copiaba a "preferencias detectadas" aunque no salieran en las notas, incluso pidiéndole que no lo hiciera, y el matching ya los lee del perfil (se despliega con T3.3).

- [x] **T3.3 · Revisión y guardado del resumen** · Depende de T3.2
  - Cambios: al marcar una sesión como realizada se abre un panel "Notas de la sesión" (textarea) + botón **Generar resumen con IA**. El borrador aparece en campos editables por sección; botones **Guardar como revisado** y **Regenerar**. Al guardar: `resumen_estado='revisado'`, `resumen_revisado_at`, `ultimo_seguimiento_at` del perfil.
  - Aceptación: la psicóloga solo tiene que revisar y guardar; el historial muestra cada resumen desplegable.
  > Nota de implementación: `PanelResumen` dentro de cada sesión realizada de la pestaña Sesiones (se abre solo al marcarla realizada; la etiqueta del resumen la despliega y pliega). Las notas se guardan en `notas_brutas` antes de llamar a la función; regenerar un resumen ya revisado pide confirmación. Cada lista se edita como texto, una línea por punto, y al guardar se limpia con el mismo `validarResumen` de la Edge Function. "Guardar como revisado" (`useGuardarResumen`, en `src/hooks/admin/useResumenSesion.ts`) sella `resumen_revisado_at` y `perfiles.ultimo_seguimiento_at` con dos updates (marcado `ponytail:`). `ResumenSesion` pasa a `type` para encajar en `Json` sin casts. Probado en producción en la sesión de prueba: regenerar desde la UI, editar una lista y guardar como revisado.

- [x] **T3.4 · Evolución del cliente** · Depende de T3.3
  - Cambios: en Resumen, línea temporal compacta con el estado emocional y avances de cada sesión revisada.
  - Aceptación: se ve la evolución de las últimas sesiones de un vistazo.
  > Nota de implementación: `EvolucionCliente` en Resumen, entre las preguntas clave y el vídeo: las 6 últimas sesiones con resumen revisado (la más reciente marcada como "última", que cubre el "último resumen de sesión" de T2.1), con estado emocional y avances, y enlace a la pestaña Sesiones. Sin consultas nuevas: reutiliza `useSesiones`.

- [ ] **T3.5 · (Opcional) Transcripción automática** · Depende de T3.2
  - Cambios: Edge Function que, a partir de un audio/vídeo subido, genera la transcripción (modelo con entrada de audio disponible en el gateway) y la guarda en `notas_brutas`.
  - Aceptación: subir audio → transcripción → botón generar resumen.
  > Pospuesta (opcional): la Fase 3 se cierra sin ella; la psicóloga pega sus notas o la transcripción a mano.

### FASE 4 — Cuestionario clave y motor de matching v3 (servidor + persistencia)

- [x] **T4.1 · Tabla `match_sugerencias`** · Depende de T1.1
  - Cambios: tabla según 3.1 + índices `(perfil_id, estado)`, `(candidato_id)`. Ampliar `cambiar_estado_cliente` (T1.5). Añadir `sugerencias_pendientes` a `v_clientes`.
  - Aceptación: RLS solo admin; función de estado caduca sugerencias.
  > Nota de implementación: `estado` es el enum `sugerencia_estado`; las tres puntuaciones son enteros 0-100 (`score_ia` null = solo reglas), `version_algoritmo` obligatorio, `CHECK (perfil_id <> candidato_id)` y `ON DELETE CASCADE` desde ambos perfiles. `cambiar_estado_cliente` caduca solo las `pendiente` (aceptadas y rechazadas se conservan para el aprendizaje): Pausado/Finalizado las que le tienen como candidato, Baja además las suyas; reactivar no resucita ninguna, las recalcula T4.4. `sugerencias_pendientes` va al final de `v_clientes` con `CREATE OR REPLACE`. Sin UI: la usa T4.5. Probado en Postgres 15 local (aplicada dos veces, RLS, caducidad por estado y cascada).

- [x] **T4.2 · Preguntas clave del cuestionario** · Depende de T1.1
  - Cambios en `Perfil.tsx` (flujo público) **sin alargarlo**:
    - `zona`: sustituir/complementar ciudad libre por selector de provincia (lista de provincias de España + "Otra"), y checkbox "Estoy abierto/a a conocer gente de otras zonas".
    - `valores_importantes`: multi-selección (máx. 3) de una lista cerrada: Familia, Honestidad, Fe/espiritualidad, Ambición, Libertad, Estabilidad, Humor, Cultura, Salud/deporte, Compromiso social.
  - Constante compartida `src/lib/preguntasClave.ts` que define las **5 preguntas clave** (tipo_relacion, hijos, rango edad, zona, valores_importantes) con etiqueta y opciones; la ficha y el matching la usan.
  - Script/SQL de relleno: `zona` a partir de `ciudad` cuando coincida con una provincia.
  - Aceptación: nuevos perfiles guardan zona y valores; ficha muestra "Preguntas clave" en Resumen.
  > Nota de implementación: se complementa la ciudad (no se sustituye: el matching, el listado y el informe la usan): selector nativo de provincia obligatorio y la casilla de otras zonas en el paso "Datos"; valores (de 1 a 3) al principio del paso "Valores", con las opciones sobrantes deshabilitadas al llegar a 3. Sin pasos nuevos. `preguntasClave.ts` exporta además `TIPO_RELACION`, `HIJOS`, `PROVINCIAS` (50 + Ceuta, Melilla y "Otra") y `VALORES_IMPORTANTES`, que `/perfil` ya no define por su cuenta; `PREGUNTAS_CLAVE` lleva por pregunta `clave`, `etiqueta`, `opciones` y `respuesta(perfil)`, y Resumen se pinta con ella. Cuestionario muestra provincia y valores. El relleno es la migración `20261007120000_t4_2_rellenar_zona.sql`: casa la ciudad con el nombre de la provincia o sus variantes (Vizcaya, Gerona, La Coruña…) sin tildes ni mayúsculas, y solo toca perfiles sin zona. La política de INSERT anónimo de T1.1 ya admitía estas columnas. Probado en Chrome con migración aplicada: el perfil de prueba "Prueba Claude T4.2" (`prueba-t42@example.com`) se guardó con provincia y valores y sale en Resumen; el perfil existente "madrid" quedó con zona Madrid.

- [x] **T4.3 · Algoritmo v3 compartido** · Depende de T4.2, T0.4, T0.5
  - Cambios en `src/lib/profileMatching.ts` (mantener tests pasando, añadir nuevos):
    - Filtros duros nuevos: candidato con `estado_cliente='activo'`; zona incompatible si ninguno acepta otras zonas y `zona` distinta; excluir ids recibidos en `excluirIds` (rechazados previos, matches en curso).
    - Nueva dimensión **valores_importantes** (Jaccard) dentro de "valores"; geografía usa `zona` además de ciudad.
    - Pesos inyectables: `matchProfiles(a, b, { pesos, ajustes })`.
    - Exportar `VERSION_ALGORITMO = 'v3'`.
  - El fichero debe ser **puro** (sin imports de navegador) para poder copiarse/importarse desde la Edge Function (`supabase/functions/_shared/profileMatching.ts`; documentar cómo mantener ambos sincronizados o usar import relativo si el bundler lo permite).
  - Aceptación: tests nuevos para estado, zona, valores y pesos.
  > Nota de implementación: una sola copia, sin sincronizar: el algoritmo vive en `supabase/functions/_shared/profileMatching.ts` (sin imports, lo cargan Deno y Vite) y `src/lib/profileMatching.ts` lo reexporta, igual que `_shared/resumen.ts`. Las Edge Functions lo importan con `../_shared/profileMatching.ts`. `PerfilForMatching` suma `zona`, `acepta_otras_zonas`, `valores_importantes` y `estado_cliente`. Filtros nuevos (a = cliente, b = candidato): candidato no `activo` (el estado del cliente no filtra), `excluirIds` y zonas distintas si ninguno acepta otras zonas; "Otra" o sin zona no excluye. Valores: Jaccard de `valores_importantes` con 30 puntos dentro de "valores" (neutro si alguno no contestó). Geografía: misma ciudad 100, misma provincia 80 (y aviso "Misma provincia"), ciudad desconocida 50, resto 30. `matchProfiles(a, b, { pesos, ajustes, excluirIds })` y `findMatchesFor(…, limit, opciones)`: peso efectivo = `pesos[d] × ajustes[d]` (multiplicadores, 1 = sin cambio) y el score se divide por la suma de pesos, así sigue en 0-100 aunque no sumen 1. Los límites de ±30 % los aplica T5.3. 13 tests nuevos (28 en total).

- [x] **T4.4 · Edge Function `sugerencias-calcular`** · Depende de T4.1, T4.3
  - Entrada: `perfil_id`, `forzar?: boolean`.
  - Pasos: cargar cliente + pool de candidatos activos (solo columnas necesarias) → excluir rechazados/en curso → puntuar por reglas → top `num_sugerencias` → **upsert** en `match_sugerencias` (no pisa las `aceptada`/`rechazada`; actualiza score de las `pendiente`; marca `caducada` las pendientes que ya no entran).
  - Aceptación: llamar dos veces no duplica; respeta decisiones previas.
  > Nota de implementación: respuesta `{ recalculado, pendientes, nuevas, caducadas }` o `{ recalculado: false, motivo }`. Sin `forzar` no recalcula si alguna sugerencia del cliente se calculó hace menos de 24 h (la otra condición de T4.5, "perfil cambiado", la decide T4.5); tampoco recalcula si el cliente no está activo (conserva lo que tenga). Pool: perfiles activos, solo las columnas de `PerfilForMatching`, con pesos y `num_sugerencias` de `configuracion`; las aceptadas y rechazadas van en `excluirIds` (los matches en curso se suman en T6.1, marcado `AMPLIAR EN T6.1`). Qué insertar, actualizar y caducar lo decide `planificarSugerencias` (`_shared/sugerencias.ts`, con tests); las escrituras llevan su propia condición (insertar ignora pares existentes, actualizar solo toca `pendiente`/`caducada`) para no pisar una decisión tomada durante el cálculo. Las caducadas que vuelven al top pasan otra vez a `pendiente`. Tope de 1.000 perfiles por consulta de PostgREST, marcado `ponytail:`.

- [x] **T4.5 · Pestaña "Sugerencias IA" con aceptar/rechazar** · Depende de T4.4, T2.1
  - Cambios: al **abrir la ficha** se leen las sugerencias guardadas (instantáneo) y se lanza `sugerencias-calcular` en segundo plano si están obsoletas (> 24 h o `perfiles.updated_at` posterior). Tarjeta por candidato: foto, nombre, edad, zona, plan, **% compatibilidad**, **motivos**, **riesgos**, desglose por dimensión (barras) y botones **Aceptar** / **Rechazar** (este último con chips de motivo + texto opcional). Enlace a la ficha del candidato.
  - Filtros: pendientes / aceptadas / rechazadas.
  - Eliminar el botón "Buscar Pareja Compatible" manual (sustituir por "Recalcular").
  - Aceptación: aceptar/rechazar persiste y desaparece de pendientes; un rechazado no vuelve a aparecer.
  > Nota de implementación: hooks en `src/hooks/admin/useSugerencias.ts`. Al abrir la ficha (cualquier pestaña) `useCalculoAutomatico` llama a `sugerencias-calcular` sin `forzar`, una vez por visita; la función ya decide si están obsoletas (24 h), así que no se añadió `perfiles.updated_at`: el admin no permite editar el cuestionario y "Recalcular" (con `forzar`) cubre el resto. Si el cálculo falla, la pestaña muestra las guardadas y un aviso. Tarjeta con foto, nombre (enlace a su ficha), edad, zona, plan, %, motivos, riesgos y barras por dimensión. Aceptar es un clic (sin motivo); Rechazar pide chips (Edad, Distancia, Valores, Físico, Intuición profesional) y texto opcional, guardados en `motivo_decision` como "Distancia, Edad — texto". Solo se decide una `pendiente`: si caducó entretanto, avisa. Las caducadas no se muestran. `mensajeDeFuncion` pasa a su propio fichero para reutilizarlo. Probado en local con la función desplegada (PR #9): la sugerencia aparece sola al abrir la ficha, "Recalcular" no la duplica, rechazar con motivo y aceptar persisten y el rechazado no vuelve.

### FASE 5 — IA de sugerencias y aprendizaje

- [x] **T5.1 · Contexto del cliente para la IA** · Depende de T3.3, T2.2
  - Cambios: tabla `perfil_aprendizaje`. Función compartida `construirContextoCliente(perfil_id)` en `_shared/` que junta: preguntas clave, datos resumidos del cuestionario, DISC, últimos 5 resúmenes revisados, últimas 10 notas, `preferencias` aprendidas y últimas 20 decisiones (candidato resumido + aceptada/rechazada + motivo). Limitar a ~6.000 tokens (recortar lo más antiguo).
  - Aceptación: test manual de la función devuelve un texto estructurado y acotado.
  > Nota de implementación: tabla `perfil_aprendizaje` según 3.1 (`preferencias` y `ajustes_pesos` jsonb `{}` por defecto, solo admin, `ON DELETE CASCADE`). La función está en dos piezas: `_shared/contexto.ts` (`formatearContexto`, sin dependencias, 5 tests en Vitest) arma el texto por secciones y recorta, y `_shared/contextoCliente.ts` (`construirContextoCliente(supabase, perfilId, maxTokens?)`) lee de la BD con el cliente service role. Secciones: preguntas clave (con `PREGUNTAS_CLAVE`, que pasa a `_shared/preguntasClave.ts` reexportado desde `src/lib` para que la IA use las mismas etiquetas que la ficha), cuestionario sin nombre, email ni teléfono (minimización RGPD; respuestas abiertas recortadas a 300 caracteres), DISC (`disc_results` si está vinculado, si no `disc_perfil`), preferencias aprendidas, 5 últimos resúmenes revisados (validados con `validarResumen`), 10 últimas notas no automáticas (recortadas a 800) y 20 últimas decisiones con el candidato resumido (sin nombre). Tokens ≈ caracteres / 4; si pasa de 6.000 se quita el elemento más antiguo de entre resúmenes, notas y decisiones hasta que quepa. Sin datos reales todavía: `construirContextoCliente` lo usa por primera vez T5.2, y se prueba con ella. Tipos de Deno comprobados en local con `npx deno check`, el mismo control que hace Lovable al desplegar.

- [x] **T5.2 · Re-ranking con IA** · Depende de T4.4, T5.1
  - Cambios en `sugerencias-calcular`: tras el ranking por reglas, enviar el **top 15** a la IA con el contexto. Respuesta JSON por candidato: `{ candidato_id, score_ia (0-100), motivos[] (máx 4), riesgos[] (máx 3) }`. Guardar `score_ia`, combinar `score = round(peso_reglas·score_reglas + peso_ia·score_ia)`, sustituir `motivos/riesgos` por los de la IA (conservando los de reglas en `desglose`). Si la IA falla → quedarse con reglas y marcar `score_ia = null` (la UI muestra "solo reglas").
  - Aceptación: motivos y riesgos personalizados y en español; nunca se bloquea la ficha si la IA falla.
  > Nota de implementación: en `sugerencias-calcular`, reglas → `construirContextoCliente` → IA → guardado. Se envían los `num_candidatos_ia` (15) mejores por reglas sin nombre ni contacto, con ids `C1…` (la IA no estropea un id corto como haría con un UUID) y con hobbies para personalizar. Lógica pura en `_shared/reranking.ts` (prompt, `validarReranking` y `combinarConIA`, 8 tests): score final `(1 − peso_ia)·reglas + peso_ia·IA` (`peso_ia` 0,5 en `configuracion`), se reordena y se guardan los `num_sugerencias` mejores; motivos y riesgos de la IA sustituyen a los de reglas, que quedan en `desglose.motivos_reglas/riesgos_reglas` (si la IA deja una lista vacía, se usan los de reglas). Cualquier fallo de la IA o del contexto → solo reglas (`score_ia` null) y la respuesta lleva `ia: false`. Cada envío queda en `auditoria` (`rerank_sugerencias_ia`). La tarjeta muestra "IA 45 · reglas 66" o "Solo reglas". Probado en producción: ~5 s, `ia: true`, motivos y riesgos en español con datos de las sesiones. Tras la prueba se ajustó el prompt (la IA citaba "C1" y una vez contradijo los datos); se despliega con T5.3. Lovable no redespliega solo una función ya existente que cambia: hay que pedírselo.

- [x] **T5.3 · Aprender de las decisiones** · Depende de T4.5, T5.1
  - Cambios: Edge Function `actualizar-aprendizaje(perfil_id)` llamada tras cada aceptar/rechazar y tras guardar un resumen revisado:
    1. Recalcula `ajustes_pesos` (regla de 3.2) a partir del desglose de sugerencias aceptadas vs. rechazadas (mínimo 3 decisiones para empezar a ajustar).
    2. Pide a la IA que actualice `preferencias` (`{ valora: [], evita: [], notas: '' }`) a partir de decisiones, resúmenes (`preferencias_detectadas`) y notas.
    3. Marca las sugerencias pendientes del cliente como obsoletas para que se recalculen.
  - UI: en Sugerencias, bloque plegable "Lo que la IA ha aprendido de este cliente" (preferencias + ajustes de peso), editable por la psicóloga.
  - Aceptación: tras rechazar varios candidatos por "distancia", el peso de geografía sube para ese cliente y el ranking cambia.
  > Nota de implementación: lógica pura en `_shared/aprendizaje.ts` (7 tests). Regla de pesos (`calcularAjustes`, desde 3 decisiones, factores entre 0,7 y 1,3): lo que destaca en el desglose de los aceptados respecto a su media gana peso y lo que destaca en los rechazados lo pierde (y lo que flojeaba en ellos lo gana); además cada chip de rechazo suma hasta +30 % a su dimensión según la parte de rechazos que lo citan (Distancia → geografía, Valores → valores, Físico → preferencias; Edad e Intuición profesional no tienen dimensión y los recoge la IA). Con ese límite el efecto en el score es de 2-3 puntos (decide entre candidatos parecidos); el peso grande del aprendizaje está en la IA de T5.2, que lee decisiones y preferencias. `actualizar-aprendizaje` guarda ajustes y preferencias (la IA parte de las actuales, que pueden llevar correcciones de la psicóloga; si falla, se guardan solo los ajustes), registra el envío en `auditoria` y deja las pendientes con `calculado_at` antiguo; `sugerencias-calcular` solo mira las pendientes para la vigencia de 24 h y aplica `ajustes_pesos`. La ficha la lanza en segundo plano tras aceptar/rechazar y tras "Guardar como revisado". Bloque "Lo que la IA ha aprendido" (`AprendizajeCliente`, `<details>` nativo): preferencias editables y ajustes de peso en % (solo lectura: se recalculan solos). Probado en producción: tras rechazar a la prueba por "Distancia", la IA anotó "Relaciones a distancia (rechazó candidata de Barcelona)" entre lo que evita; la corrección manual se guarda. El ajuste de pesos con datos reales necesita 3 decisiones de un mismo cliente (cubierto por los tests).

- [x] **T5.4 · Detección de nuevos perfiles compatibles** · Depende de T4.4
  - Cambios: trigger `after insert` en `perfiles` (y al pasar a `activo`) que encola el nuevo perfil (tabla `cola_matching` o columna `pendiente_matching`). El proceso programado (T7.3) calcula ese perfil **contra todos los clientes activos con plan** solo por reglas (barato) y, si alguno supera `umbral_alta_compatibilidad`, crea/actualiza la sugerencia y una **alerta** "Nuevo perfil muy compatible con X".
  - Aceptación: al insertar un perfil de prueba muy compatible aparece la alerta en el siguiente ciclo.
  > Nota de implementación: tabla `cola_matching` (`perfil_id` PK, `motivo` alta/reactivado, solo admin) y triggers en `perfiles` (alta activa y vuelta a Activo); la función del trigger es `SECURITY DEFINER` porque el alta llega del formulario anónimo. Edge Function `procesar-cola-matching`: hasta 50 perfiles por llamada contra los clientes activos con plan, solo reglas, con pesos y ajustes de cada cliente; si score ≥ `umbral_alta_compatibilidad` crea o actualiza la sugerencia con las mismas condiciones que `sugerencias-calcular` (no duplica ni pisa decisiones) y saca de la cola solo lo leído. Lógica pura en `_shared/deteccion.ts` (5 tests); `COLUMNAS_MATCHING` pasa a `_shared/profileMatching.ts`. Falta, marcado en el código: la alerta "Nuevo perfil muy compatible con X" (`AMPLIAR EN T7.1`) y la llamada del proceso programado sin sesión de admin (`AMPLIAR EN T7.3`); hasta entonces se lanza a mano y la aceptación completa (alerta en el siguiente ciclo) se comprueba en la Fase 7. Probado en producción: reactivar a un perfil lo encola y el proceso lo trata y vacía la cola (sin detecciones: el par de prueba puntúa 66 < 80).

- [ ] **T5.5 · (Opcional) Aprendizaje global** · Depende de T5.3
  - Cambios: en Configuración, mostrar los ajustes de peso medios de todos los clientes y botón "Aplicar como pesos por defecto".
  > Pospuesta (opcional): la Fase 5 se cierra sin ella. Tiene más sentido con muchos clientes con decisiones; encaja con la pantalla de Configuración (T9.2).

### FASE 6 — Matches, citas, informes y gestión de planes

- [x] **T6.1 · Tabla `matches` y flujo de presentación** · Depende de T4.5
  - Cambios: al **Aceptar** una sugerencia se crea un `match` (A = cliente, B = candidato, estado `propuesto`) — si ya existe el par (en cualquier orden) se reutiliza. Pestaña **Matches** de la ficha: lista con estado, fecha de cita, lugar y acciones para avanzar de estado (`informe_enviado`, `cita_agendada` con fecha/lugar, `cita_realizada`, `feedback_registrado`, `continuan`, `cerrado`).
  - Aceptación: el flujo completo se puede recorrer; las citas aparecen como "próxima cita" de ambos.
  > Nota de implementación: `estado` es el enum `match_estado`; `CHECK (perfil_a <> perfil_b)`, valoraciones 1-5 y `ON DELETE CASCADE` desde ambos perfiles. Un solo match por pareja en cualquier orden (`uq_matches_pareja` sobre `LEAST/GREATEST`). El match lo crea el trigger `sugerencias_crear_match` al pasar una sugerencia a `aceptada` (`ON CONFLICT DO NOTHING`: si B acepta luego a A, se reutiliza), así sirve también para la vista global de T9.1; la migración crea además el de las aceptadas anteriores. `v_clientes.proxima_cita` = la más cercana entre sesión programada y cita de match `cita_agendada` futura, para los dos (mismo nombre y tipo de columna: `CREATE OR REPLACE`). `sugerencias-calcular` excluye a quien ya tenga un match con el cliente, en cualquier orden y estado. Pestaña Matches (`MatchesTab`, hooks en `useMatches.ts`): la otra persona con enlace a su ficha, plan y quién lo propuso; selector de estado como el de Sesiones (todos los estados, sin orden obligatorio: el informe es opcional con plan Esencial); "Cita agendada" abre fecha y lugar, editables después; pasar a "Informe enviado" sella `informe_enviado_at`. Probado en local contra la BD real con el match de prueba: flujo completo hasta "cerrado" y la cita como próxima cita de los dos en cabecera; probado en Postgres 15 (trigger, reutilización del par, vista, RLS, cascada). La exclusión en `sugerencias-calcular` se despliega con la PR de la fase.

- [x] **T6.2 · Tareas (tabla + UI básica)** · Depende de T1.1
  - Cambios: tabla `tareas` (3.1). Pestaña **Tareas** en la ficha y panel global `/admin/tareas` (nueva ruta y entrada de menú, sustituye a "Seguimiento" o se añade al menú): filtros por tipo/estado/vencimiento, marcar completada, crear tarea manual. Las tareas pendientes **no desaparecen hasta completarse o cancelarse**; vencidas en rojo.
  - Aceptación: CRUD funcionando; `tareas_pendientes` añadido a `v_clientes`.
  > Pendiente de T1.5: ampliar `cambiar_estado_cliente` para que Baja cancele las tareas pendientes.
  > Nota de implementación: tabla según 3.1 con enums `tarea_tipo`, `tarea_estado` y `tarea_origen`, `perfil_id` obligatorio (toda tarea es de un cliente), `match_id` con `SET NULL`, título no vacío y `clave_unica` única para las automáticas. El trigger `tareas_completada` sella `completada_at` al completar (y lo quita al reabrir), venga de la UI o de una automatización. `tareas_pendientes` al final de `v_clientes`. Hecho lo pendiente de T1.5: Baja cancela las tareas pendientes. UI compartida en `src/components/admin/tareas/ListaTareas.tsx` (casilla para completar, ✕ para cancelar, reabrir, vencidas en rojo, etiqueta "Automática") y `NuevaTarea` (en la ficha el cliente viene dado; en el panel se busca con `BuscadorPerfil`; un día de vencimiento vence a las 23:59 local). Pestaña Tareas de la ficha (filtro por estado), panel global `/admin/tareas` con entrada "Tareas" en el menú (filtros por estado, tipo y vencimiento; "Seguimiento" sigue hasta T9.1), contador en la cabecera y "Próximas tareas" (5) en Resumen, como pedía T2.1. Lógica de vencimiento y orden en `src/lib/tareas.ts` (tests). Probado en local contra la BD real: crear (una vencida), filtro de vencidas, completar, cancelar, reabrir y contadores de cabecera y vista.

- [x] **T6.3 · Informe de compatibilidad integrado** · Depende de T6.1
  - Cambios: mover la funcionalidad de `CompatibilityDashboard.tsx` a un botón **"Generar informe"** dentro de cada match. Llama a `compatibility-report` (ampliado para incluir preguntas clave y contexto de T5.1), guarda en `matches.informe`, permite editar, exportar PDF (reutilizar jsPDF) y **marcar como enviado** (`informe_enviado_at`). Redirigir `/compatibilidad` → `/admin`.
  - Aceptación: informe guardado y exportable desde la ficha; la página antigua ya no se usa.
  > Nota de implementación: `compatibility-report` recibe `{ match_id }`, construye el prompt con `construirContextoCliente` de los dos (`alcance: "cuestionario"`: preguntas clave, cuestionario y DISC), valida con `validarInforme` (`_shared/informe.ts`, tests; el nivel se deduce del score si no es uno de los cuatro), guarda en `matches.informe` y registra `generar_informe_ia` en `auditoria`. **Decisión de privacidad**: el plan pedía también el contexto de T5.1, pero el informe lo leen los clientes y, con sesiones en el prompt, la IA citó una preferencia salida de una sesión ("él prefiere no fumadoras") aunque el prompt lo prohibía; por eso el informe no recibe sesiones, notas, preferencias aprendidas ni decisiones (la psicóloga puede añadir matices al editarlo). En cada match, botón "Informe" → `PanelInforme`: generar/regenerar (con confirmación), editar como el resumen de sesión, exportar PDF (`src/lib/informePdf.ts`, el jsPDF de la página antigua) y "Marcar como enviado" (guarda lo que se ve, sella `informe_enviado_at` y pasa el match a "Informe enviado" si seguía en "propuesto"). `/compatibilidad` redirige a `/admin` y `CompatibilityDashboard.tsx` se borra (adelanta parte de T9.5). Probado en producción (generar ~6 s) y en la ficha (editar, guardar, marcar como enviado); el PDF se probó después (07/10/2026) interceptando la descarga: la línea de cada fortaleza salía ilegible porque la marca ✓ no existe en la Helvetica de jsPDF (WinAnsi) y jsPDF pasaba la línea entera a UTF-16; ahora todo el texto pasa por `aWinAnsi` (sustituye ✓ → ≥ ≤ y quita emojis) y la marca es "+".

- [x] **T6.4 · Tareas automáticas del plan Premium** · Depende de T6.1, T6.2, T6.3
  - Triggers SQL sobre `matches`:
    - Al crear un match: por cada lado (A y B) cuyo cliente sea **Premium** → tarea `enviar_informe` ("Enviar informe de compatibilidad a <cliente> sobre <candidato>"), `clave_unica = 'informe:<match_id>:<perfil_id>'`. Se **completa automáticamente** al marcar `informe_enviado_at`.
    - Bloqueo suave: si hay tarea `enviar_informe` pendiente, al pasar a `cita_agendada` mostrar aviso "El informe aún no se ha enviado" (se puede continuar).
    - Al pasar a `cita_realizada`: tarea `registrar_feedback` para cada lado Premium (y, si se decide, también Esencial, ya que el plan incluye feedback) con `vence_at = fecha_cita + dias_feedback`. Se completa al registrar el feedback.
  - Aceptación: recorrer el flujo con un Premium genera y cierra las dos tareas sin intervención; con Esencial no se genera la de informe.
  > Nota de implementación: un trigger (`matches_tareas`, función `matches_tareas_automaticas`) sobre INSERT y UPDATE de `estado`, `informe_enviado_at`, `feedback_a/b`; todas con `origen = 'auto'` y `clave_unica` (`informe:<match>:<perfil>`, `feedback:<match>:<perfil>`), así repetir un evento no duplica. Informe: por cada lado Premium al crear el match; se completa al sellar `informe_enviado_at` (uno por pareja: completa las de los dos lados). Feedback: decidido para **todo cliente con plan** (Premium y Esencial; el Esencial también incluye citas), no para leads; vence en `fecha_cita + dias_feedback` (de `configuracion`); se completa por lado al registrar su texto (T6.5) o todas al pasar a "feedback registrado"/"continúan". Además, cerrar el match cancela sus tareas automáticas pendientes (no las manuales). Bloqueo suave en `FormCita`: aviso si hay un lado Premium y el informe no se ha enviado. Aceptar, cambiar un match y guardar invalidan también `["tareas"]`. Probado en Postgres 15 (Premium/Esencial/lead, completar, sin duplicados, cancelar al cerrar) y en producción el camino del feedback: "cita realizada" creó la tarea de vicente (Esencial) con vencimiento a 3 días de la cita y ninguna para la prueba (lead).

- [x] **T6.5 · Registro de feedback** · Depende de T6.1
  - Cambios: diálogo en el match para registrar feedback de A y de B (texto + valoración 1-5 + "¿quieren volver a verse?"). Se guarda en el match, actualiza `ultimo_seguimiento_at` y dispara `actualizar-aprendizaje` para ambos.
  - Aceptación: feedback visible en la ficha de ambos clientes.
  > Nota de implementación: columnas nuevas `quiere_repetir_a/b` (el "¿quieren volver a verse?" no estaba en 3.1; null = sin respuesta). Panel "Registrar feedback" en cada match cuya cita ya se hizo (`PanelFeedback`, inline como el informe): texto, valoración 1-5 y volver a verse para cada lado. `useGuardarFeedback` guarda y sella `feedback_at`; con el texto de los dos, el match pasa de "cita realizada" a "feedback registrado". Por triggers, el texto de cada lado completa su tarea de T6.4 y pone `ultimo_seguimiento_at` de ese cliente (`matches_feedback`). Después se lanza `actualizar-aprendizaje` para los dos, y para que sirva de algo el feedback del propio cliente entra en el contexto de T5.1 (sección "Feedback del cliente tras sus citas", 10 últimas, recortable como el resto; no en el informe para clientes). El botón resume las valoraciones ("Feedback –/5 · 4/5") y se ve igual desde la ficha de cada uno. Probado en producción: feedback solo de vicente → su tarea completada, su seguimiento sellado, el match sigue en "cita realizada" y se ve desde la ficha de la prueba.

### FASE 7 — Alertas y automatizaciones

- [x] **T7.1 · Tabla `alertas` y centro de avisos** · Depende de T1.1
  - Cambios: tabla `alertas` (3.1). Icono de campana en `AdminLayout` con contador de abiertas y panel desplegable; página `/admin/alertas` con filtros; en la ficha, banda superior con las alertas del cliente. Acciones: marcar vista, resolver, ir a la ficha. Ampliar `cambiar_estado_cliente` (cerrar alertas en Baja). Añadir `alertas_abiertas` a `v_clientes`.
  - Aceptación: alertas creadas a mano por SQL se ven y se resuelven.
  > Nota de implementación: tabla según 3.1 con enums `alerta_tipo` (informe_pendiente, feedback_pendiente, pocas_sesiones, plan_terminado, nuevo_compatible, sin_seguimiento, otra), `alerta_severidad` y `alerta_estado` (abierta = sin ver, vista, resuelta); `perfil_id` y `match_id` opcionales con `CASCADE`; `resuelta_at` lo sella un trigger. `alertas_abiertas` de `v_clientes` cuenta las no resueltas; la campana cuenta las "abiertas" (sin ver) y se refresca cada minuto. Campana en la cabecera del menú (`CampanaAlertas`, `Popover`) con las pendientes (urgentes primero), página `/admin/alertas` (filtros por estado, severidad y tipo) y banda bajo la cabecera de la ficha (`AlertasCliente`, solo si hay). Lista compartida `ListaAlertas` (marcar vista, resolver, ir a la ficha). `cambiar_estado_cliente` resuelve las alertas en Baja (con esto la función queda completa). Hecho lo pendiente de T5.4: `procesar-cola-matching` crea la alerta "Nuevo perfil muy compatible" (`compatible:<cliente>:<perfil>`). Probado en Postgres 15 y en producción con dos alertas creadas desde la consola: campana, panel, banda, página, marcar vista y resolver.

- [x] **T7.2 · Función `evaluar_automatizaciones()`** · Depende de T7.1, T6.4, T3.1
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
  > Nota de implementación: SQL puro. La vista `v_automatizaciones` (`security_invoker`) calcula qué alertas y tareas deberían existir ahora; `evaluar_automatizaciones(_perfil_id uuid DEFAULT NULL)` crea lo que falta (`ON CONFLICT (clave_unica) DO NOTHING`), resuelve las alertas de estas reglas que ya no salen en la vista y completa las tareas automáticas `renovacion_plan`/`seguimiento`/`revisar_resumen` cuya situación se resolvió; devuelve los cuatro contadores. Sin sesión (pg_cron) o con sesión de admin; con `_perfil_id`, solo ese cliente (para T7.4). Las claves identifican el **episodio** (`pocas_sesiones:<cliente>:<contratadas>`, `plan_terminado:<cliente>:<contratadas>:<plan_fin>`, `sin_seguimiento:<cliente>:<fecha del último seguimiento>`, `informe_pendiente:<tarea>`, `feedback_pendiente:<tarea>`, `resumen:<sesión>`), así lo que la psicóloga resuelve a mano no reaparece hasta que cambia la situación. Reglas 1 y 2 se apoyan en las tareas de T6.4 (informe sin enviar a los 2 días; feedback vencido). "Pocas sesiones" = entre 1 y `umbral_pocas_sesiones` pendientes (con 0 salta "Plan terminado"); "Sin seguimiento" cuenta desde `ultimo_seguimiento_at`, si no `plan_inicio`, si no el alta. **Decisión**: Finalizado no genera nada (sección 3.3), aunque la tabla de esta tarea decía que podía generar "Plan terminado": la alerta propone pasar a Finalizado. "Perfil muy compatible" se mantiene mientras su sugerencia siga pendiente. Probado en Postgres 15 con un caso por regla y por excepción (baja, finalizado, pausado, lead), tres ejecuciones sin duplicar, resolución automática, resolución manual que no reaparece y evaluación por cliente; en producción, con `dias_sin_seguimiento` a 0 un momento: crea alerta y tarea y, al devolverlo a 21, las resuelve solas.

- [x] **T7.3 · Ejecución programada** · Depende de T7.2, T5.4
  - Cambios: activar `pg_cron` (+ `pg_net` si hace falta llamar a Edge Functions). Job cada hora: `evaluar_automatizaciones()`; job cada 15 min: procesar `cola_matching` (T5.4). Botón "Ejecutar ahora" en Configuración.
  - Aceptación: los jobs aparecen en `cron.job` y se ejecutan; la última ejecución se muestra en Configuración.
  > Nota de implementación: `pg_cron` + `pg_net`. Job `evaluar-automatizaciones` (`0 * * * *`, SQL directo) y `procesar-cola-matching` (`*/15 * * * *`, `net.http_post` a la Edge Function). Lovable despliega las funciones sin `verify_jwt` (la clave pública es `sb_publishable_…`, no un JWT), así que el cron se autentica con la cabecera `x-cron-secret`: su valor lo genera la migración en `secretos_internos` (RLS sin políticas y sin permisos para `anon`/`authenticated`; la lee la service role) y `exigirAdminOCron` (`_shared/auth.ts`) lo comprueba; no hay que configurar secretos en Lovable. `estado_automatizaciones()` (`SECURITY DEFINER`, solo admin) lee `cron.job`/`cron.job_run_details` y, para la cola, la última respuesta de `net._http_response`. Configuración deja de ser placeholder: sección **Automatizaciones** (cada job, cada cuánto, última ejecución y resultado) y **Ejecutar ahora** (`evaluar_automatizaciones` + `procesar-cola-matching`); el resto de ajustes, en T9.2. Probado en la imagen oficial `supabase/postgres` 15.8 como `postgres` (dos veces, sin duplicar jobs; secreto ilegible por `anon`; la petición de `pg_net` llega a la función de producción) y en producción: los dos jobs programados y activos. **Pendiente de ver**: la primera ejecución en Configuración y, tras redesplegar `procesar-cola-matching`, que la cola responda 200 en vez de 401.

- [x] **T7.4 · Triggers en tiempo real** · Depende de T7.2
  - Cambios: al marcar una sesión como realizada, al registrar feedback o al cambiar plan, llamar a `evaluar_automatizaciones_cliente(perfil_id)` (versión por cliente) para que avisos y tareas se actualicen al instante, sin esperar al cron.
  - Aceptación: marcar la última sesión como realizada crea al momento la alerta "Plan terminado".
  > Nota de implementación: en vez de una función nueva por cliente, `evaluar_automatizaciones(_perfil_id)` de T7.2. Triggers (`reevaluar_automatizaciones`) en `perfiles` (plan, sesiones contratadas, fechas, estado y `ultimo_seguimiento_at`, que mueven notas, sesiones y feedback), `sesiones` (alta, estado, estado del resumen) y `matches` (estado, informe enviado, feedback; reevalúa los dos lados). El de `matches` se llama `matches_zz_reevaluar` porque los triggers AFTER van por orden alfabético y debe ir después de `matches_tareas` (T6.4). Sin bucles: la evaluación solo escribe en alertas y tareas. Los hooks de sesiones, notas, resumen, matches, feedback, plan y estado refrescan también alertas y tareas. Probado en Postgres 15 (última sesión → "Plan terminado" al instante; renovar y registrar feedback resuelven al instante) y en producción (3 sesiones contratadas → "pocas sesiones" y tarea al instante; volver a 14 las resuelve).

- [ ] **T7.5 · (Opcional) Resumen diario por email**
  - Cambios: Edge Function diaria que envía a la psicóloga un email con sesiones del día, tareas vencidas y alertas urgentes (proveedor tipo Resend; requiere secreto).

### FASE 8 — Dashboard completo

- [x] **T8.1 · Función `dashboard_resumen()`** · Depende de Fases 1-7
  - Una función SQL que devuelve en una sola llamada todos los contadores del PDF: clientes activos, sesiones del día, nuevos clientes (30 días, con plan), Premium, pendientes de matching (activos con plan sin match en curso ni sugerencias aceptadas en los últimos X días), informes Premium pendientes, feedbacks pendientes, pocas sesiones, baja/pausados, nuevos perfiles compatibles (alertas tipo IA de 7 días), alertas urgentes abiertas.
  - Aceptación: respuesta < 300 ms con 1.000 perfiles.
  > Nota de implementación: `dashboard_resumen()` (SQL, `STABLE`, security invoker: el RLS solo-admin de cada tabla deja en cero a quien no sea admin; sin permiso para `anon`) devuelve un `jsonb` con `clientes_activos`, `sesiones_hoy`, `citas_hoy`, `nuevos_clientes`, `premium`, `pendientes_matching`, `informes_pendientes`, `feedbacks_pendientes`, `pocas_sesiones`, `pausados`, `bajas`, `nuevos_compatibles`, `alertas_urgentes` y `umbral_pocas_sesiones` (para que el listado filtre con el mismo umbral). Los contadores de clientes salen de `v_clientes`, la misma vista del listado, para que en T8.2 cada número coincida con su listado filtrado. Definiciones: cliente = perfil con plan; "hoy" = día de Madrid; **sesiones del día** = no canceladas, y aparte las **citas** de matches de hoy (agendadas o realizadas); **nuevos** = plan empezado en 30 días (sin fecha de inicio, el alta), en cualquier estado; **Premium** = activos; **pendientes de matching** = activos sin ningún match abierto (no cerrado, sea A o B; nueva columna `matches_abiertos` al final de `v_clientes` e índice en `matches.perfil_a`); se quitó lo de "sugerencias aceptadas en X días" porque aceptar ya crea el match; **pocas sesiones** = activos con sesiones contratadas y ≤ `umbral_pocas_sesiones` pendientes, incluido 0 (3.3: "≤ 1 pendiente"; la alerta de T7.2 separa 0 como "plan terminado"); **informes y feedbacks** = tareas de T6.4 pendientes; **pausados y bajas** = clientes con plan; **nuevos compatibles** = alertas de T5.4 de los últimos 7 días sin resolver (se resuelven al decidir la sugerencia); **alertas urgentes** = sin resolver. Probado en la imagen oficial `supabase/postgres` 15.8 con **todas** las migraciones aplicadas en orden (dos veces la nueva): un escenario con cifras conocidas (incluida una sesión a las 00:30 de Madrid, que en UTC es el día anterior), los filtros del listado dan lo mismo, una usuaria sin rol ve ceros, admin ve lo mismo que `postgres` y `anon` no puede ejecutarla; con 1.000 perfiles, 4.000 sesiones, 333 matches, 2.000 tareas y 1.000 alertas tarda 18-48 ms como admin. En producción (migración aplicada): `anon` recibe 401 y, como admin, cada cifra coincide con la consulta del listado.

- [x] **T8.2 · Nuevo Dashboard** · Depende de T8.1
  - Cambios en `src/pages/admin/Dashboard.tsx`:
    - Fila de KPIs (tarjetas clicables que llevan al listado filtrado correspondiente).
    - **Agenda de hoy**: sesiones y citas del día con hora y enlace a la ficha.
    - **Alertas importantes** (urgentes primero).
    - **Tareas pendientes** (vencidas primero) con completar en línea.
    - **Nuevos perfiles compatibles detectados por la IA** (últimos 7 días) con acceso directo a la sugerencia.
    - Eliminar tarjetas fijas ("—", "Próximamente").
  - Aceptación: todos los puntos del apartado "Dashboard" del PDF visibles y enlazados; los números coinciden con los listados filtrados.
  > Nota de implementación: `Dashboard.tsx` reescrito sobre `dashboard_resumen()` (`useDashboardResumen`, `useAgendaHoy` y `useSinRevisar` en `src/hooks/admin/useDashboard.ts`, colgando de `["perfiles"]`, que ya invalidan sesiones, matches, tareas y alertas). 12 tarjetas (pausados y bajas por separado), cada una un enlace: al listado de Perfiles con `?plan=`, `?estado=` o el nuevo `?situacion=` (`nuevos`, `sin_match`, `pocas_sesiones`, con las mismas condiciones que la función y el umbral de `configuracion`), a Tareas con `?tipo=`, a Alertas con `?severidad=`, o a su bloque de esta página (sesiones de hoy → agenda; nuevos compatibles → su bloque). Los listados leen esos filtros al montarse (`valorDeUrl`, solo valores válidos) y se ven en los selectores; `App` los vuelve a montar si cambia la URL, así el menú lateral los quita. Bloques: **Agenda de hoy** (sesiones no canceladas y citas de matches, por hora, con enlace a la ficha), **Alertas importantes** (urgentes y avisos, 6 primeras), **Tareas pendientes** (vencidas primero, se completan en línea con `ListaTareas`) y **Nuevos perfiles compatibles** (alertas de 7 días sin decidir con "Ver sugerencia" → pestaña Sugerencias del cliente). Fuera las tarjetas fijas; de las antiguas quedan en una línea "Perfiles sin revisar" (ya no se cargan todos los perfiles para contar), pagos y conversión. Fechas en hora local (`src/lib/dashboard.ts`, test en tres zonas horarias). Probado en local contra producción: cifras reales, cada tarjeta lleva a su listado con el filtro puesto y el mismo número, y sin errores en consola.

### FASE 9 — Vistas agregadas, configuración y cierre

- [x] **T9.1 · Sustituir placeholders**
  - `Compatibilidades` → vista global de sugerencias pendientes de todos los clientes (ordenadas por score) con aceptar/rechazar.
  - `Matches Aprobados` → todos los matches con estado, filtros y embudo (propuestos → cita → continúan).
  - `Seguimiento` → tablero kanban de matches por estado (o redirigir a `/admin/tareas`).
  - `Notas Privadas` → buscador global de notas y resúmenes.
  - Aceptación: no queda ningún `Placeholder` en rutas.
  > Nota de implementación: sin migración. **Compatibilidades** (`useSugerenciasPendientes`): las 200 pendientes con más score de todos los clientes (y el total), con la tarjeta de la ficha (`TarjetaSugerencia`) y "Para <cliente> <plan>" encima; las sugerencias invalidan ahora todo `["sugerencias"]` para que la vista global se refresque. **Matches Aprobados**: `useMatches()` sin cliente trae todos y `FilaMatch` (exportada, `perfilId` opcional) muestra los dos de la pareja con el mismo control de la ficha (estado, cita, informe, feedback); embudo propuestos → con cita (fecha guardada o estado tras la cita, también cerrados) → continúan en `src/lib/matches.ts` (con test), filtro por estado (por defecto, abiertos) y búsqueda por nombre. **Seguimiento**: tablero de solo lectura con una columna por estado abierto (los cerrados, en Matches Aprobados); cada tarjeta abre la pestaña Matches de la ficha. **Notas Privadas** (`useBuscarNotas`): busca al enviar en `notas_privadas.contenido`, `sesiones.notas_brutas` y cada sección de `resumen_ia` (`resumen_ia->>clave`), hasta 50 de cada tipo; sin texto, las últimas notas y resúmenes. `ESTADO_MATCH` pasa a `src/lib/matches.ts` y las secciones del resumen a `_shared/resumen.ts` (`SECCIONES_RESUMEN`). `Placeholder.tsx` borrado al quedarse sin uso. Probado en local contra producción (solo lectura): las cuatro pantallas cuadran con la BD (0 pendientes, 1 match en "cita realizada", 4 notas, 1 resumen), la búsqueda encuentra texto de las preferencias del resumen, la pestaña Matches de la ficha sigue igual y no hay errores en consola.

- [x] **T9.2 · Pantalla de Configuración**
  - Editar valores de `configuracion` (umbrales, pesos del algoritmo, peso reglas/IA, sesiones por plan), ver estado de los jobs, gestionar administradoras (invitar por email vía Edge Function protegida).
  - Aceptación: cambiar un umbral cambia el comportamiento de las automatizaciones en el siguiente ciclo.
  > Nota de implementación: sin migración: `evaluar_automatizaciones()`, los triggers, `dashboard_resumen()` y las Edge Functions leen `configuracion` en cada ejecución, así que lo guardado vale desde su siguiente vuelta (aceptación). **Parámetros**: formulario con sesiones al mes por plan, avisos (pocas sesiones, días sin seguimiento, plazo del feedback) y matching (alta compatibilidad, sugerencias por cliente, candidatos para la IA, peso de la IA en % y pesos por dimensión en %, que deben sumar 100 %); `validarConfiguracion` y `CAMPOS_ENTEROS` (límites y textos) en `src/lib/configuracion.ts` con test; solo se guardan las claves cambiadas (`upsert`, `useGuardarConfiguracion`). **Jobs**: la sección de T7.3 sin cambios. **Administradoras**: Edge Function nueva `administradoras` (`exigirAdmin`; `listar` con email y último acceso desde `auth.users`, `invitar` con `inviteUserByEmail` y rol admin, o solo el rol si el email ya tenía cuenta, y `quitar`, que borra el rol pero no la cuenta y no deja quitarse a una misma; invitar y quitar quedan en `auditoria`). La invitación lleva `debe_elegir_contrasena` en los metadatos: al entrar por el enlace, `AdminLayout` pide elegir contraseña (`ElegirContrasena`) antes de enseñar el CRM. El enlace vuelve a `<origen>/admin`: esa URL tiene que estar entre las de redirección permitidas de Auth en Lovable Cloud. Probado en local: valores cargados, validación (pesos al 105 %, campo vacío), Descartar y `upsert` con sesión de admin. Probado después en producción (08/10/2026): la lista carga y la invitación se envió, pero el enlace del email no servía: Hotmail/Outlook abren los enlaces para analizarlos y gastaban el de un solo uso (la cuenta registró un acceso 56 s después sin que la persona entrara), y sin redirección permitida a localhost el enlace acababa en la vista previa de Lovable, que pide cuenta de Lovable. **Cambio**: ya no se envían emails. `invitar` crea la cuenta con `generateLink` (o, si ya existía, un enlace de recuperación) y `enlace` da uno nuevo a cualquier administradora (olvido de contraseña); la función devuelve el token y el CRM muestra `<origen>/admin/acceso?token_hash=…&tipo=…` con "Copiar" y "Abrir en el correo" (mailto) para enviarlo por cualquier canal. `/admin/acceso` (`AccesoAdmin`) solo gasta el token al pulsar "Entrar" (`verifyOtp`) y después pide la contraseña (`ElegirContrasena`). La lista marca "Aún no ha elegido contraseña" y el login explica cómo pedir un enlace. Probado en local: página sin código y con código caducado. Probado en producción tras redesplegar la función (las modificadas no se redespliegan solas): "Nuevo enlace" para la invitada (`enlace_acceso_admin` en auditoría), el usuario lo abrió en una ventana privada, pulsó "Entrar", eligió contraseña y entró; la lista dejó de marcarla como pendiente y la sesión de la otra administradora no cambió.

- [x] **T9.3 · RGPD y seguridad de datos sensibles**
  - Registrar en `auditoria` las lecturas de notas, resúmenes y vídeos. Exportación de todos los datos de un cliente (JSON/PDF) y borrado definitivo bajo petición (derecho de supresión), distinto de "Baja". Revisar textos de consentimiento del cuestionario para incluir: tratamiento por la psicóloga, uso de IA para matching y resúmenes, y proveedor de IA. **Validar con asesoría legal.**
  - Aceptación: exportación y borrado funcionan; auditoría registra accesos.
  > Nota de implementación: migración `20261008100000_t9_3_rgpd.sql`. **Lecturas**: `registrar_lecturas(accion, perfil_ids[])` (solo admin; `leer_notas`, `leer_sesiones`, `ver_video`), una fila de `auditoria` por cliente; la llama `registrarLectura` (`src/hooks/admin/useRgpd.ts`) desde `useNotas`, `useSesiones` (notas de sesión y resúmenes), el buscador global (cada cliente que sale en el resultado) y el `onPlay` del vídeo, una vez cada 30 min por cliente y tipo, sin bloquear la lectura si falla (lo registra el navegador: anotado con `ponytail:`). Índice `auditoria (entidad_id, created_at)`. **Exportación** (pestaña Documentos → "Datos personales (RGPD)"): JSON con perfil (con el consentimiento), tests DISC (el vinculado y los del mismo email), pagos, sesiones, notas, aprendizaje, sugerencias y matches, y la lista de ficheros; `construirExportacion` (`src/lib/rgpd.ts`, test) quita a la otra persona: su id, su feedback y, en las sugerencias donde esta persona era candidata, los motivos, riesgos y decisión, porque la IA los escribe desde el otro cliente y citan sus sesiones (visto al probar con datos reales). Quedan fuera tareas, alertas y auditoría. Se registra `exportar_datos`. Solo JSON (portabilidad); PDF si se pide. **Supresión** ("Borrar definitivamente…", confirmando con el nombre completo): el navegador borra primero foto, vídeos y antecedentes (cuenta lo borrado, porque Storage sin permiso no da error; si falla, para antes de tocar la BD; si otro perfil se llama igual, los antecedentes solo por email) y después `suprimir_cliente(perfil_id)`, en una transacción: pagos conservados por obligación contable sin vínculo, teléfono ni notas (`pagos.perfil_suprimido_at`; el CHECK `pagos_perfil_obligatorio` lo admite), borra sus tests DISC, las tareas de otros clientes ligadas a sus matches y las alertas "muy compatible" que la nombran, vacía `detalle` de su auditoría y borra el perfil (cascada a sesiones, notas, sugerencias, aprendizaje, cola, matches, tareas y alertas), y registra `suprimir_cliente` con los recuentos. Política nueva: la admin puede borrar en `antecedentes`. Probado en Postgres 15 (imagen de Supabase, las 39 migraciones y la nueva dos veces): no admin rechazada, recuentos, pago conservado, la tarea de la otra clienta con el nombre borrada, perfil inexistente, pago nuevo sin perfil rechazado y versión del consentimiento desde el formulario público. **Consentimiento**: `perfiles.consentimiento_version` (la envía `/perfil`, `VERSION_CONSENTIMIENTO`) y `consentimiento_at` (default `now()`; los anteriores quedan a NULL); casilla con consentimiento explícito para los datos de las sesiones y la IA (Gemini de Google vía Lovable) y política de privacidad reescrita (datos, finalidad, base legal, IA, destinatarios, conservación, derechos y AEPD). **Pendiente de la asesoría legal**: validar ambos textos y completar identidad del responsable, transferencias internacionales, contratos de encargo con Lovable y Google, plazos concretos y si separar la casilla. No cubierto: notas libres o preferencias aprendidas de otros clientes que la mencionen sin nombre. Probado después en producción, con la migración aplicada, sobre dos perfiles de prueba creados como anónimos (con foto, antecedentes y vídeo): consentimiento guardado con fecha, exportación con los tres ficheros, y borrado desde la ficha que deja Storage vacío, sin sugerencias, cola ni alertas, con `suprimir_cliente` en auditoría y la vuelta al listado con el aviso (con `mutate` la ficha se desmontaba antes de navegar: se usa `mutateAsync`). Lecturas registradas al abrir notas y sesiones. Ojo para futuras migraciones: `perfiles` tiene columnas nuevas, así que un `CREATE OR REPLACE VIEW v_clientes` con `p.*` fallará; hay que hacer `DROP VIEW` y crearla otra vez.

- [ ] **T9.4 · (Opcional) Integración Calendly**
  - Webhook `invitee.created` / `invitee.canceled` → Edge Function que crea/cancela `sesiones` enlazando por email al perfil (requiere plan de Calendly con webhooks).

- [x] **T9.5 · Limpieza final**
  - Eliminar `estado_perfil` y `notas_admin` (ya migrados), código muerto (`CompatibilityDashboard.tsx`, `Placeholder.tsx` si no se usa), revisar accesibilidad y responsive del admin, datos de prueba (`supabase/seed.sql`) con 30 perfiles variados para QA.
  - Aceptación: build, lint y tests en verde; checklist de QA de la sección 5 completo.
  > Nota de implementación: migración `20261008120000_t9_5_limpieza.sql`: borra la vista `paid_users` y las columnas `estado_perfil` y `notas_admin` (nada las leía), y vuelve a crear `v_clientes` igual que en T8.1 (con `p.*` hay que quitarla para borrar columnas; ahora trae también el consentimiento de T9.3). `CompatibilityDashboard.tsx` y `Placeholder.tsx` ya se habían borrado en T6.3 y T9.1; además, fuera `NavLink.tsx`, `DiscResultCard.tsx` y `src/lib/matching.ts` (el matching DISC antiguo), que nadie importaba desde el proyecto original. Los componentes de `src/components/ui` sin usar se dejan (no se tocan salvo necesidad). **Responsive**: en móvil la barra lateral pasa a una cabecera con botón de menú (`Sheet`) que se cierra al navegar; márgenes `p-4 md:p-8`; la cabecera de la ficha deja de ser fija en móvil y ya no se sale de la pantalla; la tabla de Pagos se desplaza en horizontal en vez de cortarse. Comprobado cargando las 17 pantallas del admin en un iframe de 375 px: ninguna se sale por la derecha. **Accesibilidad** (axe-core, WCAG 2 A/AA, en las mismas pantallas): nombre accesible en todos los desplegables, campos y textareas (`aria-label` con el texto de su etiqueta visible, o el filtro que son), gris secundario del tema de 45 % a 40 % de luminosidad (no llegaba a 4,5:1 sobre las tarjetas; afecta también a la web pública), tono `gold-texto` para enlaces (el dorado de marca es para iconos y botones), insignias de calidad y botón de borrar vídeo en tonos `-700` y el enlace dentro de una frase, subrayado. Al terminar, 0 incidencias en las pantallas revisadas. **`supabase/seed.sql`**: 30 perfiles de prueba (`@afin.test`): 12 clientes (Esencial y Premium, en los cuatro estados, uno con plan a punto de terminar y otro con pocas sesiones) y 18 leads, con pagos, sesiones (resumen revisado, sin resumen, hoy y mañana), notas, 15 sugerencias pendientes y un match en cada estado que avanza como en la app para que los triggers creen y cierren sus tareas; termina con `evaluar_automatizaciones()`. Se para si hay perfiles que no son de prueba, así que no se puede cargar en la base de datos real. Probado en Postgres 15 (imagen de Supabase) con las 40 migraciones: el Dashboard sale con datos en todos los indicadores y la protección funciona.


### FASE 10 — Web pública: arreglos y textos legales

> Añadida el 15/10/2026, tras la revisión del plan terminado (Fases 0-9). Las tareas que esperan algo de fuera lo dicen en "Depende de".

- [x] **T10.1 · Consentimiento en el test DISC (`/quiz`)**
  - `/quiz` guarda nombre, email y teléfono en `disc_results` sin casilla de consentimiento ni enlace a la política de privacidad. Añadir la misma casilla que `/perfil` (obligatoria para enviar) y guardar `disc_results.consentimiento_version` y `consentimiento_at` como en T9.3 (migración).
  - Aceptación: no se puede enviar el test sin la casilla; cada resultado nuevo guarda versión y fecha; la exportación (T9.3) los incluye.
  > Nota de implementación: migración `20261020140000_t10_1_consentimiento_disc.sql` (`consentimiento_version` y `consentimiento_at` con default `now()`; los anteriores, NULL). Casilla obligatoria antes de "Ver mi resultado", con enlace a la política de privacidad y `VERSION_CONSENTIMIENTO`. No se exige también en la RLS: la web publicada no se actualiza hasta volver a publicar en Lovable y el test de la versión antigua dejaría de guardar. La exportación ya incluye las columnas (lee `disc_results` entero). Hay que aplicar la migración antes de fusionar: el insert no comprueba errores y, sin la columna, el resultado no se guardaría.

- [x] **T10.2 · Web pública más rápida**
  - Hoy cualquier visitante descarga todo el CRM (un solo fichero JS de ~1,45 MB, 433 KB comprimido). Cargar las rutas de `/admin` (y lo pesado que solo usan ellas, como jsPDF) con `React.lazy` + `Suspense`.
  - Aceptación: el build separa el admin en otros ficheros; la portada descarga al menos un 50 % menos de JS; todas las rutas públicas y del admin siguen funcionando.
  > Nota de implementación: en `App.tsx` todas las rutas salvo la portada y la 404 con `React.lazy` y un `Suspense` general; dentro de `AdminLayout` otro `Suspense` alrededor del `Outlet`, para que el menú no desaparezca al cambiar de sección. jsPDF sale solo con el cuestionario, el test y el informe. El fichero de entrada pasa de 1.457 KB (435 KB comprimido) a 453 KB (145 KB): un 69 % menos. Probado en local: portada, `/perfil`, `/quiz`, `/privacidad`, Dashboard, Pagos, ficha y 404, sin errores en consola.

- [ ] **T10.3 · Calendly: citas actualizadas y enlaces en un solo sitio** · Depende de: Vero (reconectar el calendario y decidir una o dos citas, y si pasa al plan Standard)
  - La web enlaza a `equipo-afin/30min` (ya no existe) y a `equipo-afin/plan-esencial` (sin calendario conectado). Llevar todas las direcciones a una constante (`src/lib/enlaces.ts`): Precios, diálogo de planes, final del test DISC, final del cuestionario y Pagos.
  - Aceptación: cada botón y el calendario incrustado abren una cita que existe; cambiar una dirección es cambiar una línea.

- [ ] **T10.4 · Aviso legal y condiciones de contratación** · Depende de: los textos de la asesoría legal
  - Stripe y la ley (LSSI) piden datos del titular (nombre o razón social, NIF, dirección) y condiciones con la política de cancelación y devolución. Actualizar `/aviso-legal`, crear `/condiciones` y enlazarlas desde el pie, el cuestionario y el pago (T11.4). Incluir los cambios que pida la asesoría sobre la casilla y la política de privacidad de T9.3 (nueva `VERSION_CONSENTIMIENTO`).
  - Aceptación: las tres páginas legales con los textos validados; la versión del consentimiento cambia si cambia el texto.

### FASE 11 — Pagos con Stripe: enlace de pago desde la ficha

Decisión (15/10/2026): la psicóloga genera desde la ficha un enlace de pago del plan para ese cliente; al pagarlo, el pago se registra solo y el plan se activa. Decidido el 20/10/2026: **un solo pago por el plan completo** (precio al mes × meses), **IVA incluido** en el precio, **facturas fuera de Stripe** (asesoría o su herramienta; Stripe solo cobra) y **meses elegidos por la psicóloga** al crear el enlace (3 por defecto). Precios de la web: Esencial 160 €/mes, Premium 250 €/mes. Los precios viven en `configuracion` y se cobran con `price_data`, así que Vero los cambia desde Configuración sin tocar Stripe. Lo que no es código lo hacen Vero y Vicente: Claude no crea la cuenta ni introduce datos personales, bancarios ni claves; en el panel de Stripe solo configura, en modo de pruebas y con permiso expreso, lo que la tarea diga.

- [x] **T11.0 · Cuenta de Stripe en modo de pruebas (no código)**
  - Vero crea la cuenta a nombre de Afín, activa la verificación en dos pasos e invita a Vicente con rol de desarrollador. Decide: pago único o cuota, precio e IVA de cada plan y quién emite las facturas (Stripe o la asesoría). Vicente pega la clave secreta de pruebas en Lovable Cloud → Secrets (`STRIPE_SECRET_KEY`). Revisar antes qué hace la sección "Pagos" de Lovable por si ahorra trabajo.
  - Aceptación: cuenta en modo de pruebas, clave en Secrets y las cuatro decisiones apuntadas en este plan.
  > Nota de implementación: cuenta "Afin Matchmaking" en el entorno de prueba de Stripe; `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` en Lovable Cloud → Secrets (desde oct 2026 sin entrada en el menú: `…?view=more&subview=cloud&section=secrets`). La sección "Pagos" de Lovable pide permiso de gestión de pagos que la cuenta de Vicente no tiene; no se usa. Decisiones, arriba (20/10/2026).

- [x] **T11.1 · Modelo de datos de los pagos con Stripe** · Depende de T11.0 (las decisiones)
  - Migración: en `pagos`, `origen` (`manual` | `stripe`), `estado` (`pendiente` | `pagado` | `caducado` | `reembolsado`; los manuales, `pagado`), `stripe_checkout_id` (único, para no registrar dos veces el mismo pago), `stripe_payment_intent`, `enlace_pago`, `caduca_at`. El trigger de T1.2 solo copia el plan al perfil cuando el pago está `pagado`. En `configuracion`, `precio_plan` (`{esencial: 160, premium: 250}`, euros al mes con IVA incluido) y `meses_plan` (duración por defecto, 3), editables en Configuración (`CAMPOS_ENTEROS` / `validarConfiguracion`).
  - Aceptación: los pagos manuales siguen igual; un pago pendiente no activa el plan; precios y duración editables y validados.
  > Nota de implementación: migración `20261020100000_t11_1_pagos_stripe.sql` con los enums `pago_origen` y `pago_estado`, las columnas nuevas de `pagos` (más `meses` y `pagado_at`) y el trigger de T1.2 limitado a los pagos `pagado` (ahora también salta al cambiar el estado). `precio_plan` (160 y 250 €, provisionales) y `meses_plan` (3) en `configuracion`; en Configuración, columna Planes: precio al mes con céntimos y meses del enlace (`CAMPOS_ENTEROS`, grupo `planes`; validación con test). Probado en Postgres 15 junto con la migración de T11.3: un pago pendiente no da plan y uno manual lo da como antes.

- [x] **T11.2 · Edge Function `stripe-checkout`** · Depende de T11.1
  - Solo admin (`exigirAdmin`). Recibe `perfil_id`, `plan` y `meses`, crea una Checkout Session (modo `payment`, `price_data` con precio al mes × meses y el concepto "Plan Premium · 3 meses", `client_reference_id` = perfil, `customer_email`, `metadata.plan`, vuelta a `/pago/ok` y `/pago/cancelado`, caducidad 24 h), guarda el pago `pendiente` con su id y su enlace y lo registra en `auditoria`. Un enlace pendiente sin caducar se reutiliza en vez de crear otro.
  - Aceptación: con la clave de pruebas devuelve un enlace de Stripe que muestra el plan y el importe correctos; sin admin, 403.
  > Nota de implementación: sin SDK de Stripe: `fetch` a la API REST con el cuerpo de `parametrosCheckout` (`_shared/stripe.ts`, sin dependencias de Deno, con test): pago único en euros por precio al mes × meses (céntimos redondeados), concepto "Plan Premium · 3 meses", `client_reference_id` y `metadata` con el perfil (también en el PaymentIntent, para los reembolsos), idioma español y vuelta a `/pago/ok` o `/pago/cancelado` del mismo origen que la llamada (`Origin`, solo https o localhost). Caduca a las 23 h 50 min. Exige email en el perfil y precio en Configuración; reutiliza un enlace pendiente del mismo plan, meses e importe si le queda más de media hora. Guarda el pago pendiente (con el concepto en `notas`) y registra `crear_enlace_pago`. Sin `STRIPE_SECRET_KEY` responde con un mensaje claro. `deno check` en verde; la prueba con Stripe, cuando esté la clave y desplegada.

- [x] **T11.3 · Edge Function `stripe-webhook`** · Depende de T11.2
  - Pública, pero solo acepta eventos con la firma de Stripe (`STRIPE_WEBHOOK_SECRET`). `checkout.session.completed` → pago `pagado` (idempotente por `stripe_checkout_id`) y plan activado: `plan`, `plan_inicio` (hoy si no tenía), `plan_fin` (+ los meses pagados) y `sesiones_contratadas` sugeridas (`sesionesSugeridas`), con nota automática y auditoría. `checkout.session.expired` → `caducado`. `charge.refunded` → `reembolsado` + alerta para revisar el plan a mano. En el panel de Stripe (modo de pruebas), dar de alta el endpoint con esos tres eventos y pegar su secreto en Secrets.
  - Aceptación: un pago de prueba activa el plan una sola vez aunque Stripe repita el aviso; una firma falsa da 400 y no cambia nada.
  > Nota de implementación: la firma se comprueba sin SDK (`verificarFirmaStripe` en `_shared/stripe.ts`: HMAC-SHA256 de `t.cuerpo`, comparación en tiempo constante, avisos de más de 5 min rechazados; con test). Lo que toca la base de datos va en la migración `20261020120000_t11_3_confirmar_pago_stripe.sql`, solo para el service role: `confirmar_pago_stripe` pasa el pago a pagado (solo si estaba pendiente: idempotente), activa el plan (empieza hoy si no había uno en curso, si no se alarga desde su fin; las sesiones contratadas se suman, porque las realizadas se cuentan desde siempre), deja una nota automática (no cuenta como seguimiento) y registra `pago_stripe`; `reembolsar_pago_stripe` marca el reembolso y abre un aviso para revisar el plan a mano. La función atiende `checkout.session.completed` y `async_payment_succeeded` (solo con `payment_status` paid), `expired` y `async_payment_failed` (caducado) y `charge.refunded` (solo reembolso completo); un error responde 500 para que Stripe reintente. Probado en Postgres 15: activación, aviso repetido, renovación, reembolso, pago manual intacto y el navegador sin permiso. Falta dar de alta el endpoint en Stripe y su secreto, tras desplegar.

- [x] **T11.4 · Enlace de pago en la ficha y estado de los pagos** · Depende de T11.2
  - Botón "Enlace de pago" en la cabecera de la ficha (junto a Plan): elige plan y meses, muestra el importe y da el enlace con "Copiar" y "Abrir en el correo" (como en Administradoras). La ficha y Pagos muestran el estado de cada pago (pendiente, pagado, caducado, reembolsado) y enlazan al pago en Stripe. Páginas públicas `/pago/ok` y `/pago/cancelado`, con enlace a las condiciones (T10.4).
  - Aceptación: de la ficha al pago de prueba y vuelta a la ficha con el plan activo y el pago en verde, sin apuntar nada a mano.
  > Nota de implementación: botón "Enlace de pago" junto a Plan en la cabecera (`EnlacePago`): plan (por defecto el del cliente), meses (por defecto `meses_plan`) y total con IVA; avisa si el perfil no tiene email. El enlace se comparte con `CompartirEnlace` (Copiar y Abrir en el correo con el mensaje redactado), el mismo que usan ya los enlaces de acceso de Configuración. Bloque "Pagos" en la pestaña Resumen (`PagosCliente`) y columna Estado en Pagos, con `ESTADO_PAGO`, `estadoVisible` (un pendiente caducado se ve caducado; sin estado, pagado) y `urlStripe` (`src/lib/pagos.ts`, con test): copiar el enlace de un pendiente y "Ver en Stripe" de lo cobrado. Páginas públicas `/pago/ok` y `/pago/cancelado` (`PagoResultado`), que solo informan: el pago lo registra el aviso de Stripe. Probado en local: diálogo con precios y total, bloque de pagos y las dos páginas. La prueba de punta a punta, tras desplegar las funciones y configurar Stripe (T11.5).

- [ ] **T11.5 · Paso a producción** · Depende de T11.3, T11.4, T10.4 y de la cuenta de Stripe verificada
  - Pruebas completas en modo de pruebas (pago, pago rechazado, caducado y reembolso). Después Vero activa los pagos reales y Vicente cambia las claves y el endpoint del webhook a modo real. Añadir Stripe a la política de privacidad.
  - Aceptación: un primer pago real pequeño, que se registra y se reembolsa correctamente.
  > Avance (20/10/2026): endpoint "CRM Afín - pagos de planes" dado de alta en el entorno de prueba (`we_1UScTnJb15IRisQSacN3296v`, carga completa, los 5 eventos). Pago de prueba de punta a punta desde la ficha de "Prueba Claude T4.2" (Esencial, 1 mes, 160 €, tarjeta 4242): vuelta a `/pago/ok`, aviso entregado con 200 y `activado: true`, pago `pagado`, plan Esencial del 20/10 al 20/11/2026 con 1 sesión, nota automática y auditoría; el reenvío manual del mismo aviso respondió `activado: false` sin tocar nada. Después, el mismo día: pago rechazado con la tarjeta 4000 0000 0000 0002 (Stripe no cobra, el cliente puede reintentar y el pago sigue pendiente); enlace caducado a mano desde el Shell de Stripe (`stripe checkout sessions expire`) → "Enlace caducado"; y reembolso completo desde el panel → "Reembolsado" y aviso abierto para revisar el plan, que se conserva. **Solo falta el paso a modo real**, que espera a la cuenta verificada de Vero y a T10.4.

### FASE 12 — Emails a los clientes

- [ ] **T12.0 · Dominio propio y envío de emails (no código)**
  - Dominio de Afín conectado a la app (Lovable → Ajustes → Dominios), remitente propio (p. ej. `hola@<dominio>`) con SPF y DKIM, y proveedor de envío (Lovable Emails o Resend; clave en Secrets). Añadir `https://<dominio>/admin` a las URLs de redirección de Auth.
  - Aceptación: un email de prueba llega a Gmail y a Hotmail sin ir a spam.

- [ ] **T12.1 · Envío de emails desde el servidor** · Depende de T12.0
  - `_shared/email.ts` + plantillas sencillas con la marca, y tabla `emails_enviados` (perfil, tipo, fecha, estado; solo admin). Nunca datos de salud en un email: ni notas, ni resúmenes, ni preferencias de sesión.
  - Aceptación: cada envío queda registrado y se ve en la ficha del cliente.

- [ ] **T12.2 · Confirmaciones automáticas** · Depende de T12.1 (y de T11.3 para el pago)
  - Al enviar el cuestionario ("hemos recibido tu perfil") y al completarse un pago ("tu plan está activo"), desde la cola o el webhook, no desde el navegador.
  - Aceptación: los dos emails llegan una sola vez por evento.

- [ ] **T12.3 · Enviar el informe de compatibilidad por email** · Depende de T12.1
  - En el panel del informe (T6.3), "Enviar por email" a uno o a los dos clientes, con el PDF adjunto. Al enviarlo, se marca como enviado y se completa la tarea (como hoy con "Marcar como enviado").
  - Aceptación: el cliente recibe el informe sin descargarlo ni reenviarlo a mano.

- [ ] **T12.4 · Recordatorios de cita y de feedback** · Depende de T12.1
  - Con `pg_cron`: recordatorio 24 h antes de cada cita de match y petición de feedback al día siguiente de la cita. Se pueden desactivar en Configuración.
  - Aceptación: cada recordatorio sale una vez, a su hora, y no sale si está desactivado o la cita se canceló.

### FASE 13 — Roles y subida de documentos

> Decisión (20/10/2026): T13.1 y T13.2 se descartan. Vero y la psicóloga son administradoras y ven todo; el resto son clientes, que no entran al CRM. Si algún día entra alguien que no deba ver datos clínicos, se retoman.

- ~~**T13.1 · Rol de gestión sin datos clínicos**~~ · Descartada
  - Hoy todas las administradoras ven todo. Nuevo rol `gestion` que trabaja con perfiles, planes, pagos, matches, tareas y alertas, pero no ve notas privadas, notas ni resúmenes de sesión, vídeos ni el aprendizaje de la IA. RLS por rol en esas tablas (y una vista de `sesiones` sin las columnas clínicas para el rol de gestión); selector de rol al invitar en Administradoras. Confirmar con Vero quién lleva cada rol.
  - Aceptación: una cuenta de gestión no puede leer datos clínicos ni desde la app ni con la API.

- ~~**T13.2 · La app según el rol**~~ · Descartada
  - Ocultar a gestión las pestañas Notas y Sesiones (o solo su parte clínica), el vídeo, el buscador de Notas Privadas y el panel de resumen.
  - Aceptación: no queda ningún botón que lleve a un error de permisos.

- [x] **T13.3 · Enlace personal para subir documentos**
  - Hoy `/perfil/documentos` reconoce a la persona por el email o el nombre que escribe a mano, y cualquiera puede subir. Generar desde la ficha un enlace personal con caducidad (tabla `enlaces_subida`); la página sube con una URL firmada que da una Edge Function a la carpeta `antecedentes/<perfil_id>/`. Se quita la subida anónima abierta; lo ya subido se sigue viendo como ahora.
  - Aceptación: un documento subido con el enlace aparece en su ficha; sin enlace válido no se puede subir nada.
  > Nota de implementación: tabla `enlaces_subida` (migración `20261020160000_t13_3_enlaces_subida.sql`, solo admin): token aleatorio de 64 caracteres, caduca a los 7 días y se borra con el perfil. En la pestaña Documentos, "Enlace para subir documentos" lo crea (`useCrearEnlaceSubida`) y lo comparte con `CompartirEnlace`, con el correo redactado; avisa si se crea en local. La Edge Function pública `subir-documento` valida el token: `info` devuelve solo el nombre de pila y `subir` da una URL firmada a `antecedentes/<perfil_id>/<fecha>.pdf` y registra `subida_documento` en `auditoria`; el bucket ya limita a PDF de 10 MB. `/perfil/documentos` ya no pide email ni nombre: sin enlace, o con uno caducado, explica cómo pedirlo. `esCarpetaDelPerfil` reconoce también la carpeta `<perfil_id>`, así que la ficha, la exportación y la supresión de T9.3 ven lo subido de las dos formas (con test). La segunda migración, `20261020170000_t13_3_quitar_subida_anonima.sql`, quita la subida anónima: se aplica **después** de publicar, para no romper la página antigua mientras siga publicada. Probado en Postgres 15: solo admin crea y ve enlaces, el token y la caducidad, el borrado en cascada y la política retirada; en local, la página sin enlace y la pestaña Documentos.

### FASE 14 — Calidad técnica

- [ ] **T14.1 · `deno check` de las Edge Functions en el CI**
  - Añadir a `.github/workflows/ci.yml` el mismo control de tipos que hace Lovable al desplegar.
  - Aceptación: una PR con un error de tipos en una función falla en el CI.

- [ ] **T14.2 · Pruebas de los flujos clave**
  - Playwright contra un Supabase local en Docker (migraciones + `seed.sql`), nunca contra la base de datos real: cuestionario → ficha → sugerencia aceptada → match → cita → feedback, y el pago de T11 con Stripe en modo de pruebas.
  - Aceptación: los flujos corren en local y en el CI.

- [ ] **T14.3 · Registro de lecturas en el servidor**
  - Leer notas, sesiones y vídeos a través de funciones `SECURITY DEFINER` que registran la lectura y quitar el SELECT directo de esas tablas, para que no haya lectura sin registro (hoy lo registra el navegador, T9.3).
  - Aceptación: no se puede leer una nota sin que quede en `auditoria`.

- [ ] **T14.4 · Por encima de 1.000 perfiles**
  - Paginar donde hoy hay tope de 1.000 filas (anotado con `ponytail:`): candidatos de `sugerencias-calcular` y `procesar-cola-matching`, listados globales, `listUsers` de administradoras y las carpetas de antecedentes (las nuevas van por `perfil_id` desde T13.3; el tope solo afecta a las antiguas `user_*`).
  - Aceptación: con 2.000 perfiles de prueba, todo funciona y nada se corta.

### Área del cliente (Fases 15-19)

> Añadida el 20/10/2026. Hasta ahora todo es para la psicóloga: el cliente rellena el cuestionario y no vuelve a entrar. Estas fases le dan un **área privada** (`/mi-area`, pensada para móvil) con su calendario de citas, los matches que le presenta la psicóloga, su perfil y rondas de 4 propuestas para elegir con quién se ve más.

**Regla de seguridad del área (vale para todas las tareas):** el cliente **nunca lee tablas directamente**. Todo pasa por funciones `mi_*` / `mis_*` (`SECURITY DEFINER`, filtran por `auth.uid()`) que devuelven solo las columnas permitidas. No se añade ninguna política de lectura para clientes en `sesiones`, `notas_privadas`, `perfil_aprendizaje`, `match_sugerencias`, `alertas` ni `tareas`. De otra persona se ve como mucho: nombre de pila, edad, zona, foto, aficiones y los motivos que escribe la psicóloga; nunca apellidos, contacto, religión, política, DISC, notas ni feedback.

Decisiones (valores por defecto; confirmar con Vero):

| Tema | Por defecto |
|---|---|
| Quién tiene área | Solo quien ha pagado: un pago `pagado` y el plan vigente (estado activo o pausado). Si pasa `plan_fin` sin renovar, o pasa a finalizado o baja, **pierde el acceso**: al entrar solo ve "Tu plan ha terminado" y "Quiero renovar", sin ningún dato. Al pagar la renovación vuelve a entrar con la misma contraseña. Los leads, nunca. |
| Cómo entra | Usuario = su email (el del cuestionario y el del pago). La contraseña la elige el cliente con un enlace de un solo uso (7 días) que la psicóloga envía desde la ficha; nunca se le da una contraseña. Mejoras: crearla justo al pagar (T15.3) y, con F12, enlace y "He olvidado mi contraseña" por email. |
| Resúmenes y notas de sesión | Nunca visibles. Solo un "mensaje para ti" opcional que la psicóloga escribe a propósito (T17.3). |
| Cuándo ve un match | Cuando la psicóloga pulsa "Presentar en su área", no al crearse (`propuesto` es interno). |
| Informe de compatibilidad | Visible en el match (Premium) cuando se ha marcado como enviado. |
| Reservar sesión | Calendly (T10.3). Sin T9.4, la sesión aparece cuando la psicóloga la apunta; con T9.4, sola. |
| Rondas de 4 propuestas | Las elige la psicóloga entre sus Sugerencias (preseleccionadas las 4 mejores), una ronda abierta por cliente, caduca a los 7 días. Solo personas que han aceptado aparecer (T19.1). |
| Elegir en una ronda | No crea un match (la otra persona no sabe nada): avisa a la psicóloga y alimenta el aprendizaje. |

### FASE 15 — Acceso del cliente

- [x] **T15.1 · Cuenta del cliente: acceso solo con el plan pagado**
  - Migración: `perfiles.user_id uuid UNIQUE` (FK a `auth.users`, `ON DELETE SET NULL`), `mi_perfil_id()` y `tiene_area()` (`SECURITY DEFINER`: plan con un pago `pagado`, `plan_fin` sin pasar y estado activo o pausado), y tabla `accesos_cliente` (`perfil_id`, `token_hash`, `caduca_at` a 7 días, `usado_at`; RLS solo admin).
  - Edge Function `acceso-cliente` con dos acciones. `enlace` (solo admin): exige el plan pagado, crea la cuenta de Auth con el email del perfil si no existe (sin rol; si el email es de una administradora, error), la guarda en `perfiles.user_id` y devuelve `/mi-area/acceso?t=<token>`, con auditoría. `activar` (pública): con el token y la contraseña elegida, `updateUserById` y token usado. Token propio de 7 días porque el enlace de Supabase caduca en 1 hora (el cliente lo abrirá cuando pueda), y se gasta solo al pulsar el botón, como `/admin/acceso`, para que los antivirus del correo no lo invaliden.
  - Ficha: botón "Dar acceso al área" en la cabecera (solo con el plan pagado) con `CompartirEnlace` (Copiar, correo y WhatsApp con `wa.me`). Hasta F12 es también el "He olvidado mi contraseña": la psicóloga genera otro enlace. `suprimir_cliente` (T9.3) borra la cuenta. Ojo: `buscarPorEmail` de `administradoras` asume que en Auth solo hay administradoras; al cliente se le busca por `perfiles.user_id`.
  - Aceptación: sin pago no hay botón; con el enlace el cliente elige contraseña y entra con email y contraseña; un enlace usado o caducado no sirve; la cuenta no entra en `/admin` ni lee ninguna tabla con la API.
  > Nota de implementación: migración `20261020180000_t15_1_acceso_cliente.sql`. `perfil_tiene_area(perfil_id)` sin `SECURITY DEFINER` (con RLS, la administradora lo sabe de cualquiera y nadie más de nadie), `tiene_area()` y `mi_perfil_id()` para el cliente, y `usuario_por_email` solo para el servidor. El enlace se crea como el de T13.3, con un insert de la administradora en `accesos_cliente` (token de 64 caracteres, 7 días), sin acción `enlace` en la Edge Function: un trigger rechaza el insert sin plan pagado y borra los enlaces anteriores sin usar. La cuenta se crea al activar, no al dar el enlace. `acceso-cliente` es pública con dos acciones: `info` (nombre de pila y usuario) y `activar` (gasta el token antes de tocar la cuenta y lo devuelve si algo falla). Decide qué hacer con la cuenta `pasoCuenta` (`_shared/acceso.ts`, con test, junto a `errorContrasena`: 8 caracteres como mínimo y 72 bytes como máximo): crearla; ponerle contraseña si ya la tenía; o enlazar una cuenta suelta con su email (Auth tiene el registro público desactivado, así que solo pudo crearla Afín). Nunca toca la de una administradora ni la de otro perfil. `v_clientes` se vuelve a crear (como en T9.5) para traer `user_id` y `con_area`; el botón "Acceso al área" de la cabecera solo sale con `con_area` y avisa de si ya tiene cuenta ("he olvidado mi contraseña"). `CompartirEnlace` gana "WhatsApp" (`wa.me`) para todos sus enlaces. La página `/mi-area/acceso?t=…` (adelantada de T15.2) tiene la estética de la portada: crea la contraseña, entra y lleva a `/mi-area`, que llega en T15.2. `suprimir_cliente` borra también su cuenta. La política de inserción pública de `perfiles` (T1.1) añade `user_id IS NULL`. Probado en Postgres 15 (imagen de Supabase, las 46 migraciones en orden y la nueva dos veces): con datos en todas las tablas, una cuenta de cliente no ve ninguna fila de ninguna tabla, vista ni Storage; las únicas funciones con privilegios que puede llamar son `mi_perfil_id`, `tiene_area` y `has_role`; vencer el plan, la baja o el reembolso quitan el área y la pausa no; suprimir borra la cuenta. En local, la página con la función simulada en el navegador (validaciones, error del servidor y móvil). La Edge Function y el botón de la ficha se prueban tras aplicar la migración y fusionar.

- [x] **T15.2 · Entrada y estructura de `/mi-area`** · Depende de T15.1
  - `/mi-area/login` (email, contraseña y "he olvidado mi contraseña"), `/mi-area/acceso` (hecha en T15.1) y `ClienteLayout` con barra inferior en móvil: Inicio · Calendario · Matches · Propuestas · Perfil. Estética de la portada, no del admin: Playfair Display en títulos (con palabras en cursiva), Inter en textos, bloques azul marino con titulares crema, etiquetas doradas en mayúsculas espaciadas, tarjetas `rounded-2xl`, iconos en baldosa y botones dorados en píldora. Rutas con `React.lazy` (no engordan la portada, T10.2). Hooks en `src/hooks/cliente/`. Inicio: próxima cita, sesiones que quedan, propuesta pendiente y último match. "¿Has olvidado tu contraseña?" dice "pide un enlace nuevo a tu psicóloga" hasta F12. Si `tiene_area()` es falso (plan vencido sin renovar, finalizado o baja) el área se cierra: todas las `mi_*` devuelven vacío y solo se ve "Tu plan ha terminado" con "Quiero renovar" (`pedir_renovacion()`: tarea y alerta para la psicóloga, que envía el enlace de pago de T11.4). Al pagar, T11.3 alarga `plan_fin` y vuelve a entrar con la misma contraseña. En Inicio, 15 días antes de `plan_fin`: "Tu plan termina el dd/mm".
  - Aceptación: a 375 px sin scroll horizontal; sin sesión lleva al login; una cuenta sin perfil vinculado ve un aviso, no un error; con el plan vencido no se ve ningún dato, ni en la app ni con la API; al renovar entra sin enlace nuevo.
  > Nota de implementación: migración `20261020190000_t15_2_mi_area.sql` con `mi_area()`: un JSON con el resumen del área, `NULL` si la cuenta no tiene perfil y, sin área, solo `con_area`, `plan_fin` y `renovacion_pedida`. También `pedir_renovacion()`: tarea `renovacion_plan` y aviso `otra` con la clave `renovacion_pedida:<perfil>:<plan_fin>`, una por periodo, que se reabren si la psicóloga ya las había cerrado. La tarea es `manual` porque `evaluar_automatizaciones` completa las automáticas de renovación que no genera ella. `ClienteLayout` (`src/components/cliente/`) lee la sesión (`useSesion`) y `mi_area` (`useMiArea`, con la cuenta en la clave de la caché; hooks en `src/hooks/cliente/`). Sin sesión lleva a `/mi-area/login`; si la cuenta no tiene perfil muestra un aviso con "Cerrar sesión"; sin área, solo la pantalla "Tu plan ha terminado". Con área: cabecera con la marca y "Salir", barra inferior en el móvil y navegación arriba desde `md`; Inicio recibe el resumen por `Outlet context`. Inicio enseña el saludo en bloque azul marino, el aviso de fin de plan (`avisarFinPlan`, 15 días, con "Quiero renovar"), las sesiones que quedan, el plan y la próxima sesión (`cuandoCita`: hoy, mañana o el día de la semana). Lógica en `src/lib/areaCliente.ts`, con test. Las tarjetas de último match y propuesta pendiente llegarán con T18.2 y T19.3, porque esos datos aún no existen. Calendario, Matches, Propuestas y Perfil enseñan "Muy pronto" hasta sus fases. `Pantalla` y las clases (`estilos.ts`) se comparten con `/mi-area/acceso`. Probado en Postgres 15 (47 migraciones y la nueva dos veces): el resumen con área abierta y cerrada, las canceladas fuera de la próxima sesión, pedir dos veces, reabrir, las automatizaciones sin tocarla, y anónimos y administradoras sin acceso. En local, con la sesión y las respuestas simuladas en el navegador: login con error y "he olvidado", Inicio a 375 px sin scroll horizontal, "Quiero renovar", la barra inferior, el área cerrada, "Cerrar sesión" y el escritorio.

- [x] **T15.3 · (Mejora) Crear la contraseña justo al pagar** · Depende de T15.1, T11.3
  - `success_url` de `stripe-checkout` con `?session_id={CHECKOUT_SESSION_ID}`. En `/pago/ok`, si el perfil aún no tiene cuenta: "Crea tu contraseña para entrar en tu área". `acceso-cliente` con la acción `activar_tras_pago` pregunta a Stripe si esa sesión está pagada y de qué perfil (no espera al webhook) y crea la cuenta con esa contraseña. Solo vale una vez; si ya tiene cuenta, botón "Entrar". Los pagos manuales siguen con el enlace de T15.1.
  - Aceptación: pagar → crear contraseña → dentro del área, sin que intervenga la psicóloga.
  > Nota de implementación: sin migración. `success_url` lleva `?session_id={CHECKOUT_SESSION_ID}`. `acceso-cliente` gana `info_pago` y `activar_pago`: lee la sesión de Stripe con `STRIPE_SECRET_KEY` y solo la acepta si `pagoCobradoReciente` (completa, cobrada y de hace 7 días como mucho; `_shared/stripe.ts`, con test) y si es de un pago nuestro de ese perfil (`pagos.stripe_checkout_id` y `client_reference_id`). Si el aviso de Stripe aún no ha llegado, llama a `confirmar_pago_stripe` como él (idempotente), así el plan ya está activo al entrar. Solo crea la cuenta si el perfil no tiene: después, "Entrar", y la contraseña se cambia con el enlace de la ficha. La creación de la cuenta es la de T15.1, y la cuenta suelta con el mismo email que se enlaza excluye ya al propio perfil. La auditoría guarda `via: enlace | pago`. En `/pago/ok?session_id=…`: "Crea tu contraseña" o "Tu plan ya está activo" con "Entrar en mi área"; sin `session_id`, o si no se puede (cancelado, pago diferido aún sin cobrar…), la página de siempre. El formulario (`CrearContrasena`) y la llamada (`llamarAccesoCliente`) se comparten con `/mi-area/acceso`. Probado: `deno check` de `acceso-cliente`, `stripe-checkout` y `stripe-webhook`; en local, con la función simulada en el navegador, los dos estados y el envío. `stripe-checkout` ya existía: tras fusionar hay que pedir a Lovable que la vuelva a desplegar.

### FASE 16 — Mi perfil y mi plan

- [x] **T16.1 · Ver mi perfil** · Depende de T15.2
  - `mi_perfil()`: respuestas del cuestionario por secciones (mismas etiquetas que `CuestionarioTab`; si hace falta, moverlas a `src/lib/`), plan con fechas, sesiones contratadas / realizadas / pendientes (como `v_clientes`), DISC con su PDF (`generateDiscPdf`) y su foto (política de lectura en `fotos-perfil` solo para la ruta de su `foto_url`). Nada de `revisado`, notas ni aprendizaje.
  - Aceptación: el cliente ve todo lo que rellenó y su plan; con la API no consigue más que eso.
  > Nota de implementación: migración `20261020200000_t16_1_mi_perfil.sql`. `mi_perfil()` devuelve solo una lista cerrada de columnas de `perfiles` (`CAMPOS_MI_PERFIL`): una columna nueva no se ve hasta añadirla a propósito, y un test compara la lista de la migración con la de TS. Con el área cerrada devuelve `NULL`. `puede_ver_foto(ruta)` y la política "Cliente lee su foto" de `fotos-perfil` dejan leer solo su foto y con el área abierta; T18.2 y T19.3 ampliarán esa función. El plan y las sesiones salen de `mi_area` (T15.2), que ya los trae: el layout pasa `{ area, userId }` a cada sección. Las preguntas y los pasos son los del cuestionario (`SECCIONES_PERFIL` en `src/lib/cuestionario.ts`, con test), no los de `CuestionarioTab`, porque el cliente reconoce lo que contestó; lo no contestado no se enseña. `DISC_META` sale tal cual de `Perfil.tsx` a `src/lib/disc.ts` junto con `resumenDisc` (principal, secundario y porcentajes, con test; `Perfil.tsx` lo usa en vez de su cálculo, mismo resultado). El perfil enseña su tipo y el mismo PDF que al acabar el cuestionario. La foto usa `FotoPerfil` (firma o iniciales). Probado en Postgres 15 (48 migraciones y la nueva dos veces): 44 campos sin ninguno interno, solo su foto y nunca la de otro, nada con el plan vencido, la administradora sigue viendo todas las fotos y anónimos sin acceso. En local, con datos simulados: secciones, escalas, PDF generado sin descargar (54 KB), 375 px sin scroll horizontal y `/perfil` cargando bien.

- [x] **T16.2 · Editar mis preferencias y mi foto** · Depende de T16.1
  - `actualizar_mi_perfil(cambios jsonb)` con lista blanca (zona, `acepta_otras_zonas`, edad buscada, `valores_importantes`, aficiones, foto…; la lista, en `src/lib/` con test y repetida en la función). Al guardar, `encolar_matching` (T5.4) recalcula sus sugerencias y se abre una alerta `info` para la psicóloga ("ha cambiado sus preferencias", una por día con `clave_unica`).
  - Aceptación: un campo fuera de la lista se rechaza; el cambio se ve en la ficha y en las sugerencias recalculadas.
  > Nota de implementación: migración `20261020210000_t16_2_editar_mi_perfil.sql`. `actualizar_mi_perfil(cambios)` acepta solo provincia, otras provincias, edad que busca, valores y aficiones (`CAMPOS_EDITABLES`). Valida tipo, rango y lista de cada uno: provincias y valores de `preguntasClave`, de 1 a 3 valores sin repetir, edades enteras de 18 a 99 con la mínima por debajo de la máxima, aficiones de hasta 1.000 caracteres. Solo actualiza esas columnas, así que los triggers de plan y estado (T7.4) no saltan, y devuelve lo que cambió. Un test compara sus listas con las de TS, y `errorPreferencias` repite las reglas en el formulario. Tras un cambio, `perfil_cambiado_por_cliente` (solo el servidor) crea un aviso `info` al día (`perfil_cambiado:<perfil>:<fecha>`, con lo último que cambió). Si afecta al matching, deja sus sugerencias pendientes obsoletas, como hace T5.3 (se recalculan al abrir la ficha), y lo mete en `cola_matching` con el motivo nuevo `preferencias`. Queda en la auditoría (`cliente_cambia_perfil`). La foto va por la Edge Function `foto-cliente` (con su sesión y el área abierta): `subir` da una URL firmada a `fotos-perfil/clientes/<perfil_id>/<fecha>.<ext>` (solo JPG, PNG o WebP; el bucket ya limita a 5 MB); `confirmar` comprueba que es de su carpeta y que existe (`esFotoDelCliente`, con test, para que nunca apunte a la foto de otra persona), la pone en el perfil, borra la anterior (también la del cuestionario) y las subidas sin confirmar, y avisa. Así no quedan copias sueltas; además, la supresión de T9.3 lista también esa carpeta. En el perfil: tarjeta "Tus preferencias" con "Editar" (hoja inferior) y botón de cámara en la foto. Probado en Postgres 15 (49 migraciones y la nueva dos veces): los cambios válidos con todos sus efectos y sin tocar el plan, sin cambios no hace nada, 13 entradas no válidas rechazadas, el área cerrada, la administradora y los anónimos sin acceso, y la función interna cerrada al cliente. En el SQL apareció un fallo (`text[] || 'texto'`) que se corrigió con `array_append`. En local, con las respuestas simuladas: la hoja, el error de edad, guardar con la tarjeta actualizada, y la foto (SVG y 6 MB rechazados antes de llamar; una JPG pide URL, sube y confirma). `deno check` de `foto-cliente`. Es nueva: Lovable la despliega sola al fusionar.

- [x] **T16.3 · Solicitudes a la psicóloga** · Depende de T16.1
  - Botones "Pausar mi búsqueda", "Darme de baja" y "Quiero una copia de mis datos": crean una tarea `manual` y una alerta para la psicóloga, que decide (los cambios de estado siguen las reglas de T1.5 y la exportación es la de T9.3). Sin cambios automáticos desde el área.
  - Aceptación: cada solicitud aparece una sola vez en Tareas y Alertas; el cliente ve "solicitud enviada".
  > Nota de implementación: migración `20261020220000_t16_3_solicitudes.sql`. `pedir_a_psicologa(tipo)` acepta `pausa`, `reanudar` (si ya está en pausa, "Pausar" no tendría sentido), `datos` y `baja` (`SOLICITUDES` en `src/lib/areaCliente.ts`; un test compara los tipos). Crea una tarea `manual` y un aviso `aviso` con la clave `solicitud_<tipo>:<perfil>`: pedirla otra vez no la duplica, y si la psicóloga ya la había cerrado, se reabre. La tarea vence a los 2 días; la de los datos, a los 30 (plazo del RGPD). Queda en la auditoría (`cliente_solicita`). Las automatizaciones no la tocan. `mi_area()` (se rehace igual que en T15.2) trae además `en_pausa` y las `solicitudes` pendientes, para seguir viendo "Has pedido…" al volver. Con el área cerrada sigue sin más datos. En el perfil, "Pedir a tu psicóloga": botones en píldora, "Darme de baja" con confirmación, y lo ya pedido marcado. Probado en Postgres 15 (50 migraciones y la nueva dos veces): pedir dos veces, el vencimiento a 2 y 30 días, el aviso y la auditoría, las automatizaciones sin tocarla, la reapertura, la pausa (`en_pausa` y "reanudar"), un tipo no válido, el área cerrada con sus 3 claves, y la administradora y los anónimos sin acceso. En local, con las respuestas simuladas: pausar, cancelar y confirmar la baja, y los botones que desaparecen al pedirlo.

### FASE 17 — Mi calendario

- [x] **T17.1 · Citas con la psicóloga y con mis matches** · Depende de T15.2
  - `mis_citas(desde, hasta)`: sesiones (fecha, duración, tipo y estado; sin notas, resumen ni vídeo) + citas de matches presentados (T18.1) con fecha, lugar y nombre de pila. UI: `Calendar` de shadcn (ya instalado) con los días marcados y lista de próximas y pasadas debajo (en móvil, la lista primero); "Te quedan N sesiones, hasta el dd/mm". Botón "Añadir a mi calendario" con un `.ics` generado en el navegador (`src/lib/ics.ts`, sin dependencias, con test).
  - Aceptación: una sesión creada en la ficha aparece en el área; una cancelada se ve tachada; el `.ics` se abre en Google Calendar y en el de iPhone.
  > Nota de implementación: migración `20261020230000_t17_1_mis_citas.sql`. `mis_citas()` no lleva rango: devuelve todas sus sesiones (son pocas) con id, fecha, duración, tipo y estado, nunca notas, resumen ni vídeo; con el área cerrada, vacío. Las citas con sus matches no existen aún: T18.2 las añadirá a `mis_citas()` cuando un match se presente (T18.1). `separarCitas` (con test) divide en próximas (programadas desde ahora, la más cercana primero) y pasadas (la más reciente primero, con "Realizada", "Cancelada" tachada o "No asististe"). El `Calendar` de shadcn marca las próximas en azul marino y las realizadas en dorado, y abre en el mes de la próxima. En el móvil va debajo de la lista; desde `md`, al lado. El `.ics` (`src/lib/ics.ts`, con test: CRLF, UTC, escapes) lleva el título neutro "Cita en Afín", para que quien vea su calendario no sepa que es con una psicóloga; el detalle va en la descripción. Probado en Postgres 15 (51 migraciones y la nueva dos veces): sus 2 sesiones con 5 claves y nada clínico, la del otro cliente fuera, vacío con el área cerrada y para la administradora, y anónimos sin acceso. En local, con citas simuladas: la lista, el tachado, el calendario marcado, 375 px sin scroll horizontal y el `.ics` generado sin descargarlo (18:00 de Madrid = 16:00 UTC). Falta abrirlo en un iPhone y en Google Calendar de verdad.

- [ ] **T17.2 · Reservar mi próxima sesión** · Depende de T17.1, T10.3 (recomendado T9.4)
  - Botón "Reservar sesión" (solo si le quedan sesiones) que abre Calendly con nombre y email ya rellenos (`?name=&email=`, en `src/lib/enlaces.ts` de T10.3). Cambiar o cancelar, con los enlaces del email de Calendly.
  - Aceptación: con T9.4, la reserva aparece en su calendario y en la ficha sin apuntar nada a mano; sin T9.4, aparece cuando la psicóloga la registra.
  > Nota de implementación (20/10/2026): hecha antes que T10.3 y a falta del enlace, por eso sin marcar. `src/lib/enlaces.ts` nace aquí con `CALENDLY_SESIONES` vacío: mientras lo esté, el botón no sale, así que en producción no hay enlace roto. Al tener el calendario de Vero, basta con poner esa dirección (y T10.3 traerá aquí las demás). En Calendario, "Reservar sesión" sale si le quedan sesiones por reservar: las que le quedan del plan menos las ya programadas (`sesionesPorReservar`). Abre Calendly en otra pestaña con su nombre completo y su email ya puestos (`enlaceReserva`, con `name` y `email`; con test), y solo entonces pide `mi_perfil`. Sin T9.4, la sesión aparece cuando la psicóloga la registra, y así se lo dice el texto ("la verás aquí cuando te la confirme"). Probado en local con un enlace de ejemplo provisional y respuestas simuladas: 3 que le quedan y 1 programada dan "2 por reservar" con el enlace relleno; con todo programado, no sale.

- [ ] **T17.3 · (Opcional) "Para ti, tras la sesión"** · Depende de T17.1
  - Columna `sesiones.mensaje_cliente` que la psicóloga escribe a propósito en la sesión (no se genera con IA ni sale del resumen). Se ve en esa sesión del calendario.
  - Aceptación: sin mensaje no se muestra nada; el resumen IA sigue sin ser accesible.

### FASE 18 — Mis matches

- [ ] **T18.1 · Presentar un match en el área** · Depende de T15.1
  - Migración: `matches.presentado_at` y `matches.motivos_cliente text[]`. En `MatchesTab`, "Presentar en su área": la psicóloga revisa los motivos que verán (precargados de `match_sugerencias.motivos`; los riesgos, nunca) y lo presenta a los dos a la vez.
  - Aceptación: un match sin presentar no aparece en el área de ninguno; al presentarlo aparece a los dos.

- [ ] **T18.2 · Ver mis matches** · Depende de T18.1, T15.2
  - `mis_matches()`: de la otra persona, nombre de pila, edad, zona, aficiones, foto (política de lectura en `fotos-perfil` para las fotos de sus matches presentados) y `motivos_cliente`; estado en palabras del cliente (Presentado → Cita agendada → Cita realizada → Seguís conociéndoos / Cerrado; textos en `src/lib/` con test); fecha y lugar de la cita; informe si es Premium y está enviado.
  - Aceptación: se ve lo anterior y nada más (comprobado con la API con la cuenta del cliente).

- [ ] **T18.3 · Mi feedback tras la cita** · Depende de T18.2
  - Tras `cita_realizada`: valoración 1-5, "¿Te gustaría volver a verle?" y comentario. `dejar_feedback(match_id, …)` escribe solo su lado (`_a` o `_b`), sella `feedback_at`, avisa a la psicóloga y, cuando están los dos, completa la tarea `registrar_feedback` (T6.4). Se puede cambiar hasta que la psicóloga pase el match a `feedback_registrado`. Nunca ve el feedback del otro.
  - Aceptación: con los dos feedbacks, la tarea se cierra sola y el feedback aparece en la ficha como si lo hubiera apuntado la psicóloga.

### FASE 19 — Propuestas: "¿Con quién te ves más?"

- [ ] **T19.1 · Aceptar aparecer en propuestas** · Depende de T10.4 (texto de la asesoría)
  - Migración: `perfiles.mostrar_en_propuestas` (false por defecto) y `mostrar_en_propuestas_at`. Casilla en Mi perfil y en el cuestionario: "Acepto que Afín muestre mi nombre de pila, edad, zona, foto y aficiones a otras personas compatibles". Solo se puede proponer a quien la tiene marcada.
  - Aceptación: alguien sin la casilla nunca aparece en una ronda, aunque sea la mejor sugerencia.

- [ ] **T19.2 · Rondas de 4 propuestas (backoffice)** · Depende de T19.1, T4.5
  - Tabla `propuestas_rondas` (`perfil_id`, `candidatos uuid[]` de 4, `frases jsonb` por candidato, `elegido_id`, `ninguno`, `motivo`, `enviada_at`, `respondida_at`, `caduca_at`; RLS solo admin; una abierta por cliente con índice único parcial). En Sugerencias: "Enviar ronda" con las 4 mejores con consentimiento preseleccionadas, cambiables, y una frase por candidato ("por qué te lo proponemos") a partir de sus motivos.
  - Aceptación: no se puede enviar una ronda con menos de 4, con alguien sin consentimiento ni con otra abierta.

- [ ] **T19.3 · Elegir en el área** · Depende de T19.2, T15.2
  - `mi_ronda()` y `responder_ronda(ronda_id, elegido_id | null, motivo)`. 4 tarjetas (foto, nombre de pila, edad, zona, 3 aficiones y la frase; cuadrícula 2×2, carrusel en móvil), "Me veo más con…" o "Ninguno me encaja" con los chips de T5.3 (edad, distancia, valores, físico, otro). Confirmación antes de enviar; después, "Tu psicóloga lo revisará y te contará". En toda el área se habla de "tu psicóloga", sin nombre.
  - Aceptación: una ronda se responde una vez; caducada no se responde; el cliente no puede ver a nadie fuera de su ronda abierta (las fotos, con la misma política que T18.2).

- [ ] **T19.4 · La elección vuelve a la psicóloga y al aprendizaje** · Depende de T19.3, T5.3
  - Al responder: alerta "X se ve más con Y" con enlace a esa sugerencia (aceptarla crea el match como hoy, T6.1). `actualizar-aprendizaje` recibe la ronda como una decisión más (el elegido, a favor; los descartados con motivo, en contra) dentro del contexto de T5.1. Una ronda caducada sin respuesta abre una alerta `info`.
  - Aceptación: tras 2-3 rondas, "Lo que la IA ha aprendido" de la ficha recoge lo elegido y el ranking cambia.

- [ ] **T19.5 · (Opcional) Perfiles tipo, sin personas reales** · Depende de T19.3
  - Para el principio (antes de tener sugerencias) o si el consentimiento de T19.1 tarda: la IA genera 4 perfiles ficticios sin foto a partir de lo que busca el cliente, cambiando una dimensión en cada uno (edad, estilo de vida, valores, ambición). Misma pantalla, marcada como "perfiles de ejemplo", y mismo aprendizaje.
  - Aceptación: nunca se mezclan con personas reales y el cliente sabe que son de ejemplo.

- [ ] **T19.6 · (Opcional) Avisos por email** · Depende de T12.1
  - "Tienes una nueva propuesta", "Te hemos presentado a alguien" y "¿Qué tal la cita?", con enlace al área y sin contenido (ni nombres ni fotos en el email). Se integra con los recordatorios de T12.4.
  - Aceptación: cada aviso sale una vez por evento y se puede desactivar en Configuración.

---

## 5. Checklist de QA final (mapeo 1:1 con el PDF)

- [x] Al abrir el backoffice veo en el Dashboard los 11 indicadores pedidos.
- [x] Cada cliente tiene una única ficha con datos, estado, plan, sesiones (contratadas/realizadas/pendientes), vídeo, historial, resúmenes IA, notas y próxima cita.
- [x] El cuestionario recoge las 5 preguntas clave y el matching las usa como filtro.
- [x] Al abrir una ficha aparecen automáticamente los perfiles más compatibles con %, motivos, riesgos y botones Aceptar/Rechazar.
- [x] Las decisiones de la psicóloga cambian las siguientes recomendaciones.
- [x] El plan es visible siempre (listado, cabecera de ficha, sugerencias).
- [x] Un match con cliente Premium crea la tarea de informe; tras la cita, la de feedback; ambas visibles hasta completarse.
- [x] Tras cada sesión, la IA genera un resumen con las 5 secciones y la psicóloga solo revisa y guarda.
- [x] Baja: sale del matching, tareas canceladas, historial intacto. Pausado: fuera de nuevos matches y reactivable.
- [x] Se generan los 6 avisos automáticos del PDF sin intervención manual.

> Verificado el 08/10/2026 (T9.5) contra lo probado en cada tarea, casi todo en producción: Dashboard con los indicadores y sus cuatro bloques (T8.2, revisado de nuevo); ficha única con cabecera de plan, estado, sesiones y próxima cita, y pestañas de sesiones con resúmenes, vídeo, notas e historial (T2.1-T3.4); preguntas clave en `/perfil` y filtros del matching v3 (T4.2-T4.3); sugerencias calculadas al abrir la ficha con %, motivos, riesgos y Aceptar/Rechazar (T4.5, T5.2), también en Compatibilidades (T9.1); aprendizaje de las decisiones (T5.3, probado con un rechazo por distancia); plan en el listado, la cabecera, las sugerencias, Compatibilidades y Matches Aprobados; tareas de informe Premium y de feedback tras la cita que se completan o cancelan solas (T6.4-T6.5, y de nuevo con `seed.sql`); resumen de sesión con IA en borrador que la psicóloga revisa y guarda (T3.2-T3.3); Baja y Pausado con sus efectos y reactivación (T1.5, T4.1, T6.2, T7.1); las 7 reglas de avisos y tareas cada hora con `pg_cron`, con la última ejecución correcta en Configuración (T7.2-T7.4).

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

Fases 10-14 (añadidas el 15/10/2026): **F10** primero (pequeña; T10.3 y T10.4 esperan a Vero y a la asesoría) → **F11 Stripe** en cuanto esté T11.0 (T11.5 necesita además T10.4) → **F12 Emails** (necesita dominio propio) → **F13 Roles y documentos** → **F14**, que se puede intercalar (T14.1 es de una hora). T9.4 (Calendly) sigue opcional y necesita el plan Standard de Calendly.

Fases 15-19, área del cliente (añadidas el 20/10/2026): **F15 Acceso** → **T16.1 + T17.1** (perfil y calendario: lo que más valor da con menos riesgo) → **F18 Matches** (T18.3 quita a la psicóloga el pedir feedback a mano) → **F16** y **T17.2** → **F19 Propuestas**, la última porque muestra a otras personas: espera al texto legal (T10.4) y al consentimiento (T19.1). T19.5 permite probar la pantalla de propuestas antes, sin personas reales.

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
| 02/10/2026 | T1.1 | Enums `estado_cliente`/`plan_tipo` y columnas de cliente en `perfiles` (estados migrados desde `estado_perfil`, trigger de `estado_cambiado_at`, INSERT anónimo sin campos del CRM); badges de los 4 estados en listado, ficha y Dashboard. |
| 02/10/2026 | T1.2 | `paid_users` → `pagos` con `perfil_id` (casado por email), `importe` y `fecha`; trigger que copia el plan al perfil; `disc_result_id` rellenado por email; Pagos con buscador de perfil, vincular pagos antiguos y enlace a la ficha; badge de plan en listado y ficha. |
| 02/10/2026 | T1.3 | Tabla `sesiones` (esquema de 3.1, RLS solo admin) y vista `v_clientes` (`security_invoker`) con `sesiones_realizadas`, `sesiones_pendientes` y `proxima_cita`. |
| 02/10/2026 | T1.4 | Listado sobre `v_clientes` con paginación en servidor (25), búsqueda `ilike`, columnas Plan, Sesiones y Próxima cita, y filtros de plan/cliente/lead y estado combinables. |
| 02/10/2026 | T1.5 | Función `cambiar_estado_cliente` (solo admin, auditada con motivo en `auditoria.detalle`, puntos de ampliación para T2.2/T4.1/T6.2/T7.1) y selector de estado con diálogo de confirmación en la ficha. |
| 02/10/2026 | — | CI en GitHub Actions (typecheck, lint, test y build en cada PR y push a `main`), instalando con `bun.lock`. |
| 02/10/2026 | T2.1 | Ficha dividida en cabecera fija (plan, estado, sesiones, próxima cita, cambio de estado) y pestañas Resumen, Sugerencias IA, Notas, Cuestionario y Documentos (Sesiones, Matches y Tareas deshabilitadas hasta su fase). |
| 02/10/2026 | T2.2 | Tabla `notas_privadas` (solo admin) con `notas_admin` copiada como primera nota, trigger de `ultimo_seguimiento_at`, nota automática en cada cambio de estado y pestaña Notas con historial, edición, borrado y vínculo a sesión. |
| 02/10/2026 | T2.3 | Bloque "Vídeo de presentación" en Resumen: subir con barra de progreso, reproducir con URL firmada de 1 h, reemplazar y eliminar (`videos-sesiones/<perfil_id>/presentacion.<ext>`). |
| 02/10/2026 | T2.4 | Diálogo "Plan" en la cabecera de la ficha (tipo, inicio, fin y sesiones contratadas) con sugerencia automática de sesiones según el plan y los meses. |
| 03/10/2026 | T3.1 | Pestaña Sesiones (programar/registrar, cambiar estado, primera sesión con enlace al vídeo), una sola primera por cliente y la sesión realizada cuenta como seguimiento. |
| 03/10/2026 | T3.2 | Edge Function `resumen-sesion` (borrador validado en `sesiones.resumen_ia`, auditado) y código común de las funciones en `_shared/`; probada en producción. |
| 03/10/2026 | — | `src/integrations/supabase` fuera del lint: Lovable añadió `previewAuthStorage.ts` con un error de lint y rompió el CI de `main`. Los tipos que regeneró Lovable coinciden con los escritos a mano. |
| 03/10/2026 | T3.3 | Panel de notas y resumen en cada sesión realizada: generar/regenerar con IA, editar por sección y guardar como revisado (sella revisión y seguimiento). |
| 03/10/2026 | T3.4 | Línea temporal "Evolución" en Resumen con el estado emocional y los avances de las últimas sesiones revisadas. T3.5 (opcional) pospuesta. |
| 07/10/2026 | T4.1 | Tabla `match_sugerencias` (solo admin, un par cliente-candidato único), `sugerencias_pendientes` en `v_clientes` y `cambiar_estado_cliente` caduca las sugerencias pendientes al pausar, finalizar o dar de baja. |
| 07/10/2026 | T4.2 | Provincia (+ "abierto/a a otras zonas") y hasta 3 valores importantes en `/perfil` sin pasos nuevos; `src/lib/preguntasClave.ts` con las 5 preguntas clave que pinta la ficha; relleno de `zona` desde la ciudad. |
| 07/10/2026 | T4.3 | Matching v3 en `supabase/functions/_shared/profileMatching.ts` (reexportado en `src/lib`): solo candidatos activos, `excluirIds`, zona, valores importantes, provincia en geografía, pesos y ajustes inyectables y `VERSION_ALGORITMO`. |
| 07/10/2026 | T4.4 | Edge Function `sugerencias-calcular`: top por reglas guardado en `match_sugerencias` sin duplicar, sin tocar decisiones y caducando las que salen; vigencia de 24 h salvo `forzar`. |
| 07/10/2026 | T4.5 | Pestaña Sugerencias IA: guardadas al instante, recálculo en segundo plano al abrir la ficha, "Recalcular", filtros por estado, desglose por dimensión y aceptar/rechazar con motivo. Fase 4 completa. |
| 07/10/2026 | T5.1 | Tabla `perfil_aprendizaje` y `construirContextoCliente` (`_shared/contextoCliente.ts` + `formatearContexto`): contexto del cliente para la IA por secciones, sin datos de contacto y acotado a ~6.000 tokens quitando lo más antiguo. |
| 07/10/2026 | T5.2 | Re-ranking con IA en `sugerencias-calcular`: los 15 mejores por reglas pasan por la IA con el contexto del cliente; score mixto 50/50, motivos y riesgos de la IA y vuelta a solo reglas si falla. |
| 07/10/2026 | T5.3 | `actualizar-aprendizaje` tras cada decisión y resumen revisado: ajustes de peso por regla (±30 %, chips de rechazo) y preferencias de la IA; `sugerencias-calcular` los aplica; bloque "Lo que la IA ha aprendido" editable en Sugerencias. |
| 07/10/2026 | T5.4 | `cola_matching` + triggers de alta/reactivación y `procesar-cola-matching` (perfil nuevo contra clientes con plan, solo reglas, sugerencia si ≥ umbral). Alerta y ejecución programada, en T7.1/T7.3. T5.5 (opcional) pospuesta. |
| 07/10/2026 | T6.1 | Tabla `matches` (uno por pareja), creado al aceptar una sugerencia; pestaña Matches con estados y cita; la cita cuenta como próxima cita de los dos y `sugerencias-calcular` no repropone parejas con match. |
| 07/10/2026 | T6.2 | Tabla `tareas` (Baja cancela las pendientes), pestaña Tareas en la ficha, panel global `/admin/tareas` con filtros, contador en la cabecera y próximas tareas en Resumen. |
| 07/10/2026 | T6.3 | Informe de compatibilidad dentro de cada match (generar, editar, PDF, marcar como enviado) con `compatibility-report` sobre el match y solo datos del cuestionario; `/compatibilidad` redirige a `/admin`. |
| 07/10/2026 | T6.4 | Tareas automáticas en los matches: informe para cada lado Premium (se completa al enviarlo) y feedback tras la cita para cada lado con plan (vence a `dias_feedback`); cerrar cancela las automáticas; aviso al agendar sin informe. |
| 07/10/2026 | T6.5 | Feedback de los dos tras la cita (texto, 1-5, volver a verse): completa las tareas, cuenta como seguimiento, pasa el match a "feedback registrado" y entra en el contexto del aprendizaje. Fase 6 completa. |
| 07/10/2026 | T7.1 | Tabla `alertas`, campana con contador y panel, página `/admin/alertas` y banda en la ficha; la Baja las resuelve; alerta de perfil muy compatible desde `procesar-cola-matching`. |
| 07/10/2026 | T7.2 | `v_automatizaciones` + `evaluar_automatizaciones()`: las 7 reglas crean alertas y tareas sin duplicar, resuelven solas lo que ya no aplica y respetan lo resuelto a mano (claves por episodio). |
| 07/10/2026 | T7.3 | `pg_cron`: automatizaciones cada hora y cola de matching cada 15 min (`pg_net` con secreto propio); sección Automatizaciones en Configuración con última ejecución y "Ejecutar ahora". |
| 07/10/2026 | T7.4 | Triggers en perfiles, sesiones y matches que reevalúan al instante las automatizaciones del cliente. T7.5 (opcional) sin empezar. |
| 07/10/2026 | T6.3 | PDF del informe probado: las fortalezas salían ilegibles por la marca ✓ (fuera de WinAnsi); todo el texto pasa por `aWinAnsi` antes de escribirse (test con jsPDF). |
| 07/10/2026 | T8.1 | `dashboard_resumen()`: los 11 indicadores del PDF en una llamada, contados sobre `v_clientes` (nueva columna `matches_abiertos`) para que coincidan con el listado; 18-48 ms con 1.000 perfiles. |
| 07/10/2026 | T8.2 | Nuevo Dashboard: 12 indicadores enlazados a su listado filtrado (filtros por URL y "Situación" en Perfiles), agenda de hoy, alertas importantes, tareas pendientes y nuevos perfiles compatibles. Fase 8 completa. |
| 08/10/2026 | T9.1 | Fuera los placeholders: Compatibilidades (pendientes de todos por score con aceptar/rechazar), Matches Aprobados (todos, con embudo y filtros), Seguimiento (tablero por estado) y Notas Privadas (buscador de notas y resúmenes). |
| 08/10/2026 | T9.2 | Configuración: parámetros editables (sesiones por plan, umbrales de avisos, matching y pesos) con validación, y administradoras (listar, invitar por email y quitar acceso) con la Edge Function `administradoras`. |
| 08/10/2026 | T9.3 | RGPD: registro de lecturas de notas, resúmenes y vídeo, exportación JSON sin datos de terceros, supresión definitiva (pagos conservados sin vínculo) y consentimiento guardado con textos nuevos, pendientes de validar con asesoría legal. |
| 08/10/2026 | T9.2 | Invitaciones sin email: Hotmail gastaba el enlace de Supabase. El CRM da un enlace a `/admin/acceso` (botón "Entrar") para enviarlo por cualquier canal, también para quien olvide la contraseña. |
| 08/10/2026 | T9.5 | Limpieza: fuera `estado_perfil`, `notas_admin`, `paid_users` y tres ficheros sin uso; admin adaptado a móvil, accesibilidad revisada con axe (0 incidencias) y `seed.sql` con 30 perfiles de prueba. Checklist de QA completo. Fase 9 completa. |
| 15/10/2026 | — | Plan ampliado con las Fases 10-14: arreglos y textos legales de la web, pagos con Stripe desde la ficha, emails a clientes, roles y subida de documentos, y calidad técnica. |
| 20/10/2026 | T11.1 | Pagos con origen y estado (pendiente, pagado, caducado, reembolsado), ids de Stripe, y precio al mes y meses por defecto editables en Configuración. Decididos pago único del plan completo, IVA incluido y facturas fuera de Stripe. |
| 20/10/2026 | T11.2 | Edge Function `stripe-checkout`: enlace de pago de Stripe (Checkout) para el plan y los meses elegidos, con el pago pendiente guardado y reutilización del enlace vigente. |
| 20/10/2026 | T11.3 | Edge Function `stripe-webhook` con firma comprobada y `confirmar_pago_stripe` / `reembolsar_pago_stripe`: el pago se marca, el plan se activa una sola vez y un reembolso abre un aviso. |
| 20/10/2026 | T11.4 | Botón "Enlace de pago" en la ficha (plan, meses, total y enlace para enviar), estado de los pagos en la ficha y en Pagos, y páginas `/pago/ok` y `/pago/cancelado`. |
| 20/10/2026 | T11.0, T11.5 | Stripe en modo de pruebas configurado (claves y webhook) y primer pago de prueba de punta a punta: el plan se activa solo y un aviso repetido no lo duplica. |
| 20/10/2026 | T11.5 | Pruebas en modo de pruebas completas: pago rechazado, enlace caducado y reembolso (con su aviso). Queda el paso a modo real. |
| 20/10/2026 | T10.1 | Casilla de consentimiento obligatoria en el test DISC, con la versión y la fecha guardadas en `disc_results`. |
| 20/10/2026 | T10.2 | Rutas cargadas al entrar en ellas: la portada descarga un 69 % menos de JS (453 KB en vez de 1.457 KB). |
| 20/10/2026 | T13.1, T13.2 | Descartadas: Vero y la psicóloga son administradoras y ven todo; los clientes no entran al CRM. |
| 20/10/2026 | T13.3 | Enlace personal (7 días) desde la ficha para que el cliente suba su certificado; la página ya no pide email ni nombre y se retira la subida anónima. |
| 20/10/2026 | — | Plan ampliado con las Fases 15-19, área del cliente (`/mi-area`): acceso solo con el plan pagado (enlace desde la ficha o al pagar), perfil y plan, calendario de citas, matches presentados con feedback del cliente y rondas de 4 propuestas para elegir con quién se ve más. |
| 20/10/2026 | T15.1 | Cuenta del cliente: enlace de acceso desde la ficha (solo con el plan pagado, 7 días, un solo uso), Edge Function `acceso-cliente` y página para crear la contraseña; la cuenta no lee ninguna tabla y se borra al suprimir al cliente. |
| 20/10/2026 | T15.2 | Área del cliente `/mi-area`: entrada con email y contraseña, estructura con barra inferior, Inicio (próxima sesión, sesiones, aviso de fin de plan) y área cerrada sin datos con "Quiero renovar" (tarea y aviso para la psicóloga). |
| 20/10/2026 | T15.3 | Tras pagar con Stripe, `/pago/ok` deja crear la contraseña del área (o entrar si ya la tiene); `acceso-cliente` comprueba el pago en Stripe y lo confirma si el aviso aún no ha llegado. |
| 20/10/2026 | T16.1 | Perfil del cliente en su área: plan y sesiones, su DISC con el PDF y sus respuestas por pasos del cuestionario; `mi_perfil()` con lista cerrada de campos y su foto solo para él. |
| 20/10/2026 | T16.2 | El cliente cambia sus preferencias (provincia, edad que busca, valores y aficiones) con validación en el servidor y su foto con la Edge Function `foto-cliente` (borra la anterior); la psicóloga recibe un aviso y sus sugerencias se recalculan. |
| 20/10/2026 | T16.3 | El cliente pide a su psicóloga pausar o reanudar su búsqueda, la baja (con confirmación) o una copia de sus datos: tarea y aviso, sin cambios automáticos. Cierra la Fase 16. |
| 20/10/2026 | T17.1 | Calendario del cliente: sus sesiones (próximas y pasadas, la cancelada tachada) en lista y en el mes, "Te quedan N sesiones" y "Añadir a mi calendario" con un `.ics` de título neutro. |
| 20/10/2026 | T17.2 (sin cerrar) | Botón "Reservar sesión" en el calendario del cliente, con su nombre y email en Calendly; espera la dirección de Calendly (`CALENDLY_SESIONES` en `src/lib/enlaces.ts`) y, mientras tanto, no sale. |
