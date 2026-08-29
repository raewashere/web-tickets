import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@ticketflow/data-access';
import type {
  Venue,
  VenueConfiguration,
  VenueWithConfigurations,
} from '@ticketflow/models';
import { STORAGE_BUCKETS } from '@ticketflow/models';

export interface UpsertVenueDto {
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  map_url?: string | null;
  verified?: boolean;
}

export interface UpsertVenueConfigDto {
  venue_id: string;
  name: string;
  description?: string | null;
  capacity?: number | null;
  is_default?: boolean;
}

@Injectable({ providedIn: 'root' })
export class VenuesService {
  private readonly supabase = inject(SupabaseService).client;

  /**
   * Fetch all venues, optionally filtered by search query.
   * Includes child venue_configurations count and data.
   */
  async getVenues(query?: string): Promise<VenueWithConfigurations[]> {
    let request = this.supabase
      .from('venues')
      .select('*, venue_configurations(*)');

    if (query && query.trim()) {
      request = request.ilike('name', `%${query.trim()}%`);
    }

    const { data, error } = await request
      .order('verified', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching venues:', error);
      throw error;
    }

    return (data || []) as VenueWithConfigurations[];
  }

  /**
   * Fetch a single venue by ID with its configurations.
   */
  async getVenue(id: string): Promise<VenueWithConfigurations | null> {
    const { data, error } = await this.supabase
      .from('venues')
      .select('*, venue_configurations(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching venue ${id}:`, error);
      throw error;
    }

    if (data && data.venue_configurations) {
      // Sort configurations so default is first, then by name
      (data.venue_configurations as VenueConfiguration[]).sort((a, b) => {
        if (a.is_default === b.is_default) {
          return a.name.localeCompare(b.name);
        }
        return a.is_default ? -1 : 1;
      });
    }

    return data as VenueWithConfigurations | null;
  }

  /**
   * Create a new venue, optionally uploading a map/croquis.
   */
  async createVenue(
    dto: UpsertVenueDto,
    mapFile?: File,
    userId?: string
  ): Promise<Venue> {
    let mapUrl = dto.map_url;

    if (mapFile) {
      mapUrl = await this.uploadMap(mapFile, userId);
    }

    const { data, error } = await this.supabase
      .from('venues')
      .insert({
        name: dto.name.trim(),
        latitude: dto.latitude !== undefined ? dto.latitude : null,
        longitude: dto.longitude !== undefined ? dto.longitude : null,
        map_url: mapUrl || null,
        verified: dto.verified || false,
        created_by: userId || null,
        updated_by: userId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating venue:', error);
      throw error;
    }

    return data as Venue;
  }

  /**
   * Update an existing venue.
   */
  async updateVenue(
    id: string,
    dto: UpsertVenueDto,
    mapFile?: File,
    userId?: string
  ): Promise<Venue> {
    let mapUrl = dto.map_url;

    if (mapFile) {
      mapUrl = await this.uploadMap(mapFile, userId);
    }

    const updatePayload: Record<string, unknown> = {
      name: dto.name.trim(),
      latitude: dto.latitude !== undefined ? dto.latitude : null,
      longitude: dto.longitude !== undefined ? dto.longitude : null,
      map_url: mapUrl || null,
      updated_by: userId || null,
    };

    if (dto.verified !== undefined) {
      updatePayload['verified'] = dto.verified;
    }

    const { data, error } = await this.supabase
      .from('venues')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating venue ${id}:`, error);
      throw error;
    }

    return data as Venue;
  }

  /**
   * Delete a venue by ID.
   */
  async deleteVenue(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('venues')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting venue ${id}:`, error);
      throw error;
    }
  }

  /**
   * Fetch all configurations for a given venue.
   */
  async getConfigurations(venueId: string): Promise<VenueConfiguration[]> {
    const { data, error } = await this.supabase
      .from('venue_configurations')
      .select('*')
      .eq('venue_id', venueId)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      console.error(`Error fetching configs for venue ${venueId}:`, error);
      throw error;
    }

    return (data || []) as VenueConfiguration[];
  }

  /**
   * Create a new venue configuration (aforo / distribución).
   */
  async createConfiguration(
    dto: UpsertVenueConfigDto,
    userId?: string
  ): Promise<VenueConfiguration> {
    if (dto.is_default) {
      await this.clearDefaultConfiguration(dto.venue_id);
    }

    const { data, error } = await this.supabase
      .from('venue_configurations')
      .insert({
        venue_id: dto.venue_id,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        capacity: dto.capacity !== undefined ? dto.capacity : null,
        is_default: dto.is_default || false,
        created_by: userId || null,
        updated_by: userId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating venue configuration:', error);
      throw error;
    }

    return data as VenueConfiguration;
  }

  /**
   * Update an existing venue configuration.
   */
  async updateConfiguration(
    id: string,
    dto: Partial<UpsertVenueConfigDto>,
    userId?: string
  ): Promise<VenueConfiguration> {
    if (dto.is_default && dto.venue_id) {
      await this.clearDefaultConfiguration(dto.venue_id, id);
    }

    const updatePayload: Record<string, unknown> = {
      updated_by: userId || null,
    };

    if (dto.name !== undefined) updatePayload['name'] = dto.name.trim();
    if (dto.description !== undefined) updatePayload['description'] = dto.description?.trim() || null;
    if (dto.capacity !== undefined) updatePayload['capacity'] = dto.capacity;
    if (dto.is_default !== undefined) updatePayload['is_default'] = dto.is_default;

    const { data, error } = await this.supabase
      .from('venue_configurations')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating venue configuration ${id}:`, error);
      throw error;
    }

    return data as VenueConfiguration;
  }

  /**
   * Delete a venue configuration.
   */
  async deleteConfiguration(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('venue_configurations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting venue configuration ${id}:`, error);
      throw error;
    }
  }

  private async clearDefaultConfiguration(venueId: string, excludeId?: string): Promise<void> {
    let query = this.supabase
      .from('venue_configurations')
      .update({ is_default: false })
      .eq('venue_id', venueId);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    await query;
  }

  /**
   * Upload venue map / croquis to Supabase Storage.
   */
  async uploadMap(file: File, prefix?: string): Promise<string> {
    const ext = file.name.split('.').pop() || 'png';
    const filePath = `${prefix || 'general'}/${Date.now()}.${ext}`;

    const { data, error } = await this.supabase.storage
      .from(STORAGE_BUCKETS.VENUE_MAPS)
      .upload(filePath, file, { upsert: true });

    if (error) {
      console.error('Error uploading venue map:', error);
      throw error;
    }

    const { data: urlData } = this.supabase.storage
      .from(STORAGE_BUCKETS.VENUE_MAPS)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  }
}
