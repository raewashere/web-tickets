import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@ticketflow/data-access';
import type { DashboardStats, Event } from '@ticketflow/models';

export interface DailySalesRecord {
  date: string; // YYYY-MM-DD
  revenue: number;
  tickets: number;
}

export interface WeeklyTrend {
  percentage: number;
  isPositive: boolean;
  label: string;
}

export interface DashboardResponse {
  stats: DashboardStats;
  upcomingEvents: Event[];
  dailySales: DailySalesRecord[];
  weeklyTrend: WeeklyTrend;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly supabase = inject(SupabaseService).client;

  /** Fetch statistics, real daily sales and upcoming events from the database */
  async getStats(artistId: string): Promise<DashboardResponse> {
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
      const { data: ticketTypes, error: ttError } = await this.supabase
        .from('ticket_types')
        .select('stock, sold')
        .in('event_id', eventIds);

      if (ttError) {
        console.error('Error loading ticket types for dashboard:', ttError);
      }

      (ticketTypes ?? []).forEach((tt) => {
        totalSold += tt.sold || 0;
        totalStock += tt.stock || 0;
      });
    }

    // 3. Fetch real confirmed orders with their created_at timestamp and order_items
    let netRevenue = 0;
    const salesByDate = new Map<string, { revenue: number; tickets: number }>();

    if (eventIds.length > 0) {
      const { data: orders, error: ordersError } = await this.supabase
        .from('orders')
        .select('id, total, commission_amount, created_at, order_items(quantity)')
        .in('event_id', eventIds)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: true });

      if (ordersError) {
        console.error('Error loading orders for dashboard:', ordersError);
      }

      (orders ?? []).forEach((o) => {
        const orderNet = (o.total || 0) - (o.commission_amount || 0);
        netRevenue += orderNet;

        if (o.created_at) {
          const orderDate = new Date(o.created_at);
          const year = orderDate.getFullYear();
          const month = String(orderDate.getMonth() + 1).padStart(2, '0');
          const day = String(orderDate.getDate()).padStart(2, '0');
          const dateKey = `${year}-${month}-${day}`;

          let orderTickets = (o.order_items || []).reduce(
            (sum: number, item: { quantity?: number }) => sum + (item.quantity || 0),
            0
          );
          if (orderTickets === 0 && orderNet > 0) {
            orderTickets = 1;
          }

          const current = salesByDate.get(dateKey) || { revenue: 0, tickets: 0 };
          salesByDate.set(dateKey, {
            revenue: current.revenue + orderNet,
            tickets: current.tickets + orderTickets,
          });
        }
      });
    }

    const dailySales: DailySalesRecord[] = Array.from(salesByDate.entries()).map(([date, val]) => ({
      date,
      revenue: val.revenue,
      tickets: val.tickets,
    }));

    // Calculate real weekly trend (last 7 days vs previous 7 days)
    const now = new Date();
    let currentWeekRevenue = 0;
    let previousWeekRevenue = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const key = `${year}-${month}-${day}`;
      currentWeekRevenue += salesByDate.get(key)?.revenue || 0;
    }

    for (let i = 7; i < 14; i++) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const key = `${year}-${month}-${day}`;
      previousWeekRevenue += salesByDate.get(key)?.revenue || 0;
    }

    let trendPercentage = 0;
    let isPositive = true;
    let trendLabel = '0% esta semana';

    if (previousWeekRevenue > 0) {
      trendPercentage = Math.round(((currentWeekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100);
      isPositive = trendPercentage >= 0;
      trendLabel = `${trendPercentage >= 0 ? '+' : ''}${trendPercentage}% vs sem. ant.`;
    } else if (currentWeekRevenue > 0) {
      trendPercentage = 100;
      isPositive = true;
      trendLabel = '+100% esta semana';
    } else {
      trendLabel = 'Sin ventas esta semana';
      isPositive = true;
    }

    // 4. Upcoming published events
    const todayStr = new Date().toISOString();
    const futurePublished = allEvents.filter(
      (e) => e.status === 'published' && (!e.event_date || e.event_date >= todayStr)
    );
    const upcoming = (futurePublished.length > 0 ? futurePublished : allEvents.filter((e) => e.status === 'published')).slice(0, 5);

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
      dailySales,
      weeklyTrend: {
        percentage: trendPercentage,
        isPositive,
        label: trendLabel,
      },
    };
  }
}
