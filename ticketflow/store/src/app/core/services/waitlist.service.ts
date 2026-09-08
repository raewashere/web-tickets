import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@ticketflow/data-access';
import type { CustomerWaitlistSummary } from '@ticketflow/models';

@Injectable({ providedIn: 'root' })
export class WaitlistService {
  private readonly supabase = inject(SupabaseService).client;

  /**
   * Join waitlist for a sold-out event or ticket tier.
   */
  async joinWaitlist(
    eventId: string,
    ticketTypeId: string | null = null,
    email: string,
    phone?: string
  ): Promise<{ success: boolean; message?: string; already_registered?: boolean; error?: string }> {
    const { data, error } = await this.supabase.rpc('join_event_waitlist', {
      p_event_id: eventId,
      p_ticket_type_id: ticketTypeId || null,
      p_email: email.trim(),
      p_phone: phone?.trim() || null,
    });

    if (error) {
      console.error('Error joining waitlist:', error);
      return { success: false, error: error.message };
    }

    return data as { success: boolean; message?: string; already_registered?: boolean; error?: string };
  }

  /**
   * Fetch waitlist subscriptions for the current customer.
   */
  async getMyWaitlist(): Promise<CustomerWaitlistSummary[]> {
    const { data, error } = await this.supabase.rpc('get_my_waitlist');

    if (error) {
      console.error('Error fetching my waitlist:', error);
      return [];
    }

    return (data || []) as CustomerWaitlistSummary[];
  }
}
