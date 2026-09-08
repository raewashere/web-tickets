import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@ticketflow/data-access';
import type { EventType } from '@ticketflow/models';
import type { StoreEventItem } from '../../shared/ui/event-card.component';

@Injectable({ providedIn: 'root' })
export class HomeService {
  private readonly supabase = inject(SupabaseService).client;

  /**
   * Fetch upcoming published events for the home showcase.
   */
  async getFeaturedEvents(): Promise<StoreEventItem[]> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const nowIso = startOfToday.toISOString();

    const { data, error } = await this.supabase
      .from('events')
      .select('*, artists(id, name, photo_url), venues(id, name, latitude, longitude, map_url, verified), venue_configurations(id, name, capacity), event_types(*), ticket_types(*)')
      .eq('status', 'published')
      .gte('event_date', nowIso)
      .order('event_date', { ascending: true })
      .limit(12);

    if (error) {
      console.error('Error loading featured events for home:', error);
      throw error;
    }

    return (data || []) as StoreEventItem[];
  }

  /**
   * Fetch all event types for category pills.
   */
  async getEventTypes(): Promise<EventType[]> {
    const { data, error } = await this.supabase
      .from('event_types')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error loading event types for home:', error);
      throw error;
    }

    return (data || []) as EventType[];
  }
}
