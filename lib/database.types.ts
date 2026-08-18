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
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          organization_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          organization_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_sequences: {
        Row: {
          document_kind: Database["public"]["Enums"]["document_kind"]
          last_value: number
          organization_id: string
        }
        Insert: {
          document_kind: Database["public"]["Enums"]["document_kind"]
          last_value?: number
          organization_id: string
        }
        Update: {
          document_kind?: Database["public"]["Enums"]["document_kind"]
          last_value?: number
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_balances: {
        Row: {
          id: string
          organization_id: string
          product_variant_id: string
          quantity_on_hand: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          id?: string
          organization_id: string
          product_variant_id: string
          quantity_on_hand?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          id?: string
          organization_id?: string
          product_variant_id?: string
          quantity_on_hand?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_balances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_balances_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_balances_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string
          id: string
          idempotency_key: string | null
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes: string | null
          organization_id: string
          product_variant_id: string
          purchase_receipt_id: string | null
          purchase_receipt_item_id: string | null
          quantity: number
          quantity_after: number
          quantity_before: number
          reason: string | null
          return_id: string | null
          return_item_id: string | null
          sale_id: string | null
          sale_item_id: string | null
          stock_adjustment_id: string | null
          unit_cost: number | null
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          idempotency_key?: string | null
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          organization_id: string
          product_variant_id: string
          purchase_receipt_id?: string | null
          purchase_receipt_item_id?: string | null
          quantity: number
          quantity_after: number
          quantity_before: number
          reason?: string | null
          return_id?: string | null
          return_item_id?: string | null
          sale_id?: string | null
          sale_item_id?: string | null
          stock_adjustment_id?: string | null
          unit_cost?: number | null
          warehouse_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          idempotency_key?: string | null
          movement_type?: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          organization_id?: string
          product_variant_id?: string
          purchase_receipt_id?: string | null
          purchase_receipt_item_id?: string | null
          quantity?: number
          quantity_after?: number
          quantity_before?: number
          reason?: string | null
          return_id?: string | null
          return_item_id?: string | null
          sale_id?: string | null
          sale_item_id?: string | null
          stock_adjustment_id?: string | null
          unit_cost?: number | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_purchase_receipt_id_fkey"
            columns: ["purchase_receipt_id"]
            isOneToOne: false
            referencedRelation: "purchase_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_purchase_receipt_item_id_fkey"
            columns: ["purchase_receipt_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_receipt_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_return_item_id_fkey"
            columns: ["return_item_id"]
            isOneToOne: false
            referencedRelation: "return_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_sale_item_id_fkey"
            columns: ["sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_stock_adjustment_id_fkey"
            columns: ["stock_adjustment_id"]
            isOneToOne: false
            referencedRelation: "stock_adjustments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          currency_code: string
          id: string
          name: string
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency_code?: string
          id?: string
          name: string
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          id?: string
          name?: string
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          id: string
          resource: string
        }
        Insert: {
          action: string
          id?: string
          resource: string
        }
        Update: {
          action?: string
          id?: string
          resource?: string
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          barcode: string | null
          cost_price: number | null
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          product_id: string
          reorder_point: number
          sale_price: number | null
          sku: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          cost_price?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          product_id: string
          reorder_point?: number
          sale_price?: number | null
          sku: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          cost_price?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          product_id?: string
          reorder_point?: number
          sale_price?: number | null
          sku?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_status"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["product_id"]
          },
        ]
      }
      products: {
        Row: {
          base_cost_price: number
          base_sale_price: number
          category_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          status: Database["public"]["Enums"]["product_status"]
          unit_of_measure: string
          updated_at: string
        }
        Insert: {
          base_cost_price?: number
          base_sale_price?: number
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          status?: Database["public"]["Enums"]["product_status"]
          unit_of_measure?: string
          updated_at?: string
        }
        Update: {
          base_cost_price?: number
          base_sale_price?: number
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["product_status"]
          unit_of_measure?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          branch_id: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          full_name: string
          id: string
          is_active?: boolean
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          id: string
          line_total: number
          product_variant_id: string
          purchase_order_id: string
          quantity_ordered: number
          quantity_received: number
          unit_cost: number
        }
        Insert: {
          id?: string
          line_total: number
          product_variant_id: string
          purchase_order_id: string
          quantity_ordered: number
          quantity_received?: number
          unit_cost: number
        }
        Update: {
          id?: string
          line_total?: number
          product_variant_id?: string
          purchase_order_id?: string
          quantity_ordered?: number
          quantity_received?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string
          document_number: string
          id: string
          notes: string | null
          ordered_at: string | null
          organization_id: string
          status: Database["public"]["Enums"]["purchase_order_status"]
          subtotal: number
          supplier_id: string
          total: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          document_number: string
          id?: string
          notes?: string | null
          ordered_at?: string | null
          organization_id: string
          status?: Database["public"]["Enums"]["purchase_order_status"]
          subtotal?: number
          supplier_id: string
          total?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          document_number?: string
          id?: string
          notes?: string | null
          ordered_at?: string | null
          organization_id?: string
          status?: Database["public"]["Enums"]["purchase_order_status"]
          subtotal?: number
          supplier_id?: string
          total?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_receipt_items: {
        Row: {
          id: string
          movement_id: string
          product_variant_id: string
          purchase_order_item_id: string
          purchase_receipt_id: string
          quantity_received: number
          unit_cost: number
        }
        Insert: {
          id?: string
          movement_id: string
          product_variant_id: string
          purchase_order_item_id: string
          purchase_receipt_id: string
          quantity_received: number
          unit_cost: number
        }
        Update: {
          id?: string
          movement_id?: string
          product_variant_id?: string
          purchase_order_item_id?: string
          purchase_receipt_id?: string
          quantity_received?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_receipt_items_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "inventory_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_receipt_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_receipt_items_purchase_order_item_id_fkey"
            columns: ["purchase_order_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_receipt_items_purchase_receipt_id_fkey"
            columns: ["purchase_receipt_id"]
            isOneToOne: false
            referencedRelation: "purchase_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_receipts: {
        Row: {
          created_at: string
          created_by: string
          document_number: string
          id: string
          notes: string | null
          organization_id: string
          purchase_order_id: string
          received_at: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          document_number: string
          id?: string
          notes?: string | null
          organization_id: string
          purchase_order_id: string
          received_at?: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          document_number?: string
          id?: string
          notes?: string | null
          organization_id?: string
          purchase_order_id?: string
          received_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_receipts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_receipts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_receipts_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_receipts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      return_items: {
        Row: {
          damage_movement_id: string | null
          id: string
          is_restockable: boolean
          product_variant_id: string
          quantity: number
          restock_movement_id: string | null
          return_id: string
          sale_item_id: string
        }
        Insert: {
          damage_movement_id?: string | null
          id?: string
          is_restockable?: boolean
          product_variant_id: string
          quantity: number
          restock_movement_id?: string | null
          return_id: string
          sale_item_id: string
        }
        Update: {
          damage_movement_id?: string | null
          id?: string
          is_restockable?: boolean
          product_variant_id?: string
          quantity?: number
          restock_movement_id?: string | null
          return_id?: string
          sale_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_items_damage_movement_id_fkey"
            columns: ["damage_movement_id"]
            isOneToOne: false
            referencedRelation: "inventory_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_restock_movement_id_fkey"
            columns: ["restock_movement_id"]
            isOneToOne: false
            referencedRelation: "inventory_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_sale_item_id_fkey"
            columns: ["sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          created_at: string
          created_by: string
          document_number: string
          id: string
          notes: string | null
          organization_id: string
          reason: string | null
          sale_id: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          document_number: string
          id?: string
          notes?: string | null
          organization_id: string
          reason?: string | null
          sale_id: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          document_number?: string
          id?: string
          notes?: string | null
          organization_id?: string
          reason?: string | null
          sale_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          discount_amount: number
          id: string
          line_total: number
          movement_id: string | null
          product_variant_id: string
          quantity: number
          quantity_returned: number
          sale_id: string
          unit_price: number
        }
        Insert: {
          discount_amount?: number
          id?: string
          line_total: number
          movement_id?: string | null
          product_variant_id: string
          quantity: number
          quantity_returned?: number
          sale_id: string
          unit_price: number
        }
        Update: {
          discount_amount?: number
          id?: string
          line_total?: number
          movement_id?: string | null
          product_variant_id?: string
          quantity?: number
          quantity_returned?: number
          sale_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "inventory_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          customer_id: string | null
          discount_amount: number
          document_number: string
          id: string
          notes: string | null
          organization_id: string
          status: Database["public"]["Enums"]["sale_status"]
          subtotal: number
          total: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          customer_id?: string | null
          discount_amount?: number
          document_number: string
          id?: string
          notes?: string | null
          organization_id: string
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          customer_id?: string | null
          discount_amount?: number
          document_number?: string
          id?: string
          notes?: string | null
          organization_id?: string
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustment_items: {
        Row: {
          id: string
          movement_id: string
          product_variant_id: string
          quantity: number
          stock_adjustment_id: string
        }
        Insert: {
          id?: string
          movement_id: string
          product_variant_id: string
          quantity: number
          stock_adjustment_id: string
        }
        Update: {
          id?: string
          movement_id?: string
          product_variant_id?: string
          quantity?: number
          stock_adjustment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustment_items_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "inventory_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustment_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustment_items_stock_adjustment_id_fkey"
            columns: ["stock_adjustment_id"]
            isOneToOne: false
            referencedRelation: "stock_adjustments"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          adjustment_type: Database["public"]["Enums"]["stock_adjustment_type"]
          created_at: string
          created_by: string
          document_number: string
          id: string
          notes: string | null
          organization_id: string
          reason: string
          warehouse_id: string
        }
        Insert: {
          adjustment_type: Database["public"]["Enums"]["stock_adjustment_type"]
          created_at?: string
          created_by: string
          document_number: string
          id?: string
          notes?: string | null
          organization_id: string
          reason: string
          warehouse_id: string
        }
        Update: {
          adjustment_type?: Database["public"]["Enums"]["stock_adjustment_type"]
          created_at?: string
          created_by?: string
          document_number?: string
          id?: string
          notes?: string | null
          organization_id?: string
          reason?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact_name: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          organization_id: string
          payment_terms: string | null
          phone: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          contact_name?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          organization_id: string
          payment_terms?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          contact_name?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          organization_id?: string
          payment_terms?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      variant_reorder_points: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          product_variant_id: string
          reorder_point: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          product_variant_id: string
          reorder_point: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          product_variant_id?: string
          reorder_point?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variant_reorder_points_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variant_reorder_points_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variant_reorder_points_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          branch_id: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          branch_id?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          branch_id?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_inventory_reconciliation: {
        Row: {
          balance_quantity: number | null
          discrepancy: number | null
          movement_sum: number | null
          organization_id: string | null
          product_variant_id: string | null
          warehouse_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_balances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_balances_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_balances_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      v_inventory_status: {
        Row: {
          barcode: string | null
          organization_id: string | null
          product_id: string | null
          product_name: string | null
          product_variant_id: string | null
          quantity_on_hand: number | null
          reorder_point: number | null
          sku: string | null
          stock_status: string | null
          updated_at: string | null
          variant_name: string | null
          warehouse_id: string | null
          warehouse_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_balances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_balances_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_balances_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      v_inventory_valuation: {
        Row: {
          inventory_value: number | null
          organization_id: string | null
          product_id: string | null
          product_name: string | null
          product_status: Database["public"]["Enums"]["product_status"] | null
          product_variant_id: string | null
          quantity_on_hand: number | null
          sku: string | null
          unit_cost: number | null
          variant_name: string | null
          warehouse_id: string | null
          warehouse_name: string | null
        }
        Relationships: []
      }
      v_low_stock_items: {
        Row: {
          barcode: string | null
          organization_id: string | null
          product_id: string | null
          product_name: string | null
          product_variant_id: string | null
          quantity_on_hand: number | null
          reorder_point: number | null
          sku: string | null
          stock_status: string | null
          updated_at: string | null
          variant_name: string | null
          warehouse_id: string | null
          warehouse_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_balances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_balances_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_balances_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      assert_same_organization: {
        Args: { p_organization_id: string }
        Returns: undefined
      }
      create_stock_adjustment: {
        Args: {
          p_adjustment_type: Database["public"]["Enums"]["stock_adjustment_type"]
          p_created_by: string
          p_idempotency_key?: string
          p_lines: Json
          p_notes?: string
          p_organization_id: string
          p_reason: string
          p_warehouse_id: string
        }
        Returns: string
      }
      report_sales_by_day: {
        Args: {
          p_from: string
          p_organization_id: string
          p_to: string
        }
        Returns: {
          day: string
          net_revenue: number
          sales_count: number
        }[]
      }
      report_sales_summary: {
        Args: {
          p_from: string
          p_organization_id: string
          p_to: string
        }
        Returns: {
          discount_total: number
          estimated_cogs: number
          estimated_gross_profit: number
          gross_revenue: number
          net_revenue: number
          return_revenue: number
          return_units: number
          sales_count: number
          units_sold: number
        }[]
      }
      report_top_products: {
        Args: {
          p_from: string
          p_limit?: number
          p_organization_id: string
          p_to: string
        }
        Returns: {
          net_revenue: number
          product_name: string
          product_variant_id: string
          sku: string
          units_sold: number
          variant_name: string
        }[]
      }
      process_return: { Args: { p_created_by: string; p_idempotency_key?: string; p_lines: Json; p_notes?: string; p_organization_id: string; p_reason: string; p_sale_id: string }; Returns: string }
      get_user_organization_id: { Args: never; Returns: string }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_permission: {
        Args: { p_action: string; p_resource: string }
        Returns: boolean
      }
      is_active_user: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      map_adjustment_type_to_movement: {
        Args: {
          p_adjustment_type: Database["public"]["Enums"]["stock_adjustment_type"]
          p_positive: boolean
        }
        Returns: Database["public"]["Enums"]["movement_type"]
      }
      next_document_number: {
        Args: {
          p_document_kind: Database["public"]["Enums"]["document_kind"]
          p_organization_id: string
        }
        Returns: string
      }
      record_inventory_movement: {
        Args: {
          p_created_by: string
          p_idempotency_key?: string
          p_movement_type: Database["public"]["Enums"]["movement_type"]
          p_notes?: string
          p_organization_id: string
          p_product_variant_id: string
          p_purchase_receipt_id?: string
          p_purchase_receipt_item_id?: string
          p_quantity: number
          p_reason?: string
          p_return_id?: string
          p_return_item_id?: string
          p_sale_id?: string
          p_sale_item_id?: string
          p_stock_adjustment_id?: string
          p_unit_cost?: number
          p_warehouse_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "employee"
      document_kind:
        | "sale"
        | "purchase_order"
        | "purchase_receipt"
        | "return"
        | "stock_adjustment"
      movement_type:
        | "initial_stock"
        | "purchase_receipt"
        | "sale"
        | "sale_return"
        | "adjustment_increase"
        | "adjustment_decrease"
        | "damage"
        | "loss"
        | "transfer_in"
        | "transfer_out"
      product_status: "active" | "archived"
      purchase_order_status:
        | "draft"
        | "ordered"
        | "partially_received"
        | "received"
        | "cancelled"
      sale_status:
        | "draft"
        | "completed"
        | "cancelled"
        | "partially_returned"
        | "fully_returned"
      stock_adjustment_type:
        | "initial_stock"
        | "increase"
        | "decrease"
        | "damage"
        | "loss"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "employee"],
      document_kind: [
        "sale",
        "purchase_order",
        "purchase_receipt",
        "return",
        "stock_adjustment",
      ],
      movement_type: [
        "initial_stock",
        "purchase_receipt",
        "sale",
        "sale_return",
        "adjustment_increase",
        "adjustment_decrease",
        "damage",
        "loss",
        "transfer_in",
        "transfer_out",
      ],
      product_status: ["active", "archived"],
      purchase_order_status: [
        "draft",
        "ordered",
        "partially_received",
        "received",
        "cancelled",
      ],
      sale_status: [
        "draft",
        "completed",
        "cancelled",
        "partially_returned",
        "fully_returned",
      ],
      stock_adjustment_type: [
        "initial_stock",
        "increase",
        "decrease",
        "damage",
        "loss",
      ],
    },
  },
} as const
