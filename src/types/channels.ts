// =====================================================
// TIPOS PARA SISTEMA DE CANALES
// =====================================================

export type ChannelType = 
  | 'direct' 
  | 'pos' 
  | 'aggregator' 
  | 'messaging' 
  | 'marketplace' 
  | 'other';

export type UnavailableReason = 
  | 'out_of_stock'
  | 'temporarily_off'
  | 'schedule'
  | 'preparation_issue'
  | 'other';

export interface Channel {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  channel_type: ChannelType;
  requires_integration: boolean;
  integration_type?: string | null;
  icon?: string | null;
  color?: string | null;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface BranchChannel {
  id: string;
  branch_id: string;
  channel_id: string;
  is_enabled: boolean;
  config?: Record<string, unknown>;
  custom_schedule?: Record<string, { open: string; close: string }>;
  delivery_fee_override?: number | null;
  minimum_order_override?: number | null;
  created_at?: string;
  updated_at?: string;
  // Joined channel data
  channel?: Channel;
}

export interface ProductChannelPermission {
  id: string;
  product_id: string;
  channel_id: string;
  is_allowed: boolean;
  price_override?: number | null;
  notes?: string | null;
  created_at?: string;
  // Joined channel data
  channel?: Channel;
}

export interface ProductChannelAvailability {
  id: string;
  branch_id: string;
  product_id: string;
  channel_id: string;
  is_available: boolean;
  unavailable_reason?: UnavailableReason | null;
  unavailable_note?: string | null;
  stock_quantity?: number | null;
  low_stock_threshold?: number | null;
  local_price_override?: number | null;
  updated_at?: string;
  updated_by?: string | null;
}

// RPC Response types
export interface ChannelProduct {
  product_id: string;
  product_name: string;
  product_description: string | null;
  base_price: number;
  final_price: number;
  category_id: string;
  category_name: string;
  image_url: string | null;
  is_available: boolean;
  unavailable_reason: UnavailableReason | null;
  stock_quantity: number | null;
}

export interface BranchActiveChannel {
  channel_id: string;
  channel_name: string;
  channel_slug: string;
  channel_type: ChannelType;
  icon: string | null;
  color: string | null;
  config: Record<string, unknown> | null;
  is_enabled: boolean;
}

// Form types
export interface ChannelFormData {
  name: string;
  slug: string;
  description?: string;
  channel_type: ChannelType;
  requires_integration: boolean;
  integration_type?: string;
  icon?: string;
  color?: string;
  is_active: boolean;
  display_order: number;
}

// Service Type = How the order is delivered (separate from channel)
export type ServiceType = 'delivery' | 'takeaway' | 'dine_in';

export interface ToggleChannelAvailabilityParams {
  branchId: string;
  productId: string;
  channelId: string;
  isAvailable: boolean;
  reason?: UnavailableReason;
}
