import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@ticketflow/data-access';
import type {
  PlatformGlobalMetrics,
  SuperAdminUserItem,
  AdminVenueModerationItem,
  AdminArtistFinancialItem,
  RefundRequestWithRelations,
  RoleType,
} from '@ticketflow/models';

export interface BackofficeEventItem {
  id: string;
  name: string;
  artist_name: string;
  venue_name: string;
  event_date: string;
  status: string;
  flyer_url?: string;
  tickets_sold: number;
  total_gross: number;
}

@Injectable({ providedIn: 'root' })
export class BackofficeService {
  private readonly supabase = inject(SupabaseService).client;

  /** Fetch global platform business KPIs */
  async getGlobalMetrics(): Promise<PlatformGlobalMetrics> {
    const { data, error } = await this.supabase.rpc('get_global_platform_metrics');

    if (error) {
      console.error('Error fetching global platform metrics:', error);
      throw error;
    }

    return (data || {
      total_gmv: 0,
      total_platform_commission: 0,
      total_orders_count: 0,
      total_tickets_sold: 0,
      total_events_count: 0,
      active_events_count: 0,
      total_venues_count: 0,
      verified_venues_count: 0,
      total_artists_count: 0,
      total_users_count: 0,
    }) as PlatformGlobalMetrics;
  }

  /** Fetch all registered users with their roles */
  async getAllUsers(): Promise<SuperAdminUserItem[]> {
    const { data, error } = await this.supabase.rpc('get_all_users_with_roles');

    if (error) {
      console.error('Error fetching users with roles:', error);
      throw error;
    }

    return (data || []) as SuperAdminUserItem[];
  }

  /** Assign or revoke a specific role for a target user */
  async setUserRole(
    targetUserId: string,
    role: RoleType,
    shouldHave: boolean
  ): Promise<void> {
    const { error } = await this.supabase.rpc('admin_set_user_role', {
      p_target_user_id: targetUserId,
      p_role: role,
      p_should_have: shouldHave,
    });

    if (error) {
      console.error(`Error updating role ${role} for user ${targetUserId}:`, error);
      throw error;
    }
  }

  /** Fetch all venues across all artists with aggregate stats for moderation */
  async getVenuesForModeration(): Promise<AdminVenueModerationItem[]> {
    const { data, error } = await this.supabase.rpc('get_all_venues_for_moderation');

    if (error) {
      console.error('Error fetching venues for moderation:', error);
      throw error;
    }

    return (data || []) as AdminVenueModerationItem[];
  }

  /** Toggle venue verified status */
  async toggleVenueVerification(
    venueId: string,
    verified: boolean
  ): Promise<void> {
    const { error } = await this.supabase.rpc('admin_toggle_venue_verification', {
      p_venue_id: venueId,
      p_verified: verified,
    });

    if (error) {
      console.error(`Error updating venue verification for ${venueId}:`, error);
      throw error;
    }
  }

  /** Fetch financial breakdown of all artists */
  async getAllArtistsFinancialOverview(): Promise<AdminArtistFinancialItem[]> {
    const { data, error } = await this.supabase.rpc('get_all_artists_financial_overview');

    if (error) {
      console.error('Error fetching artists financial overview:', error);
      throw error;
    }

    return (data || []) as AdminArtistFinancialItem[];
  }

  /** Create Payout Record */
  async createPayoutRecord(payload: {
    artist_id: string;
    event_id?: string | null;
    amount: number;
    method: string;
    reference?: string | null;
    notes?: string | null;
    receipt_url?: string | null;
  }): Promise<void> {
    const { data, error } = await this.supabase.rpc('create_payout_record', {
      p_artist_id: payload.artist_id,
      p_event_id: payload.event_id || null,
      p_amount: payload.amount,
      p_method: payload.method,
      p_reference: payload.reference || null,
      p_notes: payload.notes || null,
      p_receipt_url: payload.receipt_url || null,
    });

    if (error) {
      console.error('Error creating payout record:', error);
      throw error;
    }

    if (data && data.success === false) {
      throw new Error(data.error || 'Error al procesar el pago');
    }
  }

  /** Fetch global list of events for Backoffice */
  async getAllEvents(): Promise<BackofficeEventItem[]> {
    const { data, error } = await this.supabase
      .from('events')
      .select(`
        id,
        name,
        event_date,
        status,
        flyer_url,
        artists ( name ),
        venues ( name ),
        orders ( total, status ),
        ticket_types ( sold )
      `)
      .order('event_date', { ascending: false });

    if (error) {
      console.error('Error fetching backoffice events:', error);
      throw error;
    }

    return (data || []).map((e: any) => {
      const confirmedOrders = (e.orders || []).filter((o: any) => o.status === 'confirmed');
      const total_gross = confirmedOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
      const tickets_sold = (e.ticket_types || []).reduce((sum: number, t: any) => sum + (t.sold || 0), 0);

      return {
        id: e.id,
        name: e.name,
        artist_name: e.artists?.name || 'Sin Artista',
        venue_name: e.venues?.name || 'Sin Recinto',
        event_date: e.event_date,
        status: e.status,
        flyer_url: e.flyer_url,
        tickets_sold,
        total_gross,
      };
    });
  }

  /** Fetch all refund requests platform-wide */
  async getAllRefundRequests(): Promise<RefundRequestWithRelations[]> {
    const { data, error } = await this.supabase.rpc('get_all_refund_requests');

    if (error) {
      console.error('Error fetching global refund requests:', error);
      throw error;
    }

    return (data || []) as RefundRequestWithRelations[];
  }

  /** Process refund request (Approve / Reject) */
  async processRefundRequest(
    refundRequestId: string,
    status: 'approved' | 'rejected',
    notes?: string
  ): Promise<void> {
    const { data, error } = await this.supabase.rpc('process_refund_request', {
      p_request_id: refundRequestId,
      p_approved: status === 'approved',
      p_admin_notes: notes || null,
    });

    if (error) {
      console.error('Error processing refund request:', error);
      throw error;
    }

    if (data && data.success === false) {
      throw new Error(data.error || 'Error al procesar el reembolso');
    }
  }
}
