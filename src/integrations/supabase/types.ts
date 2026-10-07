export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alertas: {
        Row: {
          clave_unica: string | null
          created_at: string
          estado: Database["public"]["Enums"]["alerta_estado"]
          id: string
          match_id: string | null
          mensaje: string
          perfil_id: string | null
          resuelta_at: string | null
          severidad: Database["public"]["Enums"]["alerta_severidad"]
          tipo: Database["public"]["Enums"]["alerta_tipo"]
        }
        Insert: {
          clave_unica?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["alerta_estado"]
          id?: string
          match_id?: string | null
          mensaje: string
          perfil_id?: string | null
          resuelta_at?: string | null
          severidad?: Database["public"]["Enums"]["alerta_severidad"]
          tipo?: Database["public"]["Enums"]["alerta_tipo"]
        }
        Update: {
          clave_unica?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["alerta_estado"]
          id?: string
          match_id?: string | null
          mensaje?: string
          perfil_id?: string | null
          resuelta_at?: string | null
          severidad?: Database["public"]["Enums"]["alerta_severidad"]
          tipo?: Database["public"]["Enums"]["alerta_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "alertas_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "v_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria: {
        Row: {
          accion: string
          created_at: string
          detalle: Json | null
          entidad: string
          entidad_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          accion: string
          created_at?: string
          detalle?: Json | null
          entidad: string
          entidad_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          accion?: string
          created_at?: string
          detalle?: Json | null
          entidad?: string
          entidad_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      cola_matching: {
        Row: {
          encolado_at: string
          motivo: string
          perfil_id: string
        }
        Insert: {
          encolado_at?: string
          motivo: string
          perfil_id: string
        }
        Update: {
          encolado_at?: string
          motivo?: string
          perfil_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cola_matching_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: true
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cola_matching_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: true
            referencedRelation: "v_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion: {
        Row: {
          clave: string
          valor: Json
        }
        Insert: {
          clave: string
          valor: Json
        }
        Update: {
          clave?: string
          valor?: Json
        }
        Relationships: []
      }
      disc_results: {
        Row: {
          compatibility_tip_1: string | null
          compatibility_tip_2: string | null
          compatibility_tip_3: string | null
          conflict_style_1: string | null
          conflict_style_2: string | null
          created_at: string
          email: string
          id: string
          love_language_1: string | null
          love_language_2: string | null
          love_language_3: string | null
          name: string
          percent_c: number
          percent_d: number
          percent_i: number
          percent_s: number
          primary_style: string
          score_c: number
          score_d: number
          score_i: number
          score_s: number
          secondary_style: string
          strength_1: string | null
          strength_2: string | null
          strength_3: string | null
          telefono: string | null
          weakness_1: string | null
          weakness_2: string | null
          weakness_3: string | null
        }
        Insert: {
          compatibility_tip_1?: string | null
          compatibility_tip_2?: string | null
          compatibility_tip_3?: string | null
          conflict_style_1?: string | null
          conflict_style_2?: string | null
          created_at?: string
          email: string
          id?: string
          love_language_1?: string | null
          love_language_2?: string | null
          love_language_3?: string | null
          name: string
          percent_c?: number
          percent_d?: number
          percent_i?: number
          percent_s?: number
          primary_style: string
          score_c?: number
          score_d?: number
          score_i?: number
          score_s?: number
          secondary_style: string
          strength_1?: string | null
          strength_2?: string | null
          strength_3?: string | null
          telefono?: string | null
          weakness_1?: string | null
          weakness_2?: string | null
          weakness_3?: string | null
        }
        Update: {
          compatibility_tip_1?: string | null
          compatibility_tip_2?: string | null
          compatibility_tip_3?: string | null
          conflict_style_1?: string | null
          conflict_style_2?: string | null
          created_at?: string
          email?: string
          id?: string
          love_language_1?: string | null
          love_language_2?: string | null
          love_language_3?: string | null
          name?: string
          percent_c?: number
          percent_d?: number
          percent_i?: number
          percent_s?: number
          primary_style?: string
          score_c?: number
          score_d?: number
          score_i?: number
          score_s?: number
          secondary_style?: string
          strength_1?: string | null
          strength_2?: string | null
          strength_3?: string | null
          telefono?: string | null
          weakness_1?: string | null
          weakness_2?: string | null
          weakness_3?: string | null
        }
        Relationships: []
      }
      match_sugerencias: {
        Row: {
          calculado_at: string
          candidato_id: string
          decidido_at: string | null
          desglose: Json
          estado: Database["public"]["Enums"]["sugerencia_estado"]
          id: string
          motivo_decision: string | null
          motivos: string[]
          perfil_id: string
          riesgos: string[]
          score: number
          score_ia: number | null
          score_reglas: number
          version_algoritmo: string
        }
        Insert: {
          calculado_at?: string
          candidato_id: string
          decidido_at?: string | null
          desglose?: Json
          estado?: Database["public"]["Enums"]["sugerencia_estado"]
          id?: string
          motivo_decision?: string | null
          motivos?: string[]
          perfil_id: string
          riesgos?: string[]
          score: number
          score_ia?: number | null
          score_reglas: number
          version_algoritmo: string
        }
        Update: {
          calculado_at?: string
          candidato_id?: string
          decidido_at?: string | null
          desglose?: Json
          estado?: Database["public"]["Enums"]["sugerencia_estado"]
          id?: string
          motivo_decision?: string | null
          motivos?: string[]
          perfil_id?: string
          riesgos?: string[]
          score?: number
          score_ia?: number | null
          score_reglas?: number
          version_algoritmo?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_sugerencias_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_sugerencias_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "v_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_sugerencias_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_sugerencias_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "v_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          estado: Database["public"]["Enums"]["match_estado"]
          fecha_cita: string | null
          feedback_a: string | null
          feedback_at: string | null
          feedback_b: string | null
          id: string
          informe: Json | null
          informe_enviado_at: string | null
          lugar: string | null
          perfil_a: string
          perfil_b: string
          quiere_repetir_a: boolean | null
          quiere_repetir_b: boolean | null
          sugerencia_id: string | null
          valoracion_a: number | null
          valoracion_b: number | null
        }
        Insert: {
          created_at?: string
          estado?: Database["public"]["Enums"]["match_estado"]
          fecha_cita?: string | null
          feedback_a?: string | null
          feedback_at?: string | null
          feedback_b?: string | null
          id?: string
          informe?: Json | null
          informe_enviado_at?: string | null
          lugar?: string | null
          perfil_a: string
          perfil_b: string
          quiere_repetir_a?: boolean | null
          quiere_repetir_b?: boolean | null
          sugerencia_id?: string | null
          valoracion_a?: number | null
          valoracion_b?: number | null
        }
        Update: {
          created_at?: string
          estado?: Database["public"]["Enums"]["match_estado"]
          fecha_cita?: string | null
          feedback_a?: string | null
          feedback_at?: string | null
          feedback_b?: string | null
          id?: string
          informe?: Json | null
          informe_enviado_at?: string | null
          lugar?: string | null
          perfil_a?: string
          perfil_b?: string
          quiere_repetir_a?: boolean | null
          quiere_repetir_b?: boolean | null
          sugerencia_id?: string | null
          valoracion_a?: number | null
          valoracion_b?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_perfil_a_fkey"
            columns: ["perfil_a"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_perfil_a_fkey"
            columns: ["perfil_a"]
            isOneToOne: false
            referencedRelation: "v_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_perfil_b_fkey"
            columns: ["perfil_b"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_perfil_b_fkey"
            columns: ["perfil_b"]
            isOneToOne: false
            referencedRelation: "v_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_sugerencia_id_fkey"
            columns: ["sugerencia_id"]
            isOneToOne: false
            referencedRelation: "match_sugerencias"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_privadas: {
        Row: {
          automatica: boolean
          contenido: string
          created_at: string
          created_by: string | null
          id: string
          perfil_id: string
          sesion_id: string | null
        }
        Insert: {
          automatica?: boolean
          contenido: string
          created_at?: string
          created_by?: string | null
          id?: string
          perfil_id: string
          sesion_id?: string | null
        }
        Update: {
          automatica?: boolean
          contenido?: string
          created_at?: string
          created_by?: string | null
          id?: string
          perfil_id?: string
          sesion_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notas_privadas_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_privadas_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "v_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_privadas_sesion_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: false
            referencedRelation: "sesiones"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos: {
        Row: {
          created_at: string
          email: string
          fecha: string
          id: string
          importe: number | null
          nombre_completo: string
          notas: string | null
          perfil_id: string | null
          plan: Database["public"]["Enums"]["plan_tipo"]
          telefono: string | null
        }
        Insert: {
          created_at?: string
          email: string
          fecha?: string
          id?: string
          importe?: number | null
          nombre_completo: string
          notas?: string | null
          perfil_id?: string | null
          plan: Database["public"]["Enums"]["plan_tipo"]
          telefono?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          fecha?: string
          id?: string
          importe?: number | null
          nombre_completo?: string
          notas?: string | null
          perfil_id?: string | null
          plan?: Database["public"]["Enums"]["plan_tipo"]
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "v_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      perfil_aprendizaje: {
        Row: {
          actualizado_at: string
          ajustes_pesos: Json
          perfil_id: string
          preferencias: Json
          resumen_contexto: string | null
        }
        Insert: {
          actualizado_at?: string
          ajustes_pesos?: Json
          perfil_id: string
          preferencias?: Json
          resumen_contexto?: string | null
        }
        Update: {
          actualizado_at?: string
          ajustes_pesos?: Json
          perfil_id?: string
          preferencias?: Json
          resumen_contexto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfil_aprendizaje_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: true
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfil_aprendizaje_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: true
            referencedRelation: "v_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          acepta_otras_zonas: boolean
          alcohol: string | null
          ambicion_profesional: number
          aprendizaje_ultima_relacion: string
          busca_genero: string | null
          ciudad: string
          conflicto: string[] | null
          created_at: string
          desea_casarse: string | null
          deseo_familia: number
          disc_perfil: string | null
          disc_respuestas: Json | null
          disc_result_id: string | null
          edad: number
          edad_max_busca: number | null
          edad_min_busca: number | null
          email: string | null
          estado_cambiado_at: string
          estado_cliente: Database["public"]["Enums"]["estado_cliente"]
          estado_perfil: string
          estatura: number | null
          estilo_vestir: string | null
          estilo_vestir_pareja: string | null
          estilo_vida_activo: number
          fin_de_semana: string | null
          foto_url: string | null
          genero: string | null
          hijos: string
          hobbies: string | null
          id: string
          ideologia: string | null
          importa_politica: boolean | null
          importa_religion: boolean | null
          importa_vestir: boolean | null
          necesidad_independencia: number
          nivel_social: number
          nombre_completo: string
          notas_admin: string | null
          peso: number | null
          plan: Database["public"]["Enums"]["plan_tipo"] | null
          plan_fin: string | null
          plan_inicio: string | null
          politica_pareja: string | null
          relacion_sana: string
          religion: string | null
          religion_pareja: string | null
          revisado: boolean
          sentirse_querido: string[] | null
          sesiones_contratadas: number
          tabaco: string
          tatuajes_pareja: string | null
          telefono: string | null
          tiene_tatuajes: boolean | null
          tipo_relacion: string
          ultimo_seguimiento_at: string | null
          valores_importantes: string[]
          vida_en_10_anios: string
          video_presentacion_path: string | null
          zona: string | null
        }
        Insert: {
          acepta_otras_zonas?: boolean
          alcohol?: string | null
          ambicion_profesional: number
          aprendizaje_ultima_relacion: string
          busca_genero?: string | null
          ciudad: string
          conflicto?: string[] | null
          created_at?: string
          desea_casarse?: string | null
          deseo_familia: number
          disc_perfil?: string | null
          disc_respuestas?: Json | null
          disc_result_id?: string | null
          edad: number
          edad_max_busca?: number | null
          edad_min_busca?: number | null
          email?: string | null
          estado_cambiado_at?: string
          estado_cliente?: Database["public"]["Enums"]["estado_cliente"]
          estado_perfil?: string
          estatura?: number | null
          estilo_vestir?: string | null
          estilo_vestir_pareja?: string | null
          estilo_vida_activo: number
          fin_de_semana?: string | null
          foto_url?: string | null
          genero?: string | null
          hijos: string
          hobbies?: string | null
          id?: string
          ideologia?: string | null
          importa_politica?: boolean | null
          importa_religion?: boolean | null
          importa_vestir?: boolean | null
          necesidad_independencia: number
          nivel_social: number
          nombre_completo: string
          notas_admin?: string | null
          peso?: number | null
          plan?: Database["public"]["Enums"]["plan_tipo"] | null
          plan_fin?: string | null
          plan_inicio?: string | null
          politica_pareja?: string | null
          relacion_sana: string
          religion?: string | null
          religion_pareja?: string | null
          revisado?: boolean
          sentirse_querido?: string[] | null
          sesiones_contratadas?: number
          tabaco: string
          tatuajes_pareja?: string | null
          telefono?: string | null
          tiene_tatuajes?: boolean | null
          tipo_relacion: string
          ultimo_seguimiento_at?: string | null
          valores_importantes?: string[]
          vida_en_10_anios: string
          video_presentacion_path?: string | null
          zona?: string | null
        }
        Update: {
          acepta_otras_zonas?: boolean
          alcohol?: string | null
          ambicion_profesional?: number
          aprendizaje_ultima_relacion?: string
          busca_genero?: string | null
          ciudad?: string
          conflicto?: string[] | null
          created_at?: string
          desea_casarse?: string | null
          deseo_familia?: number
          disc_perfil?: string | null
          disc_respuestas?: Json | null
          disc_result_id?: string | null
          edad?: number
          edad_max_busca?: number | null
          edad_min_busca?: number | null
          email?: string | null
          estado_cambiado_at?: string
          estado_cliente?: Database["public"]["Enums"]["estado_cliente"]
          estado_perfil?: string
          estatura?: number | null
          estilo_vestir?: string | null
          estilo_vestir_pareja?: string | null
          estilo_vida_activo?: number
          fin_de_semana?: string | null
          foto_url?: string | null
          genero?: string | null
          hijos?: string
          hobbies?: string | null
          id?: string
          ideologia?: string | null
          importa_politica?: boolean | null
          importa_religion?: boolean | null
          importa_vestir?: boolean | null
          necesidad_independencia?: number
          nivel_social?: number
          nombre_completo?: string
          notas_admin?: string | null
          peso?: number | null
          plan?: Database["public"]["Enums"]["plan_tipo"] | null
          plan_fin?: string | null
          plan_inicio?: string | null
          politica_pareja?: string | null
          relacion_sana?: string
          religion?: string | null
          religion_pareja?: string | null
          revisado?: boolean
          sentirse_querido?: string[] | null
          sesiones_contratadas?: number
          tabaco?: string
          tatuajes_pareja?: string | null
          telefono?: string | null
          tiene_tatuajes?: boolean | null
          tipo_relacion?: string
          ultimo_seguimiento_at?: string | null
          valores_importantes?: string[]
          vida_en_10_anios?: string
          video_presentacion_path?: string | null
          zona?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfiles_disc_result_id_fkey"
            columns: ["disc_result_id"]
            isOneToOne: false
            referencedRelation: "disc_results"
            referencedColumns: ["id"]
          },
        ]
      }
      sesiones: {
        Row: {
          created_at: string
          duracion_min: number
          estado: Database["public"]["Enums"]["sesion_estado"]
          fecha_hora: string
          id: string
          notas_brutas: string | null
          perfil_id: string
          resumen_estado: Database["public"]["Enums"]["resumen_estado"]
          resumen_ia: Json | null
          resumen_revisado_at: string | null
          tipo: Database["public"]["Enums"]["sesion_tipo"]
          video_path: string | null
        }
        Insert: {
          created_at?: string
          duracion_min?: number
          estado?: Database["public"]["Enums"]["sesion_estado"]
          fecha_hora: string
          id?: string
          notas_brutas?: string | null
          perfil_id: string
          resumen_estado?: Database["public"]["Enums"]["resumen_estado"]
          resumen_ia?: Json | null
          resumen_revisado_at?: string | null
          tipo?: Database["public"]["Enums"]["sesion_tipo"]
          video_path?: string | null
        }
        Update: {
          created_at?: string
          duracion_min?: number
          estado?: Database["public"]["Enums"]["sesion_estado"]
          fecha_hora?: string
          id?: string
          notas_brutas?: string | null
          perfil_id?: string
          resumen_estado?: Database["public"]["Enums"]["resumen_estado"]
          resumen_ia?: Json | null
          resumen_revisado_at?: string | null
          tipo?: Database["public"]["Enums"]["sesion_tipo"]
          video_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sesiones_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sesiones_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "v_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      tareas: {
        Row: {
          clave_unica: string | null
          completada_at: string | null
          created_at: string
          descripcion: string | null
          estado: Database["public"]["Enums"]["tarea_estado"]
          id: string
          match_id: string | null
          origen: Database["public"]["Enums"]["tarea_origen"]
          perfil_id: string
          tipo: Database["public"]["Enums"]["tarea_tipo"]
          titulo: string
          vence_at: string | null
        }
        Insert: {
          clave_unica?: string | null
          completada_at?: string | null
          created_at?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["tarea_estado"]
          id?: string
          match_id?: string | null
          origen?: Database["public"]["Enums"]["tarea_origen"]
          perfil_id: string
          tipo?: Database["public"]["Enums"]["tarea_tipo"]
          titulo: string
          vence_at?: string | null
        }
        Update: {
          clave_unica?: string | null
          completada_at?: string | null
          created_at?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["tarea_estado"]
          id?: string
          match_id?: string | null
          origen?: Database["public"]["Enums"]["tarea_origen"]
          perfil_id?: string
          tipo?: Database["public"]["Enums"]["tarea_tipo"]
          titulo?: string
          vence_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tareas_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "v_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      paid_users: {
        Row: {
          created_at: string | null
          email: string | null
          id: string | null
          nombre_completo: string | null
          notas: string | null
          plan: Database["public"]["Enums"]["plan_tipo"] | null
          telefono: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          nombre_completo?: string | null
          notas?: string | null
          plan?: Database["public"]["Enums"]["plan_tipo"] | null
          telefono?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          nombre_completo?: string | null
          notas?: string | null
          plan?: Database["public"]["Enums"]["plan_tipo"] | null
          telefono?: string | null
        }
        Relationships: []
      }
      v_automatizaciones: {
        Row: {
          clase: string | null
          clave: string | null
          match_id: string | null
          perfil_id: string | null
          severidad: string | null
          texto: string | null
          tipo: string | null
        }
        Relationships: []
      }
      v_clientes: {
        Row: {
          acepta_otras_zonas: boolean | null
          alcohol: string | null
          ambicion_profesional: number | null
          alertas_abiertas: number | null
          aprendizaje_ultima_relacion: string | null
          busca_genero: string | null
          ciudad: string | null
          conflicto: string[] | null
          created_at: string | null
          desea_casarse: string | null
          deseo_familia: number | null
          disc_perfil: string | null
          disc_respuestas: Json | null
          disc_result_id: string | null
          edad: number | null
          edad_max_busca: number | null
          edad_min_busca: number | null
          email: string | null
          estado_cambiado_at: string | null
          estado_cliente: Database["public"]["Enums"]["estado_cliente"] | null
          estado_perfil: string | null
          estatura: number | null
          estilo_vestir: string | null
          estilo_vestir_pareja: string | null
          estilo_vida_activo: number | null
          fin_de_semana: string | null
          foto_url: string | null
          genero: string | null
          hijos: string | null
          hobbies: string | null
          id: string | null
          ideologia: string | null
          importa_politica: boolean | null
          importa_religion: boolean | null
          importa_vestir: boolean | null
          necesidad_independencia: number | null
          nivel_social: number | null
          nombre_completo: string | null
          notas_admin: string | null
          peso: number | null
          plan: Database["public"]["Enums"]["plan_tipo"] | null
          plan_fin: string | null
          plan_inicio: string | null
          politica_pareja: string | null
          proxima_cita: string | null
          relacion_sana: string | null
          religion: string | null
          religion_pareja: string | null
          revisado: boolean | null
          sentirse_querido: string[] | null
          sesiones_contratadas: number | null
          sesiones_pendientes: number | null
          sesiones_realizadas: number | null
          sugerencias_pendientes: number | null
          tabaco: string | null
          tareas_pendientes: number | null
          tatuajes_pareja: string | null
          telefono: string | null
          tiene_tatuajes: boolean | null
          tipo_relacion: string | null
          ultimo_seguimiento_at: string | null
          valores_importantes: string[] | null
          vida_en_10_anios: string | null
          video_presentacion_path: string | null
          zona: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfiles_disc_result_id_fkey"
            columns: ["disc_result_id"]
            isOneToOne: false
            referencedRelation: "disc_results"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cambiar_estado_cliente: {
        Args: {
          _motivo?: string
          _nuevo_estado: Database["public"]["Enums"]["estado_cliente"]
          _perfil_id: string
        }
        Returns: undefined
      }
      estado_automatizaciones: {
        Args: never
        Returns: {
          activa: boolean
          detalle: string
          programacion: string
          resultado: string
          tarea: string
          ultima_ejecucion: string
        }[]
      }
      evaluar_automatizaciones: {
        Args: { _perfil_id?: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      registrar_auditoria: {
        Args: { _accion: string; _entidad: string; _entidad_id?: string }
        Returns: undefined
      }
    }
    Enums: {
      alerta_estado: "abierta" | "vista" | "resuelta"
      alerta_severidad: "info" | "aviso" | "urgente"
      alerta_tipo:
        | "informe_pendiente"
        | "feedback_pendiente"
        | "pocas_sesiones"
        | "plan_terminado"
        | "nuevo_compatible"
        | "sin_seguimiento"
        | "otra"
      app_role: "admin" | "user"
      estado_cliente: "activo" | "pausado" | "baja" | "finalizado"
      match_estado:
        | "propuesto"
        | "informe_enviado"
        | "cita_agendada"
        | "cita_realizada"
        | "feedback_registrado"
        | "continuan"
        | "cerrado"
      plan_tipo: "esencial" | "premium"
      resumen_estado: "sin_generar" | "borrador" | "revisado"
      sesion_estado: "programada" | "realizada" | "cancelada" | "no_asistio"
      sesion_tipo: "primera" | "seguimiento"
      sugerencia_estado: "pendiente" | "aceptada" | "rechazada" | "caducada"
      tarea_estado: "pendiente" | "completada" | "cancelada"
      tarea_origen: "auto" | "manual"
      tarea_tipo:
        | "enviar_informe"
        | "registrar_feedback"
        | "revisar_resumen"
        | "seguimiento"
        | "renovacion_plan"
        | "manual"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alerta_estado: ["abierta", "vista", "resuelta"],
      alerta_severidad: ["info", "aviso", "urgente"],
      alerta_tipo: [
        "informe_pendiente",
        "feedback_pendiente",
        "pocas_sesiones",
        "plan_terminado",
        "nuevo_compatible",
        "sin_seguimiento",
        "otra",
      ],
      app_role: ["admin", "user"],
      estado_cliente: ["activo", "pausado", "baja", "finalizado"],
      match_estado: [
        "propuesto",
        "informe_enviado",
        "cita_agendada",
        "cita_realizada",
        "feedback_registrado",
        "continuan",
        "cerrado",
      ],
      plan_tipo: ["esencial", "premium"],
      resumen_estado: ["sin_generar", "borrador", "revisado"],
      sesion_estado: ["programada", "realizada", "cancelada", "no_asistio"],
      sesion_tipo: ["primera", "seguimiento"],
      sugerencia_estado: ["pendiente", "aceptada", "rechazada", "caducada"],
      tarea_estado: ["pendiente", "completada", "cancelada"],
      tarea_origen: ["auto", "manual"],
      tarea_tipo: [
        "enviar_informe",
        "registrar_feedback",
        "revisar_resumen",
        "seguimiento",
        "renovacion_plan",
        "manual",
      ],
    },
  },
} as const
