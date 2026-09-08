import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@ticketflow/data-access';
import type { RefundRequestWithRelations } from '@ticketflow/models';

@Injectable({ providedIn: 'root' })
export class RefundsService {
  private readonly supabase = inject(SupabaseService).client;

  /**
   * Fetches all refund requests for the current admin / artist.
   */
  async getRefundRequests(): Promise<RefundRequestWithRelations[]> {
    const { data, error } = await this.supabase.rpc('get_all_refund_requests');

    if (error) {
      console.error('Error fetching refund requests:', error);
      throw error;
    }

    return (data || []) as RefundRequestWithRelations[];
  }

  /**
   * Approves or rejects a refund request atomically.
   */
  async processRefund(
    requestId: string,
    approved: boolean,
    adminNotes?: string
  ): Promise<{ success: boolean; error?: string; status?: string }> {
    const { data, error } = await this.supabase.rpc('process_refund_request', {
      p_request_id: requestId,
      p_approved: approved,
      p_admin_notes: adminNotes?.trim() || null,
    });

    if (error) {
      console.error('Error processing refund request:', error);
      return { success: false, error: error.message };
    }

    return data as { success: boolean; error?: string; status?: string };
  }
}
