import { Injectable, inject } from '@angular/core';
import { SupabaseService, AuthService } from '@ticketflow/data-access';
import type { Event } from '@ticketflow/models';

export interface ValidationItem {
  ticket_type_name: string;
  quantity: number;
  sku: string;
}

export interface ValidationResponse {
  success: boolean;
  result: 'valid' | 'already_used' | 'invalid_event' | 'not_found' | 'unpaid' | 'doors_not_open';
  message: string;
  order_id?: string;
  customer_name?: string;
  checked_in_at?: string;
  items?: ValidationItem[];
  total?: number;
}

export interface CheckInStats {
  totalSoldTickets: number;
  totalCheckedIn: number;
  totalOrders: number;
  checkedInOrders: number;
}

export interface ValidationLog {
  id: string;
  scanned_code: string;
  result: string;
  message: string;
  created_at: string;
  order_id?: string;
}

@Injectable({ providedIn: 'root' })
export class AccessControlService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly auth = inject(AuthService);

  /**
   * Get all published/active events the current user has access to.
   */
  async getEvents(): Promise<Event[]> {
    const roles = this.auth.roles();
    const isAdmin = this.auth.isAdmin();
    const isArtist = this.auth.isArtist();
    const isDoormanOnly = roles.includes('doorman') && !isAdmin && !isArtist;

    if (isDoormanOnly) {
      const doormanEventId = await this.getDoormanEventId();
      if (!doormanEventId) return [];

      const { data, error } = await this.supabase
        .from('events')
        .select('*, venues(name), venue_configurations(name, capacity)')
        .eq('id', doormanEventId);

      if (error) {
        console.error('Error loading doorman event:', error);
        return [];
      }
      return (data || []) as Event[];
    }

    const artistId = await this.auth.getCurrentArtistId();

    let query = this.supabase
      .from('events')
      .select('*, venues(name), venue_configurations(name, capacity)')
      .order('event_date', { ascending: false });

    if (!isAdmin && artistId) {
      query = query.eq('artist_id', artistId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error loading access control events:', error);
      return [];
    }
    return (data || []) as Event[];
  }

  /**
   * Fetch the event ID assigned to the current doorman.
   */
  async getDoormanEventId(): Promise<string | null> {
    const { data, error } = await this.supabase.rpc('get_doorman_event_id');
    if (error || !data) {
      // Fallback direct query on event_staff
      const userId = this.auth.user()?.id;
      if (!userId) return null;
      const { data: staffData } = await this.supabase
        .from('event_staff')
        .select('event_id')
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .maybeSingle();
      return staffData?.event_id ?? null;
    }
    return data as string;
  }

  /**
   * Validate QR or auth code against the database.
   */
  async validateTicket(scannedCode: string, eventId: string): Promise<ValidationResponse> {
    const user = this.auth.user();
    if (!user) {
      return {
        success: false,
        result: 'not_found',
        message: 'Sesión no autenticada para validar boletos.',
      };
    }

    try {
      const { data, error } = await this.supabase.rpc('validate_ticket_qr', {
        p_scanned_code: scannedCode.trim(),
        p_event_id: eventId,
        p_staff_id: user.id,
      });

      if (error) {
        console.error('validate_ticket_qr RPC error:', error);
        return {
          success: false,
          result: 'not_found',
          message: error.message || 'Error al validar el código.',
        };
      }

      return data as ValidationResponse;
    } catch (err) {
      console.error('validateTicket error:', err);
      return {
        success: false,
        result: 'not_found',
        message: 'Error de conexión al validar el acceso.',
      };
    }
  }

  /**
   * Fetch live statistics of checked-in tickets for an event.
   */
  async getStats(eventId: string): Promise<CheckInStats> {
    try {
      const { data: orders, error } = await this.supabase
        .from('orders')
        .select('id, status, checked_in_at, order_items(quantity)')
        .eq('event_id', eventId)
        .eq('status', 'confirmed');

      if (error || !orders) {
        return { totalSoldTickets: 0, totalCheckedIn: 0, totalOrders: 0, checkedInOrders: 0 };
      }

      let totalSoldTickets = 0;
      let totalCheckedIn = 0;
      let checkedInOrders = 0;

      for (const o of orders) {
        const orderQty = (o.order_items || []).reduce(
          (sum: number, item: { quantity: number }) => sum + (item.quantity || 0),
          0
        );
        totalSoldTickets += orderQty;

        if (o.checked_in_at) {
          checkedInOrders++;
          totalCheckedIn += orderQty;
        }
      }

      return {
        totalSoldTickets,
        totalCheckedIn,
        totalOrders: orders.length,
        checkedInOrders,
      };
    } catch (err) {
      console.error('getStats error:', err);
      return { totalSoldTickets: 0, totalCheckedIn: 0, totalOrders: 0, checkedInOrders: 0 };
    }
  }

  /**
   * Fetch recent validation logs for an event.
   */
  async getRecentLogs(eventId: string): Promise<ValidationLog[]> {
    const { data, error } = await this.supabase
      .from('ticket_validations')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(15);

    if (error) {
      console.error('Error fetching logs:', error);
      return [];
    }
    return (data || []) as ValidationLog[];
  }
}
