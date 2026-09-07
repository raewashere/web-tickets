import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@ticketflow/data-access';
import type { Artist, ArtistType, ArtistWithType } from '@ticketflow/models';
import { STORAGE_BUCKETS } from '@ticketflow/models';

export interface UpsertArtistDto {
  name: string;
  artist_type_id?: string | null;
  description?: string | null;
  tax_id?: string | null;
  legal_name?: string | null;
  postal_code?: string | null;
  email?: string | null;
  phone_number?: string | null;
  photo_url?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ArtistsService {
  private readonly supabase = inject(SupabaseService).client;

  /** Fetch the artist profile belonging to the specified user ID with joined artist_types */
  async getMyArtistProfile(userId: string): Promise<ArtistWithType | null> {
    const { data, error } = await this.supabase
      .from('artists')
      .select('*, artist_types(*)')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching artist profile:', error);
      throw error;
    }

    return data as ArtistWithType | null;
  }

  /** Create an artist profile for the logged in user */
  async createArtistProfile(
    userId: string,
    dto: UpsertArtistDto,
    photoFile?: File
  ): Promise<Artist> {
    let photoUrl = dto.photo_url;

    if (photoFile) {
      photoUrl = await this.uploadPhoto(photoFile, userId);
    }

    const { data, error } = await this.supabase
      .from('artists')
      .insert({
        user_id: userId,
        name: dto.name,
        artist_type_id: dto.artist_type_id || null,
        description: dto.description || null,
        tax_id: dto.tax_id || null,
        legal_name: dto.legal_name || null,
        postal_code: dto.postal_code || null,
        email: dto.email || null,
        phone_number: dto.phone_number || null,
        photo_url: photoUrl || null,
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating artist profile:', error);
      throw error;
    }

    return data as Artist;
  }

  /** Update an existing artist profile */
  async updateArtistProfile(
    artistId: string,
    userId: string,
    dto: UpsertArtistDto,
    photoFile?: File
  ): Promise<Artist> {
    let photoUrl = dto.photo_url;

    if (photoFile) {
      photoUrl = await this.uploadPhoto(photoFile, userId);
    }

    const updatePayload: Record<string, unknown> = {
      name: dto.name,
      artist_type_id: dto.artist_type_id || null,
      description: dto.description || null,
      tax_id: dto.tax_id || null,
      legal_name: dto.legal_name || null,
      postal_code: dto.postal_code || null,
      email: dto.email || null,
      phone_number: dto.phone_number || null,
      updated_by: userId,
    };

    if (photoUrl !== undefined) {
      updatePayload['photo_url'] = photoUrl;
    }

    const { data, error } = await this.supabase
      .from('artists')
      .update(updatePayload)
      .eq('id', artistId)
      .select()
      .single();

    if (error) {
      console.error('Error updating artist profile:', error);
      throw error;
    }

    return data as Artist;
  }

  /** Upload artist photo to Supabase Storage and get public URL */
  async uploadPhoto(file: File, userId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/photo-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await this.supabase.storage
      .from(STORAGE_BUCKETS.ARTIST_PHOTOS)
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type || 'image/png',
      });

    if (uploadError) {
      console.error('Error uploading photo:', uploadError);
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = this.supabase.storage
      .from(STORAGE_BUCKETS.ARTIST_PHOTOS)
      .getPublicUrl(filePath);

    return publicUrl;
  }

  /** Fetch catalog of artist types (banda, solista, dj, etc.) */
  async getArtistTypes(): Promise<ArtistType[]> {
    const { data, error } = await this.supabase
      .from('artist_types')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching artist types:', error);
      return [];
    }

    return (data ?? []) as ArtistType[];
  }
}
