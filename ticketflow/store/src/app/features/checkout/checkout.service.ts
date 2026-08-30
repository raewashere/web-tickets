import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService, AuthService } from '@ticketflow/data-access';
import type { Order, OrderItem, Coupon } from '@ticketflow/models';

export interface CartStoredItem {
  ticketTypeId: string;
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
  items: CartStoredItem[];
  createdAt: number;
}

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly auth = inject(AuthService);

  readonly cart = signal<StoredCart | null>(null);
  readonly appliedCoupon = signal<Coupon | null>(null);
  readonly expiryTime = signal<number>(Date.now() + 10 * 60 * 1000);

  readonly subtotal = computed(() => {
    const c = this.cart();
    if (!c || !c.items) return 0;
    return c.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  });

  readonly discount = computed(() => {
    const c = this.appliedCoupon();
    if (!c) return 0;
    const sub = this.subtotal();

    if (c.type === 'courtesy') {
      return sub; // 100% off
    }
    if (c.type === 'percentage') {
      const pct = Number(c.value) || 0;
      return Math.round((sub * (pct / 100)) * 100) / 100;
    }
    if (c.type === 'fixed') {
      const flat = Number(c.value) || 0;
      return Math.min(sub, flat);
    }
    return 0;
  });

  readonly total = computed(() => {
    return Math.max(0, this.subtotal() - this.discount());
  });

  constructor() {
    this.loadCart();
  }

  loadCart(): StoredCart | null {
    try {
      const raw = sessionStorage.getItem('tf_cart');
      if (raw) {
        const parsed = JSON.parse(raw) as StoredCart;
        this.cart.set(parsed);
        // Expiry 10 minutes from cart creation or now
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

  /**
   * Validate and apply a promotional coupon code.
   */
  async applyCoupon(code: string): Promise<{ success: boolean; message?: string }> {
    const c = this.cart();
    if (!c) {
      return { success: false, message: 'No hay boletos en el carrito.' };
    }

    const codeClean = code.trim().toUpperCase();

    const { data, error } = await this.supabase
      .from('coupons')
      .select('*')
      .eq('code', codeClean)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      return { success: false, message: 'El cupón ingresado no existe o no está activo.' };
    }

    const coupon = data as Coupon;

    // Check if coupon belongs to this event (or is global if event_id is null)
    if (coupon.event_id && coupon.event_id !== c.eventId) {
      return { success: false, message: 'Este cupón no es válido para este espectáculo.' };
    }

    // Check validity dates
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return { success: false, message: 'Este cupón aún no entra en vigencia.' };
    }
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return { success: false, message: 'Este cupón ya ha expirado.' };
    }

    // Check max uses
    if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
      return { success: false, message: 'Este cupón ha alcanzado el límite máximo de canjes.' };
    }

    this.appliedCoupon.set(coupon);
    return { success: true };
  }

  removeCoupon(): void {
    this.appliedCoupon.set(null);
  }

  /**
   * Finalize order, insert into orders and order_items, update tickets stock.
   */
  async finalizeOrder(
    paymentRef: string,
    paymentMethod = 'paypal'
  ): Promise<Order> {
    const c = this.cart();
    const user = this.auth.user();

    if (!c || !user) {
      throw new Error('Sesión de compra o usuario no válido.');
    }

    const sub = this.subtotal();
    const disc = this.discount();
    const tot = this.total();
    const coup = this.appliedCoupon();

    // 20% platform commission calculation
    const commissionAmount = Math.round(tot * 0.20 * 100) / 100;

    // 1. Create order
    const { data: orderData, error: orderError } = await this.supabase
      .from('orders')
      .insert({
        customer_id: user.id,
        event_id: c.eventId,
        coupon_id: coup ? coup.id : null,
        subtotal: sub,
        discount_amount: disc,
        commission_amount: commissionAmount,
        total: tot,
        status: 'confirmed',
        payment_reference: paymentRef,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (orderError || !orderData) {
      console.error('Error creating order in DB:', orderError);
      throw orderError || new Error('No se pudo generar la orden.');
    }

    const order = orderData as Order;

    // 2. Insert order items
    const orderItemsPayload = c.items.map((item) => {
      const itemTotal = item.price * item.quantity;
      const itemCommission = Math.round(itemTotal * 0.20 * 100) / 100;
      return {
        order_id: order.id,
        ticket_type_id: item.ticketTypeId,
        quantity: item.quantity,
        unit_price: item.price,
        commission_rate: 0.20,
        commission_amount: itemCommission,
        total: itemTotal,
      };
    });

    const { error: itemsError } = await this.supabase
      .from('order_items')
      .insert(orderItemsPayload);

    if (itemsError) {
      console.error('Error inserting order items:', itemsError);
    }

    // 3. Increment sold counters on ticket types
    for (const item of c.items) {
      // Fetch current sold & stock
      const { data: tt } = await this.supabase
        .from('ticket_types')
        .select('sold')
        .eq('id', item.ticketTypeId)
        .single();

      const newSold = (tt?.sold || 0) + item.quantity;
      await this.supabase
        .from('ticket_types')
        .update({ sold: newSold })
        .eq('id', item.ticketTypeId);
    }

    // 4. Increment coupon uses count if used
    if (coup) {
      await this.supabase
        .from('coupons')
        .update({ uses_count: (coup.uses_count || 0) + 1 })
        .eq('id', coup.id);
    }

    // 5. Clear cart
    this.clearCart();

    return order;
  }

  clearCart(): void {
    sessionStorage.removeItem('tf_cart');
    this.cart.set(null);
    this.appliedCoupon.set(null);
  }
}
