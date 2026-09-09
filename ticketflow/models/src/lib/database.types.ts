// Auto-generated types matching the Supabase/PostgreSQL schema

export type RoleType = 'admin' | 'artist' | 'customer' | 'doorman';
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
export type CouponType = 'courtesy' | 'percentage' | 'fixed';
export type OrderStatus = 'pending' | 'confirmed' | 'cancelled' | 'refunded';

export interface ArtistType {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface EventType {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface PlatformSetting {
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: RoleType;
  created_at: string;
}

export interface Artist {
  id: string;
  user_id: string | null;
  name: string;
  photo_url: string | null;
  description: string | null;
  gallery_urls?: string[] | null;
  artist_type_id: string | null;
  tax_id: string | null;
  legal_name: string | null;
  postal_code: string | null;
  email: string | null;
  phone_number: string | null;
  meta_pixel_id?: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface Venue {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  map_url: string | null;
  verified: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface VenueConfiguration {
  id: string;
  venue_id: string;
  name: string;
  description: string | null;
  capacity: number | null;
  is_default: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface Event {
  id: string;
  artist_id: string;
  name: string;
  flyer_url: string | null;
  description: string | null;
  event_type_id: string | null;
  venue_id: string | null;
  venue_configuration_id: string | null;
  event_date: string | null;
  doors_open: string | null;
  duration_minutes: number | null;
  shared: boolean;
  status: EventStatus;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface TicketType {
  id: string;
  event_id: string;
  sku: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  reserved: number;
  sold: number;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface Coupon {
  id: string;
  event_id: string | null;
  ticket_sku: string | null;
  code: string;
  type: CouponType;
  value: number | null;
  max_uses: number | null;
  uses_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface Order {
  id: string;
  customer_id: string | null;
  event_id: string;
  status: OrderStatus;
  coupon_id: string | null;
  subtotal: number;
  discount_amount: number;
  commission_amount: number;
  total: number;
  payment_provider: string;
  payment_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  ticket_type_id: string;
  quantity: number;
  unit_price: number;
  commission_rate: number;
  commission_amount: number;
  total: number;
}

export interface TicketLock {
  id: string;
  ticket_type_id: string;
  session_id: string;
  quantity: number;
  locked_until: string;
  created_at: string;
}

export interface EventStaff {
  id: string;
  event_id: string;
  user_id: string;
  invited_by: string | null;
  status: 'pending' | 'accepted' | 'revoked';
  created_at: string;
  updated_at: string;
}

export interface StaffInvitation {
  id: string;
  event_id: string;
  email: string;
  token: string;
  invited_by: string | null;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  created_at: string;
}

export interface RefundRequest {
  id: string;
  order_id: string;
  user_id: string;
  event_id: string;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type WaitlistStatus = 'pending' | 'notified' | 'purchased' | 'cancelled';

export interface WaitlistEntry {
  id: string;
  event_id: string;
  ticket_type_id: string | null;
  user_id: string | null;
  email: string;
  phone_number: string | null;
  status: WaitlistStatus;
  notified_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'cancelled';
export type PayoutMethod = 'bank_transfer' | 'paypal' | 'manual';

export interface ArtistPayoutSetting {
  artist_id: string;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  tax_id: string | null;
  tax_regime: string | null;
  payout_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payout {
  id: string;
  artist_id: string;
  event_id: string | null;
  amount: number;
  currency: string;
  status: PayoutStatus;
  payout_method: PayoutMethod;
  reference_code: string | null;
  receipt_url: string | null;
  notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}


