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
      admin_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          read_at?: string | null
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
        }
        Relationships: []
      }
      admin_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          email: string
          full_name: string | null
          id: string
          reason: string | null
          status: Database["public"]["Enums"]["request_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          email: string
          full_name?: string | null
          id?: string
          reason?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          email?: string
          full_name?: string | null
          id?: string
          reason?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          user_id?: string
        }
        Relationships: []
      }
      auction_sessions: {
        Row: {
          cover_image: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string
          id: string
          slug: string
          starts_at: string
          status: Database["public"]["Enums"]["session_status"]
          title: string
          updated_at: string
        }
        Insert: {
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at: string
          id?: string
          slug: string
          starts_at: string
          status?: Database["public"]["Enums"]["session_status"]
          title: string
          updated_at?: string
        }
        Update: {
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string
          id?: string
          slug?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bids: {
        Row: {
          amount: number
          created_at: string
          id: string
          lot_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          lot_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          lot_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          buyer_id: string | null
          buyers_premium: number
          commission_amount: number
          commission_pct: number
          created_at: string
          hammer_price: number
          id: string
          lot_id: string
          payout_ref: string | null
          payout_status: Database["public"]["Enums"]["payout_status"]
        }
        Insert: {
          buyer_id?: string | null
          buyers_premium?: number
          commission_amount: number
          commission_pct?: number
          created_at?: string
          hammer_price: number
          id?: string
          lot_id: string
          payout_ref?: string | null
          payout_status?: Database["public"]["Enums"]["payout_status"]
        }
        Update: {
          buyer_id?: string | null
          buyers_premium?: number
          commission_amount?: number
          commission_pct?: number
          created_at?: string
          hammer_price?: number
          id?: string
          lot_id?: string
          payout_ref?: string | null
          payout_status?: Database["public"]["Enums"]["payout_status"]
        }
        Relationships: [
          {
            foreignKeyName: "commissions_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      consignments: {
        Row: {
          artist: string
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          description: string | null
          dimensions: string | null
          estimated_value: number | null
          id: string
          image_urls: string[]
          medium: string | null
          notes: string | null
          provenance: string | null
          status: Database["public"]["Enums"]["request_status"]
          title: string
          user_id: string | null
          year: number | null
        }
        Insert: {
          artist: string
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          estimated_value?: number | null
          id?: string
          image_urls?: string[]
          medium?: string | null
          notes?: string | null
          provenance?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          title: string
          user_id?: string | null
          year?: number | null
        }
        Update: {
          artist?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          estimated_value?: number | null
          id?: string
          image_urls?: string[]
          medium?: string | null
          notes?: string | null
          provenance?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          title?: string
          user_id?: string | null
          year?: number | null
        }
        Relationships: []
      }
      lots: {
        Row: {
          artist: string
          bid_count: number
          category: string | null
          created_at: string
          current_bid: number
          description: string | null
          dimensions: string | null
          id: string
          image_url: string | null
          lot_number: number
          medium: string | null
          provenance: string | null
          session_id: string
          sold_price: number | null
          sold_to: string | null
          starting_bid: number
          status: Database["public"]["Enums"]["lot_status"]
          title: string
          updated_at: string
          year: number | null
        }
        Insert: {
          artist: string
          bid_count?: number
          category?: string | null
          created_at?: string
          current_bid?: number
          description?: string | null
          dimensions?: string | null
          id?: string
          image_url?: string | null
          lot_number: number
          medium?: string | null
          provenance?: string | null
          session_id: string
          sold_price?: number | null
          sold_to?: string | null
          starting_bid?: number
          status?: Database["public"]["Enums"]["lot_status"]
          title: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          artist?: string
          bid_count?: number
          category?: string | null
          created_at?: string
          current_bid?: number
          description?: string | null
          dimensions?: string | null
          id?: string
          image_url?: string | null
          lot_number?: number
          medium?: string | null
          provenance?: string | null
          session_id?: string
          sold_price?: number | null
          sold_to?: string | null
          starting_bid?: number
          status?: Database["public"]["Enums"]["lot_status"]
          title?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lots_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "auction_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
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
      watchlist: {
        Row: {
          created_at: string
          lot_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          lot_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          lot_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "owner" | "admin" | "user"
      lot_status: "active" | "sold" | "unsold" | "withdrawn"
      payout_status: "pending" | "paid"
      request_status: "pending" | "approved" | "rejected"
      session_status: "draft" | "upcoming" | "live" | "ended"
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
      app_role: ["owner", "admin", "user"],
      lot_status: ["active", "sold", "unsold", "withdrawn"],
      payout_status: ["pending", "paid"],
      request_status: ["pending", "approved", "rejected"],
      session_status: ["draft", "upcoming", "live", "ended"],
    },
  },
} as const
