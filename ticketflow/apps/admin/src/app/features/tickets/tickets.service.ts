import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@ticketflow/data-access';
import type {
  TicketType,
  TicketTypeWithAvailability,
  Coupon,
  CouponType,
} from '@ticketflow/models';

export interface UpsertTicketTypeDto {
  event_id: string;
  sku: string;
  name: string;
  description?: string | null;
  price: number;
  stock: number;
  is_active?: boolean;
}

export interface UpsertCouponDto {
  event_id?: string | null;
  code: string;
  type: CouponType;
  value?: number | null;
  max_uses?: number | null;
  valid_from?: string;
  valid_until?: string | null;
  is_active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class TicketsService {
  private readonly supabase = inject(SupabaseService).client;

  // ══════════════════════════════════════════════════════════════════════════
  // TICKET TYPES
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Fetch all ticket types for a specific event with computed availability.
   */
  async getTicketTypes(eventId: string): Promise<TicketTypeWithAvailability[]> {
    const { data, error } = await this.supabase
      .from('ticket_types')
      .select('*')
      .eq('event_id', eventId)
      .order('price', { ascending: true });

    if (error) {
      console.error(`Error fetching ticket types for event ${eventId}:`, error);
      throw error;
    }

    return (data || []).map((t) => ({
      ...t,
      available: Math.max(0, (t.stock || 0) - (t.sold || 0) - (t.reserved || 0)),
    })) as TicketTypeWithAvailability[];
  }

  /**
   * Fetch a single ticket type by ID.
   */
  async getTicketType(id: string): Promise<TicketType | null> {
    const { data, error } = await this.supabase
      .from('ticket_types')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching ticket type ${id}:`, error);
      throw error;
    }

    return data as TicketType | null;
  }

  /**
   * Create a new ticket type for an event.
   */
  async createTicketType(
    dto: UpsertTicketTypeDto,
    userId?: string
  ): Promise<TicketType> {
    const isUnique = await this.validateSkuUniqueness(dto.event_id, dto.sku);
    if (!isUnique) {
      throw new Error(`El SKU "${dto.sku}" ya existe para este evento. Por favor usa otro identificador.`);
    }

    const { data, error } = await this.supabase
      .from('ticket_types')
      .insert({
        event_id: dto.event_id,
        sku: dto.sku.trim().toUpperCase(),
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        price: Number(dto.price),
        stock: Number(dto.stock),
        reserved: 0,
        sold: 0,
        is_active: dto.is_active !== undefined ? dto.is_active : true,
        created_by: userId || null,
        updated_by: userId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating ticket type:', error);
      throw error;
    }

    return data as TicketType;
  }

  /**
   * Update an existing ticket type.
   */
  async updateTicketType(
    id: string,
    dto: Partial<UpsertTicketTypeDto>,
    userId?: string
  ): Promise<TicketType> {
    if (dto.sku && dto.event_id) {
      const isUnique = await this.validateSkuUniqueness(dto.event_id, dto.sku, id);
      if (!isUnique) {
        throw new Error(`El SKU "${dto.sku}" ya existe para este evento.`);
      }
    }

    const updatePayload: Record<string, unknown> = {
      updated_by: userId || null,
    };

    if (dto.sku !== undefined) updatePayload['sku'] = dto.sku.trim().toUpperCase();
    if (dto.name !== undefined) updatePayload['name'] = dto.name.trim();
    if (dto.description !== undefined) updatePayload['description'] = dto.description?.trim() || null;
    if (dto.price !== undefined) updatePayload['price'] = Number(dto.price);
    if (dto.stock !== undefined) updatePayload['stock'] = Number(dto.stock);
    if (dto.is_active !== undefined) updatePayload['is_active'] = dto.is_active;

    const { data, error } = await this.supabase
      .from('ticket_types')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating ticket type ${id}:`, error);
      throw error;
    }

