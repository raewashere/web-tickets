import type {
  Artist,
  ArtistType,
  Coupon,
  Event,
  EventType,
  Order,
  OrderItem,
  RefundRequest,
  TicketType,
  Venue,
  VenueConfiguration,
  WaitlistEntry,
} from './database.types';

// Artist with joined artist_type
export interface ArtistWithType extends Artist {
  artist_types: ArtistType | null;
}

// Event with all joined relations
export interface EventWithRelations extends Event {
  artists: Pick<Artist, 'id' | 'name' | 'photo_url' | 'description' | 'gallery_urls'> | null;
  event_types: EventType | null;
  venues: Pick<
    Venue,
    'id' | 'name' | 'latitude' | 'longitude' | 'map_url' | 'verified'
  > | null;
  venue_configurations: Pick<VenueConfiguration, 'id' | 'name' | 'capacity'> | null;
}

// Venue with configurations
export interface VenueWithConfigurations extends Venue {
  venue_configurations: VenueConfiguration[];
}

// Ticket type with available stock computed
export interface TicketTypeWithAvailability extends TicketType {
  /** stock - sold - reserved */
  available: number;
}

// Order item with joined ticket type
export interface OrderItemWithTicketType extends OrderItem {
  ticket_types: Pick<TicketType, 'id' | 'name' | 'sku' | 'price'> | null;
}

// Order with items and joined relations
export interface OrderWithItems extends Order {
  order_items: OrderItemWithTicketType[];
  events: Pick<Event, 'id' | 'name' | 'event_date'> | null;
}

// Full order with relations for Store App
export interface OrderWithRelations extends Order {
  events: (Event & {
    venues: Venue | null;
    artists: Artist | null;
  }) | null;
  order_items: OrderItemWithTicketType[];
  coupons: Coupon | null;
  refund_requests?: RefundRequest | RefundRequest[] | null;
}

// Coupon validation result
export interface CouponValidation {
  valid: boolean;
  coupon?: Coupon;
  discountAmount?: number;
  error?: string;
}

// Dashboard stats for the artist panel
export interface DashboardStats {
  totalEvents: number;
  draftEvents: number;
  publishedEvents: number;
  ticketsSold: number;
  ticketsAvailable: number;
  netRevenue: number;
}

// Result returned by the reserve_tickets() DB function
export interface ReserveTicketsResult {
  success: boolean;
  lock_id?: string;
  locked_until?: string;
  error?: string;
  available?: number;
}

// Supabase Storage bucket names
export const STORAGE_BUCKETS = {
  ARTIST_PHOTOS: 'artist-photos',
  EVENT_FLYERS: 'event-flyers',
  VENUE_MAPS: 'venue-maps',
} as const;

export type StorageBucket =
  (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

// Event staff with user profile info
export interface EventStaffMember {
  id: string;
  event_id: string;
  user_id: string;
  invited_by: string | null;
  status: 'pending' | 'accepted' | 'revoked';
  created_at: string;
  updated_at: string;
  profiles?: {
    id?: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

// Staff invitation with event details
export interface StaffInvitationWithRelations {
  id: string;
  event_id: string;
  email: string;
  token: string;
  invited_by: string | null;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  created_at: string;
  events?: Pick<Event, 'id' | 'name' | 'event_date' | 'flyer_url'> | null;
}

// Super-Admin user item
export interface SuperAdminUserItem {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  roles: string[];
  created_at: string;
  last_sign_in_at?: string | null;
}

// Super-Admin global platform metrics
export interface PlatformGlobalMetrics {
  total_gmv: number;
  total_platform_commission: number;
  total_orders_count: number;
  total_tickets_sold: number;
  total_events_count: number;
  active_events_count: number;
  total_venues_count: number;
  verified_venues_count: number;
  total_artists_count: number;
  total_users_count: number;
}

// Super-Admin venue moderation item
export interface AdminVenueModerationItem {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  map_url: string | null;
  verified: boolean;
  created_at: string;
  created_by: string | null;
  creator_email: string | null;
  configurations_count: number;
  total_capacity: number;
  events_count: number;
}

// Refund request with joined relations
export interface RefundRequestWithRelations extends RefundRequest {
  customer_email?: string | null;
  customer_name?: string | null;
  event_name?: string | null;
  event_date?: string | null;
  artist_name?: string | null;
  order_total?: number | null;
}

// Waitlist entry with joined relations (for Admin / Organizer)
export interface WaitlistEntryWithRelations extends WaitlistEntry {
  ticket_type_name?: string | null;
  user_display_name?: string | null;
}

// Customer Waitlist summary (for Store My Tickets)
export interface CustomerWaitlistSummary {
  id: string;
  event_id: string;
  event_name: string;
  event_date: string;
  flyer_url: string | null;
  venue_name: string | null;
  artist_name: string | null;
  ticket_type_name: string | null;
  status: string;
  notified_at: string | null;
  created_at: string;
}



