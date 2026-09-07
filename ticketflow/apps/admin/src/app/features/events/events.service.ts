import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@ticketflow/data-access';
import type {
  Event,
  EventType,
  EventStatus,
  EventWithRelations,
  TicketType,
  Coupon,
} from '@ticketflow/models';
import { STORAGE_BUCKETS } from '@ticketflow/models';

export interface UpsertEventDto {
  artist_id: string;
  name: string;
  flyer_url?: string | null;
  description?: string | null;
  event_type_id: string;
  venue_id: string;
  venue_configuration_id: string;
  event_date: string;
  doors_open?: string | null;
  shared?: boolean;
  status?: EventStatus;
}

export interface EventDetailWithAll extends EventWithRelations {
  ticket_types?: TicketType[];
  coupons?: Coupon[];
}

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly supabase = inject(SupabaseService).client;

  /**
   * Fetch all events for a given artist (or all if admin), with relations.
   */
  async getMyEvents(artistId?: string, statusFilter?: string): Promise<EventWithRelations[]> {
    let query = this.supabase
      .from('events')
      .select('*, artists(id, name, photo_url), event_types(*), venues(id, name, latitude, longitude, map_url, verified), venue_configurations(id, name, capacity)')
      .order('event_date', { ascending: false });

    if (artistId) {
      query = query.eq('artist_id', artistId);
    }

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching events:', error);
      throw error;
    }

    return (data || []) as EventWithRelations[];
  }

  /**
   * Fetch a single event by ID with all relations, ticket types, and coupons.
   */
  async getEvent(id: string): Promise<EventDetailWithAll | null> {
    const { data, error } = await this.supabase
      .from('events')
      .select('*, artists(id, name, photo_url), event_types(*), venues(id, name, latitude, longitude, map_url, verified), venue_configurations(id, name, capacity), ticket_types(*), coupons(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching event ${id}:`, error);
      throw error;
    }

    return data as EventDetailWithAll | null;
  }

  /**
   * Fetch all available event types from catalog.
   */
  async getEventTypes(): Promise<EventType[]> {
    const { data, error } = await this.supabase
      .from('event_types')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching event types:', error);
      throw error;
    }

    return (data || []) as EventType[];
  }

  /**
   * Create a new event.
   */
  async createEvent(
    dto: UpsertEventDto,
    flyerFile?: File,
    userId?: string
  ): Promise<Event> {
    let flyerUrl = dto.flyer_url;

    if (flyerFile) {
      flyerUrl = await this.uploadFlyer(flyerFile, dto.artist_id);
    }

    const { data, error } = await this.supabase
      .from('events')
      .insert({
        artist_id: dto.artist_id,
        name: dto.name.trim(),
        flyer_url: flyerUrl || null,
        description: dto.description?.trim() || null,
        event_type_id: dto.event_type_id,
        venue_id: dto.venue_id,
        venue_configuration_id: dto.venue_configuration_id,
        event_date: dto.event_date,
        doors_open: dto.doors_open || null,
        shared: dto.shared || false,
        status: dto.status || 'draft',
        created_by: userId || null,
        updated_by: userId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating event:', error);
      throw error;
    }

    return data as Event;
  }

  /**
   * Update an existing event.
   */
  async updateEvent(
    id: string,
    dto: Partial<UpsertEventDto>,
    flyerFile?: File,
    userId?: string
  ): Promise<Event> {
    let flyerUrl = dto.flyer_url;

    if (flyerFile && dto.artist_id) {
      flyerUrl = await this.uploadFlyer(flyerFile, dto.artist_id);
    }

    const updatePayload: Record<string, unknown> = {
      updated_by: userId || null,
    };

    if (dto.name !== undefined) updatePayload['name'] = dto.name.trim();
    if (dto.description !== undefined) updatePayload['description'] = dto.description?.trim() || null;
    if (flyerUrl !== undefined) updatePayload['flyer_url'] = flyerUrl;
    if (dto.event_type_id !== undefined) updatePayload['event_type_id'] = dto.event_type_id;
    if (dto.venue_id !== undefined) updatePayload['venue_id'] = dto.venue_id;
    if (dto.venue_configuration_id !== undefined) updatePayload['venue_configuration_id'] = dto.venue_configuration_id;
    if (dto.event_date !== undefined) updatePayload['event_date'] = dto.event_date;
    if (dto.doors_open !== undefined) updatePayload['doors_open'] = dto.doors_open || null;
    if (dto.shared !== undefined) updatePayload['shared'] = dto.shared;
    if (dto.status !== undefined) updatePayload['status'] = dto.status;

    const { data, error } = await this.supabase
      .from('events')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating event ${id}:`, error);
      throw error;
    }

    return data as Event;
  }

  /**
   * Publish an event.
   */
  async publishEvent(id: string, userId?: string): Promise<Event> {
    const { data, error } = await this.supabase
      .from('events')
      .update({
        status: 'published',
        updated_by: userId || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error publishing event ${id}:`, error);
      throw error;
    }

    return data as Event;
  }

  /**
   * Cancel an event.
   */
  async cancelEvent(id: string, userId?: string): Promise<Event> {
    const { data, error } = await this.supabase
      .from('events')
      .update({
        status: 'cancelled',
        updated_by: userId || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error cancelling event ${id}:`, error);
      throw error;
    }

    return data as Event;
  }

  /**
   * Delete a draft event.
   * Validates: no confirmed orders exist and event is in draft/cancelled state.
   */
  async deleteEvent(id: string): Promise<void> {
    // Check for confirmed orders
    const { count, error: countError } = await this.supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', id)
      .eq('status', 'confirmed');

    if (countError) {
      console.error(`Error checking orders for event ${id}:`, countError);
      throw countError;
    }

    if (count && count > 0) {
      throw new Error(
        `No se puede eliminar el evento: tiene ${count} orden(es) confirmada(s). Cancela el evento en su lugar.`
      );
    }

    // Only allow deleting draft or cancelled events
    const { data: eventData, error: fetchError } = await this.supabase
      .from('events')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError || !eventData) {
      throw fetchError || new Error('Evento no encontrado.');
    }

    if (!['draft', 'cancelled'].includes(eventData.status)) {
      throw new Error(
        `Solo se pueden eliminar eventos en borrador o cancelados. Estado actual: "${eventData.status}".`
      );
    }

    const { error } = await this.supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting event ${id}:`, error);
      throw error;
    }
  }

  /**
   * Upload flyer image to Supabase Storage bucket `event-flyers`.
   */
  async uploadFlyer(file: File, artistId: string): Promise<string> {
    const ext = file.name.split('.').pop() || 'png';
    const filePath = `${artistId}/${Date.now()}.${ext}`;

    const { data, error } = await this.supabase.storage
      .from(STORAGE_BUCKETS.EVENT_FLYERS)
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type || 'image/png',
      });

    if (error) {
      console.error('Error uploading flyer:', error);
      throw error;
    }

    const { data: urlData } = this.supabase.storage
      .from(STORAGE_BUCKETS.EVENT_FLYERS)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  }
}
