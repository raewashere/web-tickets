import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@ticketflow/data-access';
import type { OrderWithRelations } from '@ticketflow/models';

@Injectable({ providedIn: 'root' })
export class MyTicketsService {
  private readonly supabase = inject(SupabaseService).client;

  /**
   * Fetch all orders placed by the customer with full event, items, and refund info.
   */
  async getMyOrders(customerId: string): Promise<OrderWithRelations[]> {
    const { data, error } = await this.supabase
      .from('orders')
      .select('*, events(*, venues(*), artists(*)), order_items(*, ticket_types(*)), coupons(*), refund_requests(*)')
      .eq('customer_id', customerId)
      .in('status', ['confirmed', 'refunded'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customer orders:', error);
      throw error;
    }

    return (data || []) as OrderWithRelations[];
  }

  /**
   * Request a refund for a confirmed order.
   */
  async requestRefund(orderId: string, reason: string): Promise<{ success: boolean; error?: string; request_id?: string }> {
    const { data, error } = await this.supabase.rpc('request_order_refund', {
      p_order_id: orderId,
      p_reason: reason.trim(),
    });

    if (error) {
      console.error('Error calling request_order_refund:', error);
      return { success: false, error: error.message };
    }

    const res = data as { success: boolean; error?: string; request_id?: string };
    return res;
  }
}
