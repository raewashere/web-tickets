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
   * Triggers notification batch for top pending users on the waitlist
   * via the notify-waitlist Edge Function (updates DB status + sends Resend emails).
   */
  async notifyWaitlist(
    eventId: string,
    ticketTypeId: string | null = null,
    limit: number = 10
  ): Promise<{
    notified: { id: string; email: string; ticket_type_name: string; created_at: string; notified_at: string }[];
    emailsSent: number;
    emailStatus: string;
  }> {
    const { data, error } = await this.supabase.functions.invoke('notify-waitlist', {
      body: {
        eventId,
        ticketTypeId: ticketTypeId || null,
        limit,
      },
    });

    if (error) {
      console.error('Error invoking notify-waitlist function:', error);
      throw new Error(error.message || 'No se pudo procesar el envío de notificaciones a la lista de espera.');
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return {
      notified: (data?.notified || []) as {
        id: string;
        email: string;
        ticket_type_name: string;
        created_at: string;
        notified_at: string;
      }[],
      emailsSent: Number(data?.emailsSent ?? 0),
      emailStatus: String(data?.emailStatus ?? 'sent'),
    };
  }
}
