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
   * Approves or rejects a refund request atomically (including PayPal refund execution via Edge Function).
   */
  async processRefund(
    requestId: string,
    approved: boolean,
    adminNotes?: string
  ): Promise<{ success: boolean; error?: string; status?: string; paypalRefundId?: string | null }> {
    const { data, error } = await this.supabase.functions.invoke('process-refund', {
      body: {
        requestId,
        approved,
        adminNotes: adminNotes?.trim() || null,
      },
    });

    if (error) {
      console.error('Error invoking process-refund function:', error);
      return { success: false, error: error.message || 'Error al procesar el reembolso.' };
    }

    return (data || { success: false, error: 'Respuesta vacía del servidor.' }) as {
      success: boolean;
      error?: string;
      status?: string;
      paypalRefundId?: string | null;
    };
  }
}
