export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      guests: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          created_at: string
          first_name: string | null
          general_notes: string | null
          id: string
          phone: string | null
          postal_code: number | null
          state: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          created_at?: string
          first_name?: string | null
          general_notes?: string | null
          id?: string
          phone?: string | null
          postal_code?: number | null
          state?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          created_at?: string
          first_name?: string | null
          general_notes?: string | null
          id?: string
          phone?: string | null
          postal_code?: number | null
          state?: string | null
        }
        Relationships: []
      }
      line_items: {
        Row: {
          created_at: string
          id: string
          name: string | null
          prep_notes: string | null
          quantity: number | null
          subitems: Json | null
          total_price_per_item: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          prep_notes?: string | null
          quantity?: number | null
          subitems?: Json | null
          total_price_per_item?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          prep_notes?: string | null
          quantity?: number | null
          subitems?: Json | null
          total_price_per_item?: number | null
          unit_price?: number | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          discount_code: string | null
          discount_pct: string | null
          discount_total: number | null
          fulfillment_type: string | null
          guest_id: string | null
          id: string
          is_visible: boolean | null
          items_snapshot: Json | null
          local_fee: number | null
          order_notes: string | null
          order_number: string | null
          payment_breakdown: Json | null
          payment_status: string | null
          restaurant_id: string | null
          stripe_fee: number | null
          stripe_link_id: string | null
          stripe_payment_link: string | null
          subtotal: number | null
          tax: number | null
          tip: number | null
          total: number | null
        }
        Insert: {
          created_at?: string
          discount_code?: string | null
          discount_pct?: string | null
          discount_total?: number | null
          fulfillment_type?: string | null
          guest_id?: string | null
          id?: string
          is_visible?: boolean | null
          items_snapshot?: Json | null
          local_fee?: number | null
          order_notes?: string | null
          order_number?: string | null
          payment_breakdown?: Json | null
          payment_status?: string | null
          restaurant_id?: string | null
          stripe_fee?: number | null
          stripe_link_id?: string | null
          stripe_payment_link?: string | null
          subtotal?: number | null
          tax?: number | null
          tip?: number | null
          total?: number | null
        }
        Update: {
          created_at?: string
          discount_code?: string | null
          discount_pct?: string | null
          discount_total?: number | null
          fulfillment_type?: string | null
          guest_id?: string | null
          id?: string
          is_visible?: boolean | null
          items_snapshot?: Json | null
          local_fee?: number | null
          order_notes?: string | null
          order_number?: string | null
          payment_breakdown?: Json | null
          payment_status?: string | null
          restaurant_id?: string | null
          stripe_fee?: number | null
          stripe_link_id?: string | null
          stripe_payment_link?: string | null
          subtotal?: number | null
          tax?: number | null
          tip?: number | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          created_at: string
          email: string | null
          hours: Json | null
          id: string
          manager_email: string | null
          manager_phone: string | null
          name: string | null
          notes: string | null
          owner_clerk_id: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          hours?: Json | null
          id?: string
          manager_email?: string | null
          manager_phone?: string | null
          name?: string | null
          notes?: string | null
          owner_clerk_id?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          hours?: Json | null
          id?: string
          manager_email?: string | null
          manager_phone?: string | null
          name?: string | null
          notes?: string | null
          owner_clerk_id?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_owner_clerk_id_fkey"
            columns: ["owner_clerk_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      todos: {
        Row: {
          created_at: string
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          clerk_email: string | null
          clerk_id: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          role: string | null
        }
        Insert: {
          clerk_email?: string | null
          clerk_id?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: string | null
        }
        Update: {
          clerk_email?: string | null
          clerk_id?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

