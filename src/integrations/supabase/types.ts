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
      adverse_reactions: {
        Row: {
          actions_taken: string | null
          blood_unit_id: string | null
          created_at: string
          id: string
          notivisa_sent: boolean
          onset_minutes: number | null
          outcome: string | null
          patient_id: string
          reaction_type: Database["public"]["Enums"]["reaction_type"]
          reported_by: string | null
          severity: Database["public"]["Enums"]["reaction_severity"]
          symptoms: string | null
          transfusion_id: string | null
          transfusion_suspended: boolean
          volume_at_reaction_ml: number | null
        }
        Insert: {
          actions_taken?: string | null
          blood_unit_id?: string | null
          created_at?: string
          id?: string
          notivisa_sent?: boolean
          onset_minutes?: number | null
          outcome?: string | null
          patient_id: string
          reaction_type: Database["public"]["Enums"]["reaction_type"]
          reported_by?: string | null
          severity: Database["public"]["Enums"]["reaction_severity"]
          symptoms?: string | null
          transfusion_id?: string | null
          transfusion_suspended?: boolean
          volume_at_reaction_ml?: number | null
        }
        Update: {
          actions_taken?: string | null
          blood_unit_id?: string | null
          created_at?: string
          id?: string
          notivisa_sent?: boolean
          onset_minutes?: number | null
          outcome?: string | null
          patient_id?: string
          reaction_type?: Database["public"]["Enums"]["reaction_type"]
          reported_by?: string | null
          severity?: Database["public"]["Enums"]["reaction_severity"]
          symptoms?: string | null
          transfusion_id?: string | null
          transfusion_suspended?: boolean
          volume_at_reaction_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "adverse_reactions_blood_unit_id_fkey"
            columns: ["blood_unit_id"]
            isOneToOne: false
            referencedRelation: "blood_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adverse_reactions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adverse_reactions_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adverse_reactions_transfusion_id_fkey"
            columns: ["transfusion_id"]
            isOneToOne: false
            referencedRelation: "transfusions"
            referencedColumns: ["id"]
          },
        ]
      }
      blood_units: {
        Row: {
          bag_number: string
          blood_type: Database["public"]["Enums"]["blood_type"]
          cmv_negative: boolean
          component_type: Database["public"]["Enums"]["component_type"]
          created_at: string
          discard_reason: string | null
          discarded_at: string | null
          donation_number: string | null
          expiration_date: string
          filtered: boolean
          id: string
          irradiated: boolean
          location: string | null
          phenotyped: boolean
          received_at: string
          received_by: string | null
          status: Database["public"]["Enums"]["unit_status"]
          updated_at: string
          volume_ml: number
        }
        Insert: {
          bag_number: string
          blood_type: Database["public"]["Enums"]["blood_type"]
          cmv_negative?: boolean
          component_type: Database["public"]["Enums"]["component_type"]
          created_at?: string
          discard_reason?: string | null
          discarded_at?: string | null
          donation_number?: string | null
          expiration_date: string
          filtered?: boolean
          id?: string
          irradiated?: boolean
          location?: string | null
          phenotyped?: boolean
          received_at?: string
          received_by?: string | null
          status?: Database["public"]["Enums"]["unit_status"]
          updated_at?: string
          volume_ml: number
        }
        Update: {
          bag_number?: string
          blood_type?: Database["public"]["Enums"]["blood_type"]
          cmv_negative?: boolean
          component_type?: Database["public"]["Enums"]["component_type"]
          created_at?: string
          discard_reason?: string | null
          discarded_at?: string | null
          donation_number?: string | null
          expiration_date?: string
          filtered?: boolean
          id?: string
          irradiated?: boolean
          location?: string | null
          phenotyped?: boolean
          received_at?: string
          received_by?: string | null
          status?: Database["public"]["Enums"]["unit_status"]
          updated_at?: string
          volume_ml?: number
        }
        Relationships: [
          {
            foreignKeyName: "blood_units_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dispensations: {
        Row: {
          blood_unit_id: string
          created_at: string
          dispensed_at: string
          dispensed_by: string | null
          id: string
          received_by_name: string | null
          request_id: string
          ward: string | null
        }
        Insert: {
          blood_unit_id: string
          created_at?: string
          dispensed_at?: string
          dispensed_by?: string | null
          id?: string
          received_by_name?: string | null
          request_id: string
          ward?: string | null
        }
        Update: {
          blood_unit_id?: string
          created_at?: string
          dispensed_at?: string
          dispensed_by?: string | null
          id?: string
          received_by_name?: string | null
          request_id?: string
          ward?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispensations_blood_unit_id_fkey"
            columns: ["blood_unit_id"]
            isOneToOne: false
            referencedRelation: "blood_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispensations_dispensed_by_fkey"
            columns: ["dispensed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispensations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "transfusion_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read_at: string | null
          related_id: string | null
          severity: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          related_id?: string | null
          severity?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          related_id?: string | null
          severity?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          alerts: string | null
          birth_date: string | null
          blood_type: Database["public"]["Enums"]["blood_type"]
          blood_type_confirmed: boolean
          cmv_negative_required: boolean
          cpf: string | null
          created_at: string
          full_name: string
          id: string
          irradiation_required: boolean
          mrn: string
          pai_antibodies: string | null
          pai_status: Database["public"]["Enums"]["pai_status"] | null
          updated_at: string
        }
        Insert: {
          alerts?: string | null
          birth_date?: string | null
          blood_type?: Database["public"]["Enums"]["blood_type"]
          blood_type_confirmed?: boolean
          cmv_negative_required?: boolean
          cpf?: string | null
          created_at?: string
          full_name: string
          id?: string
          irradiation_required?: boolean
          mrn: string
          pai_antibodies?: string | null
          pai_status?: Database["public"]["Enums"]["pai_status"] | null
          updated_at?: string
        }
        Update: {
          alerts?: string | null
          birth_date?: string | null
          blood_type?: Database["public"]["Enums"]["blood_type"]
          blood_type_confirmed?: boolean
          cmv_negative_required?: boolean
          cpf?: string | null
          created_at?: string
          full_name?: string
          id?: string
          irradiation_required?: boolean
          mrn?: string
          pai_antibodies?: string | null
          pai_status?: Database["public"]["Enums"]["pai_status"] | null
          updated_at?: string
        }
        Relationships: []
      }
      pre_transfusion_tests: {
        Row: {
          blood_unit_id: string | null
          created_at: string
          crossmatch_method:
            | Database["public"]["Enums"]["crossmatch_method"]
            | null
          crossmatch_result:
            | Database["public"]["Enums"]["crossmatch_result"]
            | null
          donor_abo: string | null
          donor_rh: string | null
          id: string
          pai_details: string | null
          pai_result: Database["public"]["Enums"]["pai_status"] | null
          performed_by: string | null
          recipient_abo: string | null
          recipient_rh: string | null
          request_id: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          blood_unit_id?: string | null
          created_at?: string
          crossmatch_method?:
            | Database["public"]["Enums"]["crossmatch_method"]
            | null
          crossmatch_result?:
            | Database["public"]["Enums"]["crossmatch_result"]
            | null
          donor_abo?: string | null
          donor_rh?: string | null
          id?: string
          pai_details?: string | null
          pai_result?: Database["public"]["Enums"]["pai_status"] | null
          performed_by?: string | null
          recipient_abo?: string | null
          recipient_rh?: string | null
          request_id: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          blood_unit_id?: string | null
          created_at?: string
          crossmatch_method?:
            | Database["public"]["Enums"]["crossmatch_method"]
            | null
          crossmatch_result?:
            | Database["public"]["Enums"]["crossmatch_result"]
            | null
          donor_abo?: string | null
          donor_rh?: string | null
          id?: string
          pai_details?: string | null
          pai_result?: Database["public"]["Enums"]["pai_status"] | null
          performed_by?: string | null
          recipient_abo?: string | null
          recipient_rh?: string | null
          request_id?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pre_transfusion_tests_blood_unit_id_fkey"
            columns: ["blood_unit_id"]
            isOneToOne: false
            referencedRelation: "blood_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_transfusion_tests_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_transfusion_tests_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "transfusion_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_transfusion_tests_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      transfusion_requests: {
        Row: {
          clinical_indication: string
          component_type: Database["public"]["Enums"]["component_type"]
          created_at: string
          current_hematocrit: number | null
          current_hemoglobin: number | null
          diagnosis: string
          emergency_justification: string | null
          id: string
          patient_id: string
          quantity: number
          requesting_physician_id: string | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
          urgency: Database["public"]["Enums"]["urgency"]
        }
        Insert: {
          clinical_indication: string
          component_type: Database["public"]["Enums"]["component_type"]
          created_at?: string
          current_hematocrit?: number | null
          current_hemoglobin?: number | null
          diagnosis: string
          emergency_justification?: string | null
          id?: string
          patient_id: string
          quantity?: number
          requesting_physician_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency"]
        }
        Update: {
          clinical_indication?: string
          component_type?: Database["public"]["Enums"]["component_type"]
          created_at?: string
          current_hematocrit?: number | null
          current_hemoglobin?: number | null
          diagnosis?: string
          emergency_justification?: string | null
          id?: string
          patient_id?: string
          quantity?: number
          requesting_physician_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency"]
        }
        Relationships: [
          {
            foreignKeyName: "transfusion_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfusion_requests_requesting_physician_id_fkey"
            columns: ["requesting_physician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transfusions: {
        Row: {
          access_route: string | null
          blood_unit_id: string
          completed: boolean
          created_at: string
          dispensation_id: string | null
          finished_at: string | null
          id: string
          notes: string | null
          nurse_id: string | null
          patient_id: string
          post_vital_signs: Json | null
          pre_vital_signs: Json | null
          started_at: string
          updated_at: string
          volume_transfused_ml: number | null
        }
        Insert: {
          access_route?: string | null
          blood_unit_id: string
          completed?: boolean
          created_at?: string
          dispensation_id?: string | null
          finished_at?: string | null
          id?: string
          notes?: string | null
          nurse_id?: string | null
          patient_id: string
          post_vital_signs?: Json | null
          pre_vital_signs?: Json | null
          started_at?: string
          updated_at?: string
          volume_transfused_ml?: number | null
        }
        Update: {
          access_route?: string | null
          blood_unit_id?: string
          completed?: boolean
          created_at?: string
          dispensation_id?: string | null
          finished_at?: string | null
          id?: string
          notes?: string | null
          nurse_id?: string | null
          patient_id?: string
          post_vital_signs?: Json | null
          pre_vital_signs?: Json | null
          started_at?: string
          updated_at?: string
          volume_transfused_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transfusions_blood_unit_id_fkey"
            columns: ["blood_unit_id"]
            isOneToOne: false
            referencedRelation: "blood_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfusions_dispensation_id_fkey"
            columns: ["dispensation_id"]
            isOneToOne: false
            referencedRelation: "dispensations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfusions_nurse_id_fkey"
            columns: ["nurse_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfusions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_member: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "hemoterapeuta"
        | "biomedico"
        | "tecnico"
        | "enfermeiro"
        | "medico"
        | "gestor"
      blood_type:
        | "O_NEG"
        | "O_POS"
        | "A_NEG"
        | "A_POS"
        | "B_NEG"
        | "B_POS"
        | "AB_NEG"
        | "AB_POS"
        | "NAO_TIPADO"
      component_type:
        | "CH"
        | "CP"
        | "PFC"
        | "CRIO"
        | "GV"
        | "CH_IRR"
        | "CH_LAV"
        | "CH_FIL"
      crossmatch_method: "gel" | "tubo" | "microplaca" | "eletronico"
      crossmatch_result: "compativel" | "incompativel" | "pendente"
      pai_status: "negativo" | "positivo" | "pendente"
      reaction_severity: "leve" | "moderada" | "grave" | "fatal"
      reaction_type:
        | "hemolitica_aguda"
        | "hemolitica_tardia"
        | "febril_nao_hemolitica"
        | "alergica_leve"
        | "alergica_grave"
        | "trali"
        | "taco"
        | "septica"
        | "outra"
      request_status:
        | "pendente"
        | "em_analise"
        | "aguardando_amostra"
        | "pronto_dispensar"
        | "dispensado"
        | "transfundido"
        | "cancelado"
      unit_status:
        | "disponivel"
        | "reservado"
        | "dispensado"
        | "transfundido"
        | "descartado"
        | "vencido"
      urgency: "rotina" | "urgencia" | "emergencia"
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
      app_role: [
        "hemoterapeuta",
        "biomedico",
        "tecnico",
        "enfermeiro",
        "medico",
        "gestor",
      ],
      blood_type: [
        "O_NEG",
        "O_POS",
        "A_NEG",
        "A_POS",
        "B_NEG",
        "B_POS",
        "AB_NEG",
        "AB_POS",
        "NAO_TIPADO",
      ],
      component_type: [
        "CH",
        "CP",
        "PFC",
        "CRIO",
        "GV",
        "CH_IRR",
        "CH_LAV",
        "CH_FIL",
      ],
      crossmatch_method: ["gel", "tubo", "microplaca", "eletronico"],
      crossmatch_result: ["compativel", "incompativel", "pendente"],
      pai_status: ["negativo", "positivo", "pendente"],
      reaction_severity: ["leve", "moderada", "grave", "fatal"],
      reaction_type: [
        "hemolitica_aguda",
        "hemolitica_tardia",
        "febril_nao_hemolitica",
        "alergica_leve",
        "alergica_grave",
        "trali",
        "taco",
        "septica",
        "outra",
      ],
      request_status: [
        "pendente",
        "em_analise",
        "aguardando_amostra",
        "pronto_dispensar",
        "dispensado",
        "transfundido",
        "cancelado",
      ],
      unit_status: [
        "disponivel",
        "reservado",
        "dispensado",
        "transfundido",
        "descartado",
        "vencido",
      ],
      urgency: ["rotina", "urgencia", "emergencia"],
    },
  },
} as const
