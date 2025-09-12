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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      ab_test_results: {
        Row: {
          engagement_score: number | null
          original_value: string | null
          selected: boolean | null
          tenant_id: string
          test_attribute: string | null
          test_date: string | null
          test_id: number
          test_value: string | null
          user_id: string
        }
        Insert: {
          engagement_score?: number | null
          original_value?: string | null
          selected?: boolean | null
          tenant_id: string
          test_attribute?: string | null
          test_date?: string | null
          test_id?: number
          test_value?: string | null
          user_id: string
        }
        Update: {
          engagement_score?: number | null
          original_value?: string | null
          selected?: boolean | null
          tenant_id?: string
          test_attribute?: string | null
          test_date?: string | null
          test_id?: number
          test_value?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ab_test_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "ab_test_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "tenant_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      api_usage: {
        Row: {
          api_name: string
          cost: number | null
          id: number
          request_time: number | null
          tenant_id: string
          timestamp: string | null
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          api_name: string
          cost?: number | null
          id?: number
          request_time?: number | null
          tenant_id: string
          timestamp?: string | null
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          api_name?: string
          cost?: number | null
          id?: number
          request_time?: number | null
          tenant_id?: string
          timestamp?: string | null
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "api_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "tenant_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      conversation_summaries: {
        Row: {
          key_topics: string[] | null
          message_count: number | null
          session_id: string
          summary: string | null
          tenant_id: string
          timestamp: string | null
          user_id: string
        }
        Insert: {
          key_topics?: string[] | null
          message_count?: number | null
          session_id?: string
          summary?: string | null
          tenant_id: string
          timestamp?: string | null
          user_id: string
        }
        Update: {
          key_topics?: string[] | null
          message_count?: number | null
          session_id?: string
          summary?: string | null
          tenant_id?: string
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_summaries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "conversation_summaries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "tenant_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      document_access_logs: {
        Row: {
          access_type: string | null
          doc_id: string
          ip_address: unknown | null
          log_id: number
          session_id: string | null
          tenant_id: string
          timestamp: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          access_type?: string | null
          doc_id: string
          ip_address?: unknown | null
          log_id?: number
          session_id?: string | null
          tenant_id: string
          timestamp?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          access_type?: string | null
          doc_id?: string
          ip_address?: unknown | null
          log_id?: number
          session_id?: string | null
          tenant_id?: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_access_logs_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["doc_id"]
          },
          {
            foreignKeyName: "document_access_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "document_access_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "tenant_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      document_chunks: {
        Row: {
          chunk_id: number
          chunk_index: number
          chunk_text: string
          created_at: string | null
          doc_id: string
          embedding: string | null
          metadata: Json | null
          tenant_id: string
        }
        Insert: {
          chunk_id?: number
          chunk_index: number
          chunk_text: string
          created_at?: string | null
          doc_id: string
          embedding?: string | null
          metadata?: Json | null
          tenant_id: string
        }
        Update: {
          chunk_id?: number
          chunk_index?: number
          chunk_text?: string
          created_at?: string | null
          doc_id?: string
          embedding?: string | null
          metadata?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["doc_id"]
          },
          {
            foreignKeyName: "document_chunks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      document_processing_queue: {
        Row: {
          completed_at: string | null
          created_at: string | null
          doc_id: string
          error_message: string | null
          max_retries: number | null
          priority: number | null
          queue_id: number
          retry_count: number | null
          started_at: string | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          doc_id: string
          error_message?: string | null
          max_retries?: number | null
          priority?: number | null
          queue_id?: number
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          doc_id?: string
          error_message?: string | null
          max_retries?: number | null
          priority?: number | null
          queue_id?: number
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_processing_queue_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["doc_id"]
          },
          {
            foreignKeyName: "document_processing_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      documents: {
        Row: {
          chunks_count: number | null
          content_preview: string | null
          doc_id: string
          file_size: number
          file_type: string
          filename: string
          is_processed: boolean | null
          last_accessed: string | null
          metadata: Json | null
          processing_status: string | null
          tenant_id: string
          upload_time: string | null
          user_id: string
        }
        Insert: {
          chunks_count?: number | null
          content_preview?: string | null
          doc_id?: string
          file_size: number
          file_type: string
          filename: string
          is_processed?: boolean | null
          last_accessed?: string | null
          metadata?: Json | null
          processing_status?: string | null
          tenant_id: string
          upload_time?: string | null
          user_id: string
        }
        Update: {
          chunks_count?: number | null
          content_preview?: string | null
          doc_id?: string
          file_size?: number
          file_type?: string
          filename?: string
          is_processed?: boolean | null
          last_accessed?: string | null
          metadata?: Json | null
          processing_status?: string | null
          tenant_id?: string
          upload_time?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "tenant_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      logic_notes: {
        Row: {
          category: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      reference_materials: {
        Row: {
          content: string | null
          created_at: string
          file_size: number
          file_type: string
          filename: string
          id: string
          original_filename: string
          tags: string[] | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          file_size: number
          file_type: string
          filename: string
          id?: string
          original_filename: string
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          file_size?: number
          file_type?: string
          filename?: string
          id?: string
          original_filename?: string
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      tenant_billing: {
        Row: {
          api_calls_limit: number | null
          api_calls_this_period: number | null
          billing_cycle: string | null
          billing_status: string | null
          created_at: string | null
          last_billing_date: string | null
          next_billing_date: string | null
          payment_method: string | null
          storage_limit_bytes: number | null
          storage_used_bytes: number | null
          stripe_customer_id: string | null
          subscription_tier: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          api_calls_limit?: number | null
          api_calls_this_period?: number | null
          billing_cycle?: string | null
          billing_status?: string | null
          created_at?: string | null
          last_billing_date?: string | null
          next_billing_date?: string | null
          payment_method?: string | null
          storage_limit_bytes?: number | null
          storage_used_bytes?: number | null
          stripe_customer_id?: string | null
          subscription_tier?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          api_calls_limit?: number | null
          api_calls_this_period?: number | null
          billing_cycle?: string | null
          billing_status?: string | null
          created_at?: string | null
          last_billing_date?: string | null
          next_billing_date?: string | null
          payment_method?: string | null
          storage_limit_bytes?: number | null
          storage_used_bytes?: number | null
          stripe_customer_id?: string | null
          subscription_tier?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_billing_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      tenant_invoices: {
        Row: {
          base_amount: number | null
          created_at: string | null
          currency: string | null
          due_date: string | null
          invoice_id: string
          invoice_number: string
          paid_at: string | null
          period_end: string
          period_start: string
          status: string | null
          stripe_invoice_id: string | null
          tenant_id: string
          total_amount: number
          usage_amount: number | null
        }
        Insert: {
          base_amount?: number | null
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          invoice_id?: string
          invoice_number: string
          paid_at?: string | null
          period_end: string
          period_start: string
          status?: string | null
          stripe_invoice_id?: string | null
          tenant_id: string
          total_amount: number
          usage_amount?: number | null
        }
        Update: {
          base_amount?: number | null
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          invoice_id?: string
          invoice_number?: string
          paid_at?: string | null
          period_end?: string
          period_start?: string
          status?: string | null
          stripe_invoice_id?: string | null
          tenant_id?: string
          total_amount?: number
          usage_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      tenant_storage: {
        Row: {
          document_count: number | null
          last_updated: string | null
          storage_limit_bytes: number | null
          tenant_id: string
          total_storage_bytes: number | null
        }
        Insert: {
          document_count?: number | null
          last_updated?: string | null
          storage_limit_bytes?: number | null
          tenant_id: string
          total_storage_bytes?: number | null
        }
        Update: {
          document_count?: number | null
          last_updated?: string | null
          storage_limit_bytes?: number | null
          tenant_id?: string
          total_storage_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_storage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      tenant_usage_logs: {
        Row: {
          api_calls: number | null
          api_calls_cost: number | null
          created_at: string | null
          date: string
          id: number
          storage_cost: number | null
          storage_used_bytes: number | null
          tenant_id: string
          total_cost: number | null
        }
        Insert: {
          api_calls?: number | null
          api_calls_cost?: number | null
          created_at?: string | null
          date: string
          id?: number
          storage_cost?: number | null
          storage_used_bytes?: number | null
          tenant_id: string
          total_cost?: number | null
        }
        Update: {
          api_calls?: number | null
          api_calls_cost?: number | null
          created_at?: string | null
          date?: string
          id?: number
          storage_cost?: number | null
          storage_used_bytes?: number | null
          tenant_id?: string
          total_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_usage_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          can_modify_ai_settings: boolean | null
          can_upload_documents: boolean | null
          can_view_analytics: boolean | null
          created_at: string | null
          email: string
          name: string | null
          persona_settings: Json | null
          role: string | null
          tenant_id: string
          user_id: string
          voice_preference: string | null
        }
        Insert: {
          can_modify_ai_settings?: boolean | null
          can_upload_documents?: boolean | null
          can_view_analytics?: boolean | null
          created_at?: string | null
          email: string
          name?: string | null
          persona_settings?: Json | null
          role?: string | null
          tenant_id: string
          user_id?: string
          voice_preference?: string | null
        }
        Update: {
          can_modify_ai_settings?: boolean | null
          can_upload_documents?: boolean | null
          can_view_analytics?: boolean | null
          created_at?: string | null
          email?: string
          name?: string | null
          persona_settings?: Json | null
          role?: string | null
          tenant_id?: string
          user_id?: string
          voice_preference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      tenants: {
        Row: {
          admin_email: string
          api_keys: Json | null
          brand_colors: Json | null
          created_at: string | null
          custom_logo: string | null
          custom_settings: Json | null
          expires_at: string | null
          is_active: boolean | null
          max_api_calls_monthly: number | null
          max_storage_gb: number | null
          max_users: number | null
          organization_name: string
          subscription_tier: string | null
          tenant_id: string
        }
        Insert: {
          admin_email: string
          api_keys?: Json | null
          brand_colors?: Json | null
          created_at?: string | null
          custom_logo?: string | null
          custom_settings?: Json | null
          expires_at?: string | null
          is_active?: boolean | null
          max_api_calls_monthly?: number | null
          max_storage_gb?: number | null
          max_users?: number | null
          organization_name: string
          subscription_tier?: string | null
          tenant_id?: string
        }
        Update: {
          admin_email?: string
          api_keys?: Json | null
          brand_colors?: Json | null
          created_at?: string | null
          custom_logo?: string | null
          custom_settings?: Json | null
          expires_at?: string | null
          is_active?: boolean | null
          max_api_calls_monthly?: number | null
          max_storage_gb?: number | null
          max_users?: number | null
          organization_name?: string
          subscription_tier?: string | null
          tenant_id?: string
        }
        Relationships: []
      }
      training_data: {
        Row: {
          created_at: string
          id: string
          prompt: string
          response: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          prompt: string
          response: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          prompt?: string
          response?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      user_personas: {
        Row: {
          confidence: number | null
          detail_level: string | null
          energy: string | null
          example_style: string | null
          formality: string | null
          last_updated: string | null
          questioning: string | null
          sessions_count: number | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          detail_level?: string | null
          energy?: string | null
          example_style?: string | null
          formality?: string | null
          last_updated?: string | null
          questioning?: string | null
          sessions_count?: number | null
          tenant_id: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          detail_level?: string | null
          energy?: string | null
          example_style?: string | null
          formality?: string | null
          last_updated?: string | null
          questioning?: string | null
          sessions_count?: number | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_personas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_personas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "tenant_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          communication_style: string | null
          created_at: string | null
          expertise_areas: string[] | null
          preferred_examples: string | null
          response_pace: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          communication_style?: string | null
          created_at?: string | null
          expertise_areas?: string[] | null
          preferred_examples?: string | null
          response_pace?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          communication_style?: string | null
          created_at?: string | null
          expertise_areas?: string[] | null
          preferred_examples?: string | null
          response_pace?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "tenant_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      current_user_is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
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