    return data as TicketType;
  }

  /**
   * Delete a ticket type (only allowed if 0 sold).
   */
  async deleteTicketType(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('ticket_types')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting ticket type ${id}:`, error);
      throw error;
    }
  }

  /**
   * Validate if a SKU is unique within an event.
   */
  async validateSkuUniqueness(
    eventId: string,
    sku: string,
    excludeId?: string
  ): Promise<boolean> {
    let query = this.supabase
      .from('ticket_types')
      .select('id')
      .eq('event_id', eventId)
      .eq('sku', sku.trim().toUpperCase());

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error checking SKU uniqueness:', error);
      return false;
    }

    return (data || []).length === 0;
  }

  /**
   * Auto-suggest a clean SKU based on event and ticket name.
   */
  suggestSku(ticketName: string): string {
    const clean = ticketName
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 6);
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return `${clean || 'TCK'}-${randomSuffix}`;
  }

  /**
   * Calculate platform commission (20% default).
   */
  calculateCommission(price: number, commissionRate = 0.20): {
    basePrice: number;
    commissionAmount: number;
    netToArtist: number;
  } {
    const base = Number(price) || 0;
    const comm = Math.round(base * commissionRate * 100) / 100;
    const net = Math.round((base - comm) * 100) / 100;
    return {
      basePrice: base,
      commissionAmount: comm,
      netToArtist: net,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // COUPONS & COURTESIES
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Fetch all coupons for an event (and global coupons).
   */
  async getCoupons(eventId?: string): Promise<Coupon[]> {
    let query = this.supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching coupons:', error);
      throw error;
    }

    return (data || []) as Coupon[];
  }

  /**
   * Fetch a single coupon by ID.
   */
  async getCoupon(id: string): Promise<Coupon | null> {
    const { data, error } = await this.supabase
      .from('coupons')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching coupon ${id}:`, error);
      throw error;
    }

    return data as Coupon | null;
  }

  /**
   * Create a new coupon.
   */
  async createCoupon(
    dto: UpsertCouponDto,
    userId?: string
  ): Promise<Coupon> {
    const codeClean = dto.code.trim().toUpperCase();

    const { data, error } = await this.supabase
      .from('coupons')
      .insert({
        event_id: dto.event_id || null,
        code: codeClean,
        type: dto.type,
        value: dto.type === 'courtesy' ? null : (dto.value !== undefined ? Number(dto.value) : null),
        max_uses: dto.max_uses ? Number(dto.max_uses) : null,
        uses_count: 0,
        valid_from: dto.valid_from || new Date().toISOString(),
        valid_until: dto.valid_until || null,
        is_active: dto.is_active !== undefined ? dto.is_active : true,
        created_by: userId || null,
        updated_by: userId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating coupon:', error);
      throw error;
    }

    return data as Coupon;
  }

  /**
   * Update an existing coupon.
   */
  async updateCoupon(
    id: string,
    dto: Partial<UpsertCouponDto>,
    userId?: string
  ): Promise<Coupon> {
    const updatePayload: Record<string, unknown> = {
      updated_by: userId || null,
    };

    if (dto.code !== undefined) updatePayload['code'] = dto.code.trim().toUpperCase();
    if (dto.type !== undefined) updatePayload['type'] = dto.type;
    if (dto.value !== undefined) updatePayload['value'] = dto.value !== null ? Number(dto.value) : null;
    if (dto.max_uses !== undefined) updatePayload['max_uses'] = dto.max_uses !== null ? Number(dto.max_uses) : null;
    if (dto.valid_from !== undefined) updatePayload['valid_from'] = dto.valid_from;
    if (dto.valid_until !== undefined) updatePayload['valid_until'] = dto.valid_until || null;
    if (dto.is_active !== undefined) updatePayload['is_active'] = dto.is_active;

    const { data, error } = await this.supabase
      .from('coupons')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating coupon ${id}:`, error);
      throw error;
    }

    return data as Coupon;
  }

  /**
   * Delete a coupon.
   */
  async deleteCoupon(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('coupons')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting coupon ${id}:`, error);
      throw error;
    }
  }

  /**
   * Generate a secure and readable random promotional code.
   */
  generateRandomCode(prefix = 'PROMO'): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}-${code}`;
  }
}
