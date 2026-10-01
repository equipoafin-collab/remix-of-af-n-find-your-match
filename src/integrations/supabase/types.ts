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
      auditoria: {
        Row: {
          accion: string
          created_at: string
          entidad: string
          entidad_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          accion: string
          created_at?: string
          entidad: string
          entidad_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          accion?: string
          created_at?: string
          entidad?: string
          entidad_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
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
      paid_users: {
        Row: {
          created_at: string
          email: string
          id: string
          nombre_completo: string
          notas: string | null
          plan: string
          telefono: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          nombre_completo: string
          notas?: string | null
          plan: string
          telefono?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nombre_completo?: string
          notas?: string | null
          plan?: string
          telefono?: string | null
        }
        Relationships: []
      }
      perfiles: {
        Row: {
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
          edad: number
          edad_max_busca: number | null
          edad_min_busca: number | null
          email: string | null
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
          politica_pareja: string | null
          relacion_sana: string
          religion: string | null
          religion_pareja: string | null
          sentirse_querido: string[] | null
          tabaco: string
          tatuajes_pareja: string | null
          telefono: string | null
          tiene_tatuajes: boolean | null
          tipo_relacion: string
          vida_en_10_anios: string
        }
        Insert: {
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
          edad: number
          edad_max_busca?: number | null
          edad_min_busca?: number | null
          email?: string | null
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
          politica_pareja?: string | null
          relacion_sana: string
          religion?: string | null
          religion_pareja?: string | null
          sentirse_querido?: string[] | null
          tabaco: string
          tatuajes_pareja?: string | null
          telefono?: string | null
          tiene_tatuajes?: boolean | null
          tipo_relacion: string
          vida_en_10_anios: string
        }
        Update: {
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
          edad?: number
          edad_max_busca?: number | null
          edad_min_busca?: number | null
          email?: string | null
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
          politica_pareja?: string | null
          relacion_sana?: string
          religion?: string | null
          religion_pareja?: string | null
          sentirse_querido?: string[] | null
          tabaco?: string
          tatuajes_pareja?: string | null
          telefono?: string | null
          tiene_tatuajes?: boolean | null
          tipo_relacion?: string
          vida_en_10_anios?: string
        }
        Relationships: []
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
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      registrar_auditoria: {
        Args: {
          _accion: string
          _entidad: string
          _entidad_id?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
