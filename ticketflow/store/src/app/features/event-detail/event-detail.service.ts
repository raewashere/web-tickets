import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@ticketflow/data-access';
import type {
  EventWithRelations,
  TicketTypeWithAvailability,
  ReserveTicketsResult,
} from '@ticketflow/models';

export interface EventDetailPublic extends EventWithRelations {
  ticket_types: TicketTypeWithAvailability[];
}

export interface CartTicketItem {
  ticketType: TicketTypeWithAvailability;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class EventDetailService {
  private readonly supabase = inject(SupabaseService).client;

  /**
   * Fetch a single published event by ID with all details and active ticket types.
   */
  async getEvent(id: string): Promise<EventDetailPublic | null> {
    const { data, error } = await this.supabase
      .from('events')
      .select('*, artists(id, name, photo_url, description), venues(id, name, latitude, longitude, map_url, verified), venue_configurations(id, name, capacity), event_types(*), ticket_types(*)')
      .eq('id', id)
      .eq('status', 'published')
      .maybeSingle();

    if (error) {
      console.error(`Error fetching event detail for ${id}:`, error);
      throw error;
    }

    if (!data) return null;

    // Filter active tickets and calculate available
    const activeTickets = ((data.ticket_types || []) as TicketTypeWithAvailability[])
      .filter((t) => t.is_active)
      .map((t) => ({
        ...t,
        available: Math.max(0, (t.stock || 0) - (t.sold || 0) - (t.reserved || 0)),
      }))
      .sort((a, b) => Number(a.price) - Number(b.price));

    return {
      ...data,
      ticket_types: activeTickets,
    } as EventDetailPublic;
  }

  /**
   * Reserve / Lock tickets using Supabase DB RPC `reserve_tickets`.
   */
  async reserveTickets(
    ticketTypeId: string,
    quantity: number,
    sessionId: string
  ): Promise<ReserveTicketsResult> {
    const { data, error } = await this.supabase.rpc('reserve_tickets', {
      p_ticket_type_id: ticketTypeId,
      p_quantity: quantity,
      p_session_id: sessionId,
    });

    if (error) {
      console.error('Error reserving tickets:', error);
      return { success: false, error: error.message };
    }

    return (data || { success: false }) as ReserveTicketsResult;
  }

  /**
   * Generate or retrieve a persistent session identifier for ticket locks.
   */
  getOrCreateSessionId(): string {
    const KEY = 'tf_session_id';
    let sid = localStorage.getItem(KEY);
    if (!sid) {
      sid = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem(KEY, sid);
    }
    return sid;
  }
}
