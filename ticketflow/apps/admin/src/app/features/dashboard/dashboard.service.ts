import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@ticketflow/data-access';
import type { DashboardStats, Event } from '@ticketflow/models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly supabase = inject(SupabaseService).client;

  /** Fetch high-level statistics for the given artist */
  async getStats(artistId: string): Promise<{
    stats: DashboardStats;
    upcomingEvents: Event[];
  }> {
    // 1. Fetch events count by status
    const { data: events, error: eventsError } = await this.supabase
      .from('events')
      .select('id, name, event_date, status, flyer_url')
      .eq('artist_id', artistId)
      .order('event_date', { ascending: true });

    if (eventsError) {
      console.error('Error loading events for dashboard:', eventsError);
    }

    const allEvents = events ?? [];
    const draftEvents = allEvents.filter((e) => e.status === 'draft').length;
    const publishedEvents = allEvents.filter((e) => e.status === 'published').length;

    // 2. Fetch ticket types to calculate stock and sold
    const eventIds = allEvents.map((e) => e.id);
    let totalSold = 0;
    let totalStock = 0;

    if (eventIds.length > 0) {
      const { data: ticketTypes } = await this.supabase
        .from('ticket_types')
        .select('stock, sold')
        .in('event_id', eventIds);

      (ticketTypes ?? []).forEach((tt) => {
        totalSold += tt.sold || 0;
        totalStock += tt.stock || 0;
      });
    }

    // 3. Fetch net revenue from orders
    let netRevenue = 0;
    if (eventIds.length > 0) {
      const { data: orders } = await this.supabase
        .from('orders')
        .select('total, commission_amount')
        .in('event_id', eventIds)
        .eq('status', 'confirmed');

      (orders ?? []).forEach((o) => {
        netRevenue += (o.total || 0) - (o.commission_amount || 0);
      });
    }

    const upcoming = allEvents.filter((e) => e.status === 'published').slice(0, 5);

    return {
      stats: {
        totalEvents: allEvents.length,
        draftEvents,
        publishedEvents,
        ticketsSold: totalSold,
        ticketsAvailable: Math.max(0, totalStock - totalSold),
        netRevenue,
      },
      upcomingEvents: upcoming as Event[],
    };
  }
}
