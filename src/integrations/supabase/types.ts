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
          actions_taken: Json | null
          attending_physician: string | null
          blood_unit_id: string | null
          clinical_evolution: string | null
          closed_at: string | null
          closed_by: string | null
          created_at: string
          final_classification:
            | Database["public"]["Enums"]["reaction_type"]
            | null
          hemoterapeuta_conclusion: string | null
          hemoterapeuta_crm: string | null
          hemoterapeuta_name: string | null
          hemoterapeuta_notified_at: string | null
          id: string
          lab_results: Json | null
          notification_datetime: string
          notifying_nurse: string | null
          notifying_unit: string | null
          notivisa_protocol: string | null
          notivisa_sent: boolean
          outcome: string | null
          patient_id: string
          reaction_started_at: string | null
          reaction_type: Database["public"]["Enums"]["reaction_type"]
          recommendations: string | null
          reported_by: string | null
          severity: Database["public"]["Enums"]["reaction_severity"]
          status: string
          symptoms: Json | null
          transfusion_id: string | null
          volume_until_reaction_ml: number | null
        }
        Insert: {
          actions_taken?: Json | null
          attending_physician?: string | null
          blood_unit_id?: string | null
          clinical_evolution?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          final_classification?:
            | Database["public"]["Enums"]["reaction_type"]
            | null
          hemoterapeuta_conclusion?: string | null
          hemoterapeuta_crm?: string | null
          hemoterapeuta_name?: string | null
          hemoterapeuta_notified_at?: string | null
          id?: string
          lab_results?: Json | null
          notification_datetime?: string
          notifying_nurse?: string | null
          notifying_unit?: string | null
          notivisa_protocol?: string | null
          notivisa_sent?: boolean
          outcome?: string | null
          patient_id: string
          reaction_started_at?: string | null
          reaction_type: Database["public"]["Enums"]["reaction_type"]
          recommendations?: string | null
          reported_by?: string | null
          severity: Database["public"]["Enums"]["reaction_severity"]
          status?: string
          symptoms?: Json | null
          transfusion_id?: string | null
          volume_until_reaction_ml?: number | null
        }
        Update: {
          actions_taken?: Json | null
          attending_physician?: string | null
          blood_unit_id?: string | null
          clinical_evolution?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          final_classification?:
            | Database["public"]["Enums"]["reaction_type"]
            | null
          hemoterapeuta_conclusion?: string | null
          hemoterapeuta_crm?: string | null
          hemoterapeuta_name?: string | null
          hemoterapeuta_notified_at?: string | null
          id?: string
          lab_results?: Json | null
          notification_datetime?: string
          notifying_nurse?: string | null
          notifying_unit?: string | null
          notivisa_protocol?: string | null
          notivisa_sent?: boolean
          outcome?: string | null
          patient_id?: string
          reaction_started_at?: string | null
          reaction_type?: Database["public"]["Enums"]["reaction_type"]
          recommendations?: string | null
          reported_by?: string | null
          severity?: Database["public"]["Enums"]["reaction_severity"]
          status?: string
          symptoms?: Json | null
          transfusion_id?: string | null
          volume_until_reaction_ml?: number | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          id: number
          new_data: Json | null
          old_data: Json | null
          performed_at: string
          performed_by: string | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          performed_at?: string
          performed_by?: string | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          performed_at?: string
          performed_by?: string | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
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
        Relationships: []
      }
      dispensations: {
        Row: {
          bag_confirmed: boolean
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
          bag_confirmed?: boolean
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
          bag_confirmed?: boolean
          blood_unit_id?: string
          created_at?: string
          dispensed_at?: string
          dispensed_by?: string | null
          id?: string
          received_by_name?: string | null
          request_id?: string
          ward?: string | null
        }
        Relationships: []
      }
      his_lis_events: {
        Row: {
          created_at: string
          direction: Database["public"]["Enums"]["integration_direction"]
          endpoint: string | null
          id: string
          integration_type: Database["public"]["Enums"]["integration_type"]
          payload: Json | null
          response: Json | null
          status: Database["public"]["Enums"]["integration_status"]
        }
        Insert: {
          created_at?: string
          direction: Database["public"]["Enums"]["integration_direction"]
          endpoint?: string | null
          id?: string
          integration_type: Database["public"]["Enums"]["integration_type"]
          payload?: Json | null
          response?: Json | null
          status: Database["public"]["Enums"]["integration_status"]
        }
        Update: {
          created_at?: string
          direction?: Database["public"]["Enums"]["integration_direction"]
          endpoint?: string | null
          id?: string
          integration_type?: Database["public"]["Enums"]["integration_type"]
          payload?: Json | null
          response?: Json | null
          status?: Database["public"]["Enums"]["integration_status"]
        }
        Relationships: []
      }
      integration_settings: {
        Row: {
          auth_token: string | null
          endpoint_url: string | null
          features: Json
          field_mapping: Json
          id: string
          kind: string
          system_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auth_token?: string | null
          endpoint_url?: string | null
          features?: Json
          field_mapping?: Json
          id?: string
          kind: string
          system_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auth_token?: string | null
          endpoint_url?: string | null
          features?: Json
          field_mapping?: Json
          id?: string
          kind?: string
          system_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
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
          checklist: Json | null
          created_at: string
          crossmatch_method:
            | Database["public"]["Enums"]["crossmatch_method"]
            | null
          crossmatch_notes: string | null
          crossmatch_result:
            | Database["public"]["Enums"]["crossmatch_result"]
            | null
          donor_abo: string | null
          donor_rh: string | null
          id: string
          pai_antibody_identified: string | null
          pai_result: Database["public"]["Enums"]["pai_result"] | null
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
          checklist?: Json | null
          created_at?: string
          crossmatch_method?:
            | Database["public"]["Enums"]["crossmatch_method"]
            | null
          crossmatch_notes?: string | null
          crossmatch_result?:
            | Database["public"]["Enums"]["crossmatch_result"]
            | null
          donor_abo?: string | null
          donor_rh?: string | null
          id?: string
          pai_antibody_identified?: string | null
          pai_result?: Database["public"]["Enums"]["pai_result"] | null
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
          checklist?: Json | null
          created_at?: string
          crossmatch_method?:
            | Database["public"]["Enums"]["crossmatch_method"]
            | null
          crossmatch_notes?: string | null
          crossmatch_result?:
            | Database["public"]["Enums"]["crossmatch_result"]
            | null
          donor_abo?: string | null
          donor_rh?: string | null
          id?: string
          pai_antibody_identified?: string | null
          pai_result?: Database["public"]["Enums"]["pai_result"] | null
          performed_by?: string | null
          recipient_abo?: string | null
          recipient_rh?: string | null
          request_id?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          registro_profissional: string | null
          setor: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          full_name?: string
          id: string
          registro_profissional?: string | null
          setor?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          registro_profissional?: string | null
          setor?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      surgical_reservations: {
        Row: {
          anesthesiologist_notes: string | null
          created_at: string
          created_by: string | null
          id: string
          patient_id: string
          reserved_units: Json | null
          status: Database["public"]["Enums"]["surgical_reservation_status"]
          surgeon_name: string | null
          surgery_date: string
          surgery_type: string | null
          updated_at: string
        }
        Insert: {
          anesthesiologist_notes?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          patient_id: string
          reserved_units?: Json | null
          status?: Database["public"]["Enums"]["surgical_reservation_status"]
          surgeon_name?: string | null
          surgery_date: string
          surgery_type?: string | null
          updated_at?: string
        }
        Update: {
          anesthesiologist_notes?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          patient_id?: string
          reserved_units?: Json | null
          status?: Database["public"]["Enums"]["surgical_reservation_status"]
          surgeon_name?: string | null
          surgery_date?: string
          surgery_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transfusion_requests: {
        Row: {
          clinical_indication: string
          component_type: Database["public"]["Enums"]["component_type"]
          created_at: string
          current_hb: number | null
          current_ht: number | null
          diagnosis: string
          emergency_justification: string | null
          his_integration_id: string | null
          id: string
          patient_id: string
          platelet_count: number | null
          quantity: number
          requesting_physician_id: string | null
          special_requirements: Json | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
          urgency: Database["public"]["Enums"]["urgency"]
        }
        Insert: {
          clinical_indication: string
          component_type: Database["public"]["Enums"]["component_type"]
          created_at?: string
          current_hb?: number | null
          current_ht?: number | null
          diagnosis: string
          emergency_justification?: string | null
          his_integration_id?: string | null
          id?: string
          patient_id: string
          platelet_count?: number | null
          quantity?: number
          requesting_physician_id?: string | null
          special_requirements?: Json | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency"]
        }
        Update: {
          clinical_indication?: string
          component_type?: Database["public"]["Enums"]["component_type"]
          created_at?: string
          current_hb?: number | null
          current_ht?: number | null
          diagnosis?: string
          emergency_justification?: string | null
          his_integration_id?: string | null
          id?: string
          patient_id?: string
          platelet_count?: number | null
          quantity?: number
          requesting_physician_id?: string | null
          special_requirements?: Json | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency"]
        }
        Relationships: []
      }
      transfusions: {
        Row: {
          access_route: string | null
          at_technician_id: string | null
          bag_destination: string | null
          blood_unit_id: string
          completed: boolean
          created_at: string
          dispensation_id: string | null
          finished_at: string | null
          his_sync_at: string | null
          id: string
          intercurrence: boolean
          intercurrence_description: string | null
          nurse_id: string | null
          patient_id: string
          started_at: string
          transfusion_suspended: boolean
          updated_at: string
          vital_signs: Json | null
          volume_transfused_ml: number | null
        }
        Insert: {
          access_route?: string | null
          at_technician_id?: string | null
          bag_destination?: string | null
          blood_unit_id: string
          completed?: boolean
          created_at?: string
          dispensation_id?: string | null
          finished_at?: string | null
          his_sync_at?: string | null
          id?: string
          intercurrence?: boolean
          intercurrence_description?: string | null
          nurse_id?: string | null
          patient_id: string
          started_at?: string
          transfusion_suspended?: boolean
          updated_at?: string
          vital_signs?: Json | null
          volume_transfused_ml?: number | null
        }
        Update: {
          access_route?: string | null
          at_technician_id?: string | null
          bag_destination?: string | null
          blood_unit_id?: string
          completed?: boolean
          created_at?: string
          dispensation_id?: string | null
          finished_at?: string | null
          his_sync_at?: string | null
          id?: string
          intercurrence?: boolean
          intercurrence_description?: string | null
          nurse_id?: string | null
          patient_id?: string
          started_at?: string
          transfusion_suspended?: boolean
          updated_at?: string
          vital_signs?: Json | null
          volume_transfused_ml?: number | null
        }
        Relationships: []
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
        | "A_POS"
        | "A_NEG"
        | "B_POS"
        | "B_NEG"
        | "AB_POS"
        | "AB_NEG"
        | "O_POS"
        | "O_NEG"
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
      crossmatch_result: "compativel" | "incompativel" | "nao_realizado"
      integration_direction: "send" | "receive"
      integration_status: "success" | "error"
      integration_type: "HIS" | "LIS"
      pai_result: "negativo" | "positivo" | "em_andamento"
      pai_status: "negativo" | "positivo" | "pendente"
      reaction_severity: "leve" | "moderada" | "grave" | "fatal"
      reaction_type:
        | "rfnh"
        | "alergica_leve"
        | "alergica_grave"
        | "hemolitica_aguda"
        | "hemolitica_tardia"
        | "trali"
        | "taco"
        | "bacteriana"
        | "hipotensao"
        | "outra"
        | "anafilaxia"
        | "hipotensao_bradicinina"
      request_status:
        | "pendente"
        | "em_analise"
        | "aguardando_amostra"
        | "testes_em_andamento"
        | "pronto_dispensar"
        | "dispensado"
        | "transfundindo"
        | "concluido"
        | "cancelado"
      surgical_reservation_status:
        | "reservado"
        | "confirmado"
        | "cancelado"
        | "realizado"
      unit_status:
        | "disponivel"
        | "reservado"
        | "dispensado"
        | "transfundido"
        | "descartado"
        | "vencido"
      urgency: "rotina" | "urgencia" | "emergencia" | "emergencia_absoluta"
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
        "A_POS",
        "A_NEG",
        "B_POS",
        "B_NEG",
        "AB_POS",
        "AB_NEG",
        "O_POS",
        "O_NEG",
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
      crossmatch_result: ["compativel", "incompativel", "nao_realizado"],
      integration_direction: ["send", "receive"],
      integration_status: ["success", "error"],
      integration_type: ["HIS", "LIS"],
      pai_result: ["negativo", "positivo", "em_andamento"],
      pai_status: ["negativo", "positivo", "pendente"],
      reaction_severity: ["leve", "moderada", "grave", "fatal"],
      reaction_type: [
        "rfnh",
        "alergica_leve",
        "alergica_grave",
        "hemolitica_aguda",
        "hemolitica_tardia",
        "trali",
        "taco",
        "bacteriana",
        "hipotensao",
        "outra",
        "anafilaxia",
        "hipotensao_bradicinina",
      ],
      request_status: [
        "pendente",
        "em_analise",
        "aguardando_amostra",
        "testes_em_andamento",
        "pronto_dispensar",
        "dispensado",
        "transfundindo",
        "concluido",
        "cancelado",
      ],
      surgical_reservation_status: [
        "reservado",
        "confirmado",
        "cancelado",
        "realizado",
      ],
      unit_status: [
        "disponivel",
        "reservado",
        "dispensado",
        "transfundido",
        "descartado",
        "vencido",
      ],
      urgency: ["rotina", "urgencia", "emergencia", "emergencia_absoluta"],
    },
  },
} as const
