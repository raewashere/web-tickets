import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@ticketflow/data-access';
import type { WaitlistEntryWithRelations } from '@ticketflow/models';

@Injectable({ providedIn: 'root' })
export class EventWaitlistService {
  private readonly supabase = inject(SupabaseService).client;

  /**
   * Fetches the waitlist queue for a specific event.
   */
  async getEventWaitlist(eventId: string): Promise<WaitlistEntryWithRelations[]> {
    const { data, error } = await this.supabase.rpc('get_event_waitlist', {
      p_event_id: eventId,
    });

    if (error) {
      console.error('Error fetching event waitlist:', error);
      throw error;
    }

    return (data || []) as WaitlistEntryWithRelations[];
  }

  /**
   * Triggers notification batch for top pending users on the waitlist.
   */
  async notifyWaitlist(
    eventId: string,
    ticketTypeId: string | null = null,
    limit: number = 10
  ): Promise<{ id: string; email: string; ticket_type_name: string; created_at: string; notified_at: string }[]> {
    const { data, error } = await this.supabase.rpc('notify_event_waitlist', {
      p_event_id: eventId,
      p_ticket_type_id: ticketTypeId || null,
      p_limit: limit,
    });

    if (error) {
      console.error('Error notifying waitlist:', error);
      throw error;
    }

    return (data || []) as { id: string; email: string; ticket_type_name: string; created_at: string; notified_at: string }[];
  }
}
