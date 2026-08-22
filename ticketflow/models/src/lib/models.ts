import type {
  Artist,
  ArtistType,
  Coupon,
  Event,
  EventType,
  Order,
  OrderItem,
  TicketType,
  Venue,
  VenueConfiguration,
} from './database.types';

// Artist with joined artist_type
export interface ArtistWithType extends Artist {
  artist_types: ArtistType | null;
}

// Event with all joined relations
export interface EventWithRelations extends Event {
  artists: Pick<Artist, 'id' | 'name' | 'photo_url'> | null;
  event_types: EventType | null;
  venues: Pick<
    Venue,
    'id' | 'name' | 'latitude' | 'longitude' | 'map_url' | 'verified'
  > | null;
  venue_configurations: Pick<VenueConfiguration, 'id' | 'name' | 'capacity'> | null;
}

// Ticket type with available stock computed
export interface TicketTypeWithAvailability extends TicketType {
  /** stock - sold - reserved */
  available: number;
}

// Order with items and joined relations
export interface OrderWithItems extends Order {
  order_items: (OrderItem & {
    ticket_types: Pick<TicketType, 'id' | 'name' | 'sku' | 'price'> | null;
  })[];
  events: Pick<Event, 'id' | 'name' | 'event_date'> | null;
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
