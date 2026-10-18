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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      buyer_property_viewings: {
        Row: {
          agent_id: string | null
          buyer_id: string
          created_at: string
          feedback: string | null
          id: string
          property_id: string
          updated_at: string
          viewed_at: string
        }
        Insert: {
          agent_id?: string | null
          buyer_id: string
          created_at?: string
          feedback?: string | null
          id?: string
          property_id: string
          updated_at?: string
          viewed_at?: string
        }
        Update: {
          agent_id?: string | null
          buyer_id?: string
          created_at?: string
          feedback?: string | null
          id?: string
          property_id?: string
          updated_at?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_property_viewings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_property_viewings_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_property_viewings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      buyers: {
        Row: {
          claimed_at: string | null
          created_at: string
          created_by: string | null
          desired_city: string | null
          email: string | null
          equity: number | null
          floor_max: number | null
          floor_min: number | null
          full_name: string
          id: string
          lead_source: string | null
          max_budget: number | null
          min_rooms: number | null
          mortgage_approved: boolean
          needs_balcony: Database["public"]["Enums"]["requirement"]
          needs_elevator: Database["public"]["Enums"]["requirement"]
          needs_safe_room: Database["public"]["Enums"]["requirement"]
          notes: string | null
          owner_agent_id: string | null
          phone: string | null
          preferred_neighborhoods: string[]
          property_type: string | null
          sold_apartment: boolean
          status: Database["public"]["Enums"]["buyer_status"]
          updated_at: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          created_by?: string | null
          desired_city?: string | null
          email?: string | null
          equity?: number | null
          floor_max?: number | null
          floor_min?: number | null
          full_name: string
          id?: string
          lead_source?: string | null
          max_budget?: number | null
          min_rooms?: number | null
          mortgage_approved?: boolean
          needs_balcony?: Database["public"]["Enums"]["requirement"]
          needs_elevator?: Database["public"]["Enums"]["requirement"]
          needs_safe_room?: Database["public"]["Enums"]["requirement"]
          notes?: string | null
          owner_agent_id?: string | null
          phone?: string | null
          preferred_neighborhoods?: string[]
          property_type?: string | null
          sold_apartment?: boolean
          status?: Database["public"]["Enums"]["buyer_status"]
          updated_at?: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          created_by?: string | null
          desired_city?: string | null
          email?: string | null
          equity?: number | null
          floor_max?: number | null
          floor_min?: number | null
          full_name?: string
          id?: string
          lead_source?: string | null
          max_budget?: number | null
          min_rooms?: number | null
          mortgage_approved?: boolean
          needs_balcony?: Database["public"]["Enums"]["requirement"]
          needs_elevator?: Database["public"]["Enums"]["requirement"]
          needs_safe_room?: Database["public"]["Enums"]["requirement"]
          notes?: string | null
          owner_agent_id?: string | null
          phone?: string | null
          preferred_neighborhoods?: string[]
          property_type?: string | null
          sold_apartment?: boolean
          status?: Database["public"]["Enums"]["buyer_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyers_owner_agent_id_fkey"
            columns: ["owner_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          created_at: string
          cv_path: string | null
          email: string | null
          full_name: string
          id: string
          interview_summary: string | null
          phone: string | null
          source: string | null
          status: Database["public"]["Enums"]["candidate_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          cv_path?: string | null
          email?: string | null
          full_name: string
          id?: string
          interview_summary?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["candidate_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          cv_path?: string | null
          email?: string | null
          full_name?: string
          id?: string
          interview_summary?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["candidate_status"]
          updated_at?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          agent_amount: number | null
          agent_id: string
          agent_percent: number
          buyer_id: string | null
          closed_on: string
          commission_amount: number
          created_at: string
          created_by: string | null
          deal_price: number | null
          id: string
          notes: string | null
          office_amount: number | null
          property_id: string | null
          updated_at: string
        }
        Insert: {
          agent_amount?: number | null
          agent_id: string
          agent_percent: number
          buyer_id?: string | null
          closed_on?: string
          commission_amount: number
          created_at?: string
          created_by?: string | null
          deal_price?: number | null
          id?: string
          notes?: string | null
          office_amount?: number | null
          property_id?: string | null
          updated_at?: string
        }
        Update: {
          agent_amount?: number | null
          agent_id?: string
          agent_percent?: number
          buyer_id?: string | null
          closed_on?: string
          commission_amount?: number
          created_at?: string
          created_by?: string | null
          deal_price?: number | null
          id?: string
          notes?: string | null
          office_amount?: number | null
          property_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          agent_id: string | null
          amount: number
          buyer_id: string | null
          category: string
          created_at: string
          created_by: string | null
          deal_id: string | null
          id: string
          notes: string | null
          occurred_on: string
          property_id: string | null
          receipt_path: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          amount: number
          buyer_id?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          id?: string
          notes?: string | null
          occurred_on?: string
          property_id?: string | null
          receipt_path?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          amount?: number
          buyer_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          id?: string
          notes?: string | null
          occurred_on?: string
          property_id?: string | null
          receipt_path?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          kind: string
          link: string | null
          recipient_id: string
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind: string
          link?: string | null
          recipient_id: string
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          link?: string | null
          recipient_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          commission_split: number
          created_at: string
          email: string
          full_name: string
          id: string
          join_date: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          commission_split?: number
          created_at?: string
          email: string
          full_name?: string
          id: string
          join_date?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          commission_split?: number
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          join_date?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          apartment_number: string | null
          city: string
          created_at: string
          created_by: string | null
          current_price: number | null
          eviction_date: string | null
          exclusivity_end: string | null
          exclusivity_start: string | null
          floor: number | null
          has_balcony: boolean
          has_elevator: boolean
          has_safe_room: boolean
          has_storage: boolean
          house_number: string | null
          id: string
          image_paths: string[]
          is_exclusive: boolean
          is_renovated: boolean
          neighborhood: string | null
          parking_spots: number
          previous_price: number | null
          property_type: string | null
          recruiting_agent_id: string | null
          rooms: number | null
          size_sqm: number | null
          status: Database["public"]["Enums"]["property_status"]
          street: string | null
          total_floors: number | null
          updated_at: string
          virtual_tour_url: string | null
        }
        Insert: {
          apartment_number?: string | null
          city: string
          created_at?: string
          created_by?: string | null
          current_price?: number | null
          eviction_date?: string | null
          exclusivity_end?: string | null
          exclusivity_start?: string | null
          floor?: number | null
          has_balcony?: boolean
          has_elevator?: boolean
          has_safe_room?: boolean
          has_storage?: boolean
          house_number?: string | null
          id?: string
          image_paths?: string[]
          is_exclusive?: boolean
          is_renovated?: boolean
          neighborhood?: string | null
          parking_spots?: number
          previous_price?: number | null
          property_type?: string | null
          recruiting_agent_id?: string | null
          rooms?: number | null
          size_sqm?: number | null
          status?: Database["public"]["Enums"]["property_status"]
          street?: string | null
          total_floors?: number | null
          updated_at?: string
          virtual_tour_url?: string | null
        }
        Update: {
          apartment_number?: string | null
          city?: string
          created_at?: string
          created_by?: string | null
          current_price?: number | null
          eviction_date?: string | null
          exclusivity_end?: string | null
          exclusivity_start?: string | null
          floor?: number | null
          has_balcony?: boolean
          has_elevator?: boolean
          has_safe_room?: boolean
          has_storage?: boolean
          house_number?: string | null
          id?: string
          image_paths?: string[]
          is_exclusive?: boolean
          is_renovated?: boolean
          neighborhood?: string | null
          parking_spots?: number
          previous_price?: number | null
          property_type?: string | null
          recruiting_agent_id?: string | null
          rooms?: number | null
          size_sqm?: number | null
          status?: Database["public"]["Enums"]["property_status"]
          street?: string | null
          total_floors?: number | null
          updated_at?: string
          virtual_tour_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_recruiting_agent_id_fkey"
            columns: ["recruiting_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      property_owner_details: {
        Row: {
          created_at: string
          notes: string | null
          owner_name: string | null
          owner_phone: string | null
          property_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          notes?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          property_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          notes?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          property_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_owner_details_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          buyer_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          done_at: string | null
          due_at: string | null
          id: string
          is_done: boolean
          property_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          buyer_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          done_at?: string | null
          due_at?: string | null
          id?: string
          is_done?: boolean
          property_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          buyer_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          done_at?: string | null
          due_at?: string | null
          id?: string
          is_done?: boolean
          property_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      can_manage_property: { Args: { p_property_id: string }; Returns: boolean }
      find_buyers_by_phone: {
        Args: { p_exclude?: string; p_phone: string }
        Returns: {
          full_name: string
          id: string
          owner_agent_id: string
          status: Database["public"]["Enums"]["buyer_status"]
        }[]
      }
      global_search: {
        Args: { max_results?: number; q: string }
        Returns: {
          entity: string
          id: string
          subtitle: string
          title: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_system: { Args: never; Returns: boolean }
      phone_key: { Args: { p: string }; Returns: string }
    }
    Enums: {
      buyer_status:
        | "new"
        | "hot"
        | "warm"
        | "bought_with_us"
        | "bought_elsewhere"
        | "irrelevant"
      candidate_status:
        | "new"
        | "interview_scheduled"
        | "passed_first"
        | "hired"
        | "rejected"
      property_status: "active" | "frozen" | "sold"
      requirement: "must" | "nice" | "any"
      transaction_type: "income" | "expense"
      user_role: "agent" | "admin"
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
      buyer_status: [
        "new",
        "hot",
        "warm",
        "bought_with_us",
        "bought_elsewhere",
        "irrelevant",
      ],
      candidate_status: [
        "new",
        "interview_scheduled",
        "passed_first",
        "hired",
        "rejected",
      ],
      property_status: ["active", "frozen", "sold"],
      requirement: ["must", "nice", "any"],
      transaction_type: ["income", "expense"],
      user_role: ["agent", "admin"],
    },
  },
} as const
