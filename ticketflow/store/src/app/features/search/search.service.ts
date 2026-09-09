import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@ticketflow/data-access';
import type { EventType } from '@ticketflow/models';
import type { StoreEventItem } from '../../shared/ui/event-card.component';

export interface SearchFilterParams {
  query?: string;
  eventTypeId?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: 'date_asc' | 'date_desc' | 'name_asc';
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  events: StoreEventItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly supabase = inject(SupabaseService).client;

  /**
   * Search published events with filters and pagination.
   */
  async searchEvents(params: SearchFilterParams): Promise<SearchResult> {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.max(1, params.pageSize || 12);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.supabase
      .from('events')
      .select('*, artists(id, name, photo_url, description, gallery_urls), venues(id, name, latitude, longitude, map_url, verified), venue_configurations(id, name, capacity), event_types(*), ticket_types(*)', { count: 'exact' })
      .eq('status', 'published');

    if (params.query && params.query.trim()) {
      const q = params.query.trim();
      // Find matching artists to allow searching by artist name as well as event name
      try {
        const { data: matchingArtists } = await this.supabase
          .from('artists')
          .select('id')
          .ilike('name', `%${q}%`);

        if (matchingArtists && matchingArtists.length > 0) {
          const artistConditions = matchingArtists.map((a) => `artist_id.eq.${a.id}`).join(',');
          query = query.or(`name.ilike.%${q}%,${artistConditions}`);
        } else {
          query = query.ilike('name', `%${q}%`);
        }
      } catch {
        query = query.ilike('name', `%${q}%`);
      }
    }

    if (params.eventTypeId) {
      query = query.eq('event_type_id', params.eventTypeId);
    }

    if (params.dateFrom) {
      query = query.gte('event_date', params.dateFrom);
    } else if (!params.query) {
      // Default: future events from start of today if not searching specifically
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      query = query.gte('event_date', startOfToday.toISOString());
    }

    if (params.dateTo) {
      query = query.lte('event_date', params.dateTo);
    }

    if (params.sort === 'date_desc') {
      query = query.order('event_date', { ascending: false });
    } else if (params.sort === 'name_asc') {
      query = query.order('name', { ascending: true });
    } else {
      query = query.order('event_date', { ascending: true });
    }

    const { data, count, error } = await query.range(from, to);

    if (error) {
      console.error('Error searching events:', error);
      throw error;
    }

    const now = Date.now();
    let events = (data || []) as StoreEventItem[];
    if (!params.dateTo && !params.dateFrom) {
      events = events.filter((ev) => {
        if (!ev.event_date) return false;
        const eventTime = new Date(ev.event_date).getTime();
        const durationMs = (ev.duration_minutes || 120) * 60 * 1000;
        return eventTime + durationMs >= now;
      });
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize);

    return {
      events,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Fetch all event types for the filter panel.
   */
  async getEventTypes(): Promise<EventType[]> {
    const { data, error } = await this.supabase
      .from('event_types')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching event types for search:', error);
      throw error;
    }

    return (data || []) as EventType[];
  }
}
