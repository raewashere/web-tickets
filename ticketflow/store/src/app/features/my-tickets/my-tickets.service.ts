import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@ticketflow/data-access';
import type { OrderWithRelations } from '@ticketflow/models';

@Injectable({ providedIn: 'root' })
export class MyTicketsService {
  private readonly supabase = inject(SupabaseService).client;

  /**
   * Fetch all orders placed by the customer with full event and items info.
   */
  async getMyOrders(customerId: string): Promise<OrderWithRelations[]> {
    const { data, error } = await this.supabase
      .from('orders')
      .select('*, events(*, venues(*), artists(*)), order_items(*, ticket_types(*)), coupons(*)')
      .eq('customer_id', customerId)
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customer orders:', error);
      throw error;
    }

    return (data || []) as OrderWithRelations[];
  }
}
