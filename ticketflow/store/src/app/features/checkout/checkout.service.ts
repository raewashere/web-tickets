import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService, AuthService } from '@ticketflow/data-access';
import type { Order, Coupon } from '@ticketflow/models';

export interface CartStoredItem {
  ticketTypeId: string;
  lockId: string;       // ticket_locks.id — needed to release the lock
  name: string;
  sku: string;
  price: number;
  quantity: number;
}

export interface StoredCart {
  eventId: string;
  eventName: string;
  eventDate: string;
  venueName?: string;
  sessionId: string;    // Used to identify ticket_locks rows
  items: CartStoredItem[];
  createdAt: number;
}

// Server-calculated coupon result (returned by apply-coupon Edge Function)
export interface CouponResult {
  valid: boolean;
  couponId?: string;
  code?: string;
  type?: string;
  value?: number;
  discountAmount?: number;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly auth     = inject(AuthService);

  /** The Supabase project URL used to invoke Edge Functions */
  private get supabaseUrl(): string {
    // Access the same URL the SupabaseService uses
    return (this.supabase as unknown as { supabaseUrl: string }).supabaseUrl
      ?? 'https://kevgwhiosnyemaftbjqs.supabase.co';
  }

  readonly cart           = signal<StoredCart | null>(null);
  readonly appliedCoupon  = signal<Coupon | null>(null);

  /** Server-verified discount amount (set after apply-coupon Edge Function responds) */
  readonly serverDiscount = signal<number>(0);

  /** Platform commission rate (loaded from platform_settings, fallback 20%) */
  readonly commissionRate = signal<number>(0.20);

  readonly expiryTime = signal<number>(Date.now() + 10 * 60 * 1000);

  readonly subtotal = computed(() => {
    const c = this.cart();
    if (!c || !c.items) return 0;
    return c.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  });

  readonly discount = computed(() => this.serverDiscount());

  readonly commission = computed(() => {
    const tot = this.subtotal() - this.discount();
    if (tot <= 0) return 0;
    return Math.round(tot * this.commissionRate() * 100) / 100;
  });

  readonly total = computed(() =>
    Math.max(0, this.subtotal() - this.discount() + this.commission())
  );

  constructor() {
    this.loadCart();
    this.loadCommissionRate();
  }

  async loadCommissionRate(): Promise<void> {
    try {
      const { data } = await this.supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'commission_rate')
        .maybeSingle();

      if (data && data.value !== undefined && data.value !== null) {
        const parsed = typeof data.value === 'number'
          ? data.value
          : parseFloat(String(data.value).replace(/['"]/g, ''));
        if (!isNaN(parsed) && parsed >= 0) {
          this.commissionRate.set(parsed);
        }
      }
    } catch (err) {
      console.error('Error loading platform commission rate:', err);
    }
  }

  loadCart(): StoredCart | null {
    try {
      const raw = sessionStorage.getItem('tf_cart');
      if (raw) {
        const parsed = JSON.parse(raw) as StoredCart;
        this.cart.set(parsed);
        const exp = (parsed.createdAt || Date.now()) + 10 * 60 * 1000;
        this.expiryTime.set(exp);
        return parsed;
      }
    } catch (e) {
      console.error('Error loading cart from storage:', e);
    }
    this.cart.set(null);
    return null;
  }

  // ---------------------------------------------------------------------------
  // Coupon — server-side validated via Edge Function
  // ---------------------------------------------------------------------------

  async applyCoupon(code: string): Promise<CouponResult> {
    const c = this.cart();
    if (!c) {
      return { valid: false, message: 'No hay boletos en el carrito.' };
    }

    const session = await this.supabase.auth.getSession();
    const token   = session.data.session?.access_token;
    if (!token) {
      return { valid: false, message: 'Sesión de usuario no válida.' };
    }

    try {
      const res = await fetch(`${this.supabaseUrl}/functions/v1/apply-coupon`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          code,
          eventId:  c.eventId,
          subtotal: this.subtotal(),
        }),
      });

      const result = await res.json() as CouponResult & { error?: string };

      if (!res.ok) {
        return { valid: false, message: result.error ?? 'Error al validar el cupón.' };
      }

      if (result.valid && result.couponId) {
        // Store coupon as a minimal Coupon object for display purposes
        this.appliedCoupon.set({
          id:         result.couponId,
          code:       result.code ?? code,
          type:       result.type as Coupon['type'],
          value:      result.value ?? 0,
          event_id:   c.eventId,
          is_active:  true,
          uses_count: 0,
        } as Coupon);
        this.serverDiscount.set(result.discountAmount ?? 0);
      }

      return result;
    } catch (err) {
      console.error('applyCoupon error:', err);
      return { valid: false, message: 'Error de conexión al validar el cupón.' };
    }
  }

  removeCoupon(): void {
    this.appliedCoupon.set(null);
    this.serverDiscount.set(0);
  }

  // ---------------------------------------------------------------------------
  // Finalize order — delegates to Edge Function (server-side atomic)
  // ---------------------------------------------------------------------------

  async finalizeOrder(paypalOrderId: string, isFree = false): Promise<Order> {
    const c    = this.cart();
    const user = this.auth.user();

    if (!c || !user) {
      throw new Error('Sesión de compra o usuario no válido.');
    }

    const session = await this.supabase.auth.getSession();
    const token   = session.data.session?.access_token;
    if (!token) {
      throw new Error('Sesión de usuario no válida.');
    }

    const coup = this.appliedCoupon();

    const res = await fetch(`${this.supabaseUrl}/functions/v1/create-order`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        paypalOrderId,
        sessionId:  c.sessionId,
        eventId:    c.eventId,
        couponId:   coup ? coup.id : null,
        isFree,
      }),
    });

    const result = await res.json() as { order?: Order; error?: string };

    if (!res.ok || !result.order) {
      throw new Error(result.error ?? 'No se pudo completar la orden.');
    }

    // Clear cart after successful server-side order creation
    this.clearCart();

    return result.order;
  }

  // ---------------------------------------------------------------------------
  // Release all ticket locks for the current session (cancel / timeout)
  // ---------------------------------------------------------------------------

  async releaseAllLocks(): Promise<void> {
    const c = this.cart();
    if (!c?.sessionId) return;

    try {
      // Call each lock individually using the existing SQL function
      const lockIds = c.items
        .map((i) => i.lockId)
        .filter(Boolean);

      const releasePromises = lockIds.map((lockId) =>
        this.supabase.rpc('release_ticket_lock', { p_lock_id: lockId })
      );

      await Promise.allSettled(releasePromises);
    } catch (err) {
      console.error('releaseAllLocks error:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Clear cart (also releases locks)
  // ---------------------------------------------------------------------------

  clearCart(): void {
    sessionStorage.removeItem('tf_cart');
    this.cart.set(null);
    this.appliedCoupon.set(null);
    this.serverDiscount.set(0);
  }

  /**
   * Cancel checkout: release locks then clear cart.
   * Call this from the Cancel button and on timer expiry.
   */
  async cancelCheckout(): Promise<void> {
    await this.releaseAllLocks();
    this.clearCart();
  }
}
