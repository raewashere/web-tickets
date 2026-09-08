import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@ticketflow/data-access';
import type {
  ArtistFinancialSummary,
  ArtistPayoutSetting,
  AdminArtistFinancialItem,
} from '@ticketflow/models';

@Injectable({ providedIn: 'root' })
export class FinancesService {
  private readonly supabase = inject(SupabaseService).client;

  /**
   * Fetches the complete financial and payout summary for the artist (or specific artist if admin).
   */
  async getFinancialSummary(artistId?: string): Promise<ArtistFinancialSummary> {
    const { data, error } = await this.supabase.rpc('get_artist_financial_summary', {
      p_artist_id: artistId || null,
    });

    if (error) {
      console.error('Error fetching financial summary:', error);
      throw error;
    }

    return data as ArtistFinancialSummary;
  }

  /**
   * Saves or updates banking & fiscal information for the artist.
   */
  async savePayoutSettings(
    artistId: string,
    settings: Partial<ArtistPayoutSetting>
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const { data, error } = await this.supabase.rpc('upsert_artist_payout_settings', {
      p_artist_id: artistId,
      p_bank_name: settings.bank_name || null,
      p_account_number: settings.bank_account_number || null,
      p_account_holder: settings.bank_account_holder || null,
      p_tax_id: settings.tax_id || null,
      p_tax_regime: settings.tax_regime || null,
      p_payout_email: settings.payout_email || null,
    });

    if (error) {
      console.error('Error saving payout settings:', error);
      return { success: false, error: error.message };
    }

    return data as { success: boolean; message?: string; error?: string };
  }

  /**
   * Super-Admin: Fetches financial balances across all registered artists.
   */
  async getAllArtistsFinancialOverview(): Promise<AdminArtistFinancialItem[]> {
    const { data, error } = await this.supabase.rpc('get_all_artists_financial_overview');

    if (error) {
      console.error('Error fetching all artists financial overview:', error);
      throw error;
    }

    return (data || []) as AdminArtistFinancialItem[];
  }

  /**
   * Super-Admin: Registers a payout / disbursement to an artist.
   */
  async createPayout(
    artistId: string,
    eventId: string | null,
    amount: number,
    method: string,
    reference: string,
    notes: string,
    receiptUrl?: string
  ): Promise<{ success: boolean; message?: string; payout_id?: string; error?: string }> {
    const { data, error } = await this.supabase.rpc('create_payout_record', {
      p_artist_id: artistId,
      p_event_id: eventId || null,
      p_amount: amount,
      p_method: method,
      p_reference: reference?.trim() || null,
      p_notes: notes?.trim() || null,
      p_receipt_url: receiptUrl?.trim() || null,
    });

    if (error) {
      console.error('Error creating payout record:', error);
      return { success: false, error: error.message };
    }

    return data as { success: boolean; message?: string; payout_id?: string; error?: string };
  }
}
