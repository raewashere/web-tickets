import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  effect,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CheckoutService } from './checkout.service';
import { CountdownTimerComponent } from '../../shared/ui/countdown-timer.component';
import { ButtonComponent, SpinnerComponent } from '@ticketflow/shared-ui';
import { SupabaseService } from '@ticketflow/data-access';

// PayPal JS SDK loaded dynamically via script tag (loaded in index.html or on-demand below)
declare global {
  interface Window {
    paypal?: PayPalNamespace;
  }
}

interface PayPalNamespace {
  Buttons: (opts: PayPalButtonsOptions) => { render: (container: string) => Promise<void> };
}

interface PayPalButtonsOptions {
  style?: {
    layout?: 'vertical' | 'horizontal';
    color?:  'gold' | 'blue' | 'silver' | 'white' | 'black';
    shape?:  'rect' | 'pill';
    label?:  'paypal' | 'checkout' | 'buynow' | 'pay';
  };
  createOrder: () => Promise<string>;
  onApprove:   (data: { orderID: string }) => Promise<void>;
  onError:     (err: unknown) => void;
  onCancel:    () => void;
}

@Component({
  selector: 'store-payment',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CountdownTimerComponent,
    ButtonComponent,
    SpinnerComponent,
  ],
  template: `
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <!-- Steps Indicator -->
      <div class="flex items-center justify-center gap-3 sm:gap-6 text-xs font-bold">
        <a routerLink="/checkout" class="flex items-center gap-2 text-dark/70 hover:text-primary">
          <span class="w-6 h-6 rounded-full bg-primary/20 text-primary font-black flex items-center justify-center text-xs">✓</span>
          <span>Carrito</span>
        </a>
        <div class="w-8 sm:w-12 h-0.5 bg-primary"></div>
        <div class="flex items-center gap-2 text-primary">
          <span class="w-6 h-6 rounded-full bg-primary text-dark font-black flex items-center justify-center text-xs">2</span>
          <span>Pago Seguro</span>
        </div>
        <div class="w-8 sm:w-12 h-0.5 bg-dark/20"></div>
        <div class="flex items-center gap-2 text-dark/40">
          <span class="w-6 h-6 rounded-full bg-dark/10 text-dark/60 font-black flex items-center justify-center text-xs">3</span>
          <span>Confirmación</span>
        </div>
      </div>

      <div *ngIf="!checkout.cart()" class="py-16 text-center space-y-3">
        <span class="text-4xl block">⚠️</span>
        <p class="text-sm text-dark/60">No se encontró una orden activa en el carrito.</p>
        <a routerLink="/search">
          <tf-button variant="primary" size="sm">Ir a la Cartelera</tf-button>
        </a>
      </div>

      <div *ngIf="checkout.cart()" class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <!-- Left: Payment Form & Gateway -->
        <div class="lg:col-span-2 space-y-6">
          <div class="p-6 sm:p-8 rounded-3xl border border-dark/10 bg-surface shadow-sm space-y-6">
            <div class="flex items-center justify-between pb-4 border-b border-dark/10">
              <div>
                <h2 class="text-xl font-black text-dark">Método de Pago</h2>
                <p class="text-xs text-dark/60 mt-0.5">Selecciona tu plataforma de pago preferida.</p>
              </div>

              <store-countdown-timer
                [expiryTime]="checkout.expiryTime()"
                (timerExpired)="onTimerExpired()"
              ></store-countdown-timer>
            </div>

            <!-- Error alert -->
            <div
              *ngIf="errorMessage()"
              class="p-4 rounded-2xl bg-contrast/10 border border-contrast/20 text-contrast text-xs flex items-center gap-2"
            >
              <span>⚠️</span>
              <span>{{ errorMessage() }}</span>
            </div>

            <!-- Processing overlay -->
            <div
              *ngIf="isProcessing()"
              class="flex flex-col items-center justify-center py-10 gap-4"
            >
              <tf-spinner size="lg" color="primary"></tf-spinner>
              <p class="text-sm font-bold text-dark/70">{{ processingMessage() }}</p>
            </div>

            <!-- 1. Zero-cost courtesy flow -->
            <div *ngIf="checkout.total() === 0 && !isProcessing()" class="p-6 rounded-2xl bg-accent/20 border border-accent/40 text-center space-y-4">
              <div class="text-3xl">🎁</div>
              <h3 class="font-extrabold text-base text-dark">Cortesía 100% Bonificada</h3>
              <p class="text-xs text-dark/70 max-w-sm mx-auto">
                Tu orden tiene un costo de $0.00 MXN gracias al cupón o cortesía aplicado. No requieres ingresar métodos de pago.
              </p>
              <tf-button
                variant="primary"
                size="lg"
                class="w-full"
                [disabled]="isProcessing()"
                (click)="processCourtesyOrder()"
              >
                Canjear y Obtener Mis Boletos Gratis
              </tf-button>
            </div>

            <!-- 2. PayPal Smart Buttons (renders when total > 0) -->
            <div *ngIf="checkout.total() > 0 && !isProcessing()" class="space-y-4">
              <div class="p-5 rounded-2xl border-2 border-primary/40 bg-primary/5 space-y-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <span class="text-2xl">🅿️</span>
                    <div>
                      <span class="font-bold text-sm text-dark block">PayPal Express Checkout</span>
                      <span class="text-[11px] text-dark/60">Tarjetas de Crédito, Débito o Saldo PayPal</span>
                    </div>
                  </div>
                  <span class="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">Recomendado</span>
                </div>

                <p class="text-xs text-dark/70">
                  Total a pagar: <strong class="text-primary font-black text-sm">\${{ checkout.total() | number:'1.2-2' }} MXN</strong>
                </p>

                <!-- PayPal SDK renders its buttons here -->
                <div id="paypal-button-container" class="min-h-[55px]">
                  <div *ngIf="paypalLoading()" class="flex items-center justify-center py-4">
                    <tf-spinner size="sm" color="primary"></tf-spinner>
                    <span class="ml-2 text-xs text-dark/60">Cargando botones de pago...</span>
                  </div>
                  <div
                    *ngIf="!paypalLoading() && paypalError()"
                    class="p-3 rounded-xl bg-contrast/10 text-contrast text-xs text-center"
                  >
                    ⚠️ {{ paypalError() }}
                    <button (click)="retryPayPal()" class="ml-2 underline font-bold">Reintentar</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Cancel Button -->
            <div class="pt-2 text-center">
              <button
                type="button"
                (click)="cancelCheckout()"
                [disabled]="isProcessing()"
                class="text-xs font-bold text-contrast hover:underline disabled:opacity-40"
              >
                Cancelar y regresar a la cartelera
              </button>
            </div>
          </div>
        </div>

        <!-- Right: Mini Order Recap -->
        <div class="lg:col-span-1">
          <div class="p-6 rounded-3xl bg-dark text-surface space-y-4 shadow-xl border border-surface/10">
            <h3 class="font-extrabold text-sm text-surface border-b border-surface/10 pb-3">
              Resumen de Compra
            </h3>

            <div class="space-y-2 text-xs">
              <p class="font-bold text-surface truncate">{{ checkout.cart()!.eventName }}</p>
              <p class="text-surface/60">{{ checkout.cart()!.venueName }}</p>
              <p class="text-surface/60">{{ checkout.cart()!.eventDate | date:'mediumDate' }}</p>
            </div>

            <div class="divide-y divide-surface/10 pt-2 text-xs">
              <div *ngFor="let item of checkout.cart()!.items" class="py-2 flex items-center justify-between text-surface/80">
                <span>{{ item.quantity }}x {{ item.name }}</span>
                <span class="font-mono font-bold">\${{ (item.price * item.quantity) | number:'1.2-2' }}</span>
              </div>
            </div>

            <div class="space-y-1 pt-2 border-t border-surface/10 text-xs">
              <div class="flex justify-between text-surface/70">
                <span>Subtotal</span>
                <span class="font-mono">\${{ checkout.subtotal() | number:'1.2-2' }}</span>
              </div>
              <div *ngIf="checkout.discount() > 0" class="flex justify-between text-accent">
                <span>Descuento</span>
                <span class="font-mono">-\${{ checkout.discount() | number:'1.2-2' }}</span>
              </div>
              <div class="flex justify-between text-surface/70">
                <span>Comisión (20%)</span>
                <span class="font-mono">\${{ checkout.commission() | number:'1.2-2' }}</span>
              </div>
            </div>

            <div class="pt-3 border-t border-surface/10 flex items-center justify-between text-xs">
              <span class="font-bold text-surface">Total:</span>
              <span class="text-xl font-black text-accent font-mono">
                \${{ checkout.total() | number:'1.2-2' }} MXN
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class PaymentComponent implements OnInit, OnDestroy {
  readonly checkout         = inject(CheckoutService);
  private  readonly router  = inject(Router);
  private  readonly platformId = inject(PLATFORM_ID);
  private  readonly supabase   = inject(SupabaseService).client;

  readonly isProcessing     = signal(false);
  readonly processingMessage = signal('Procesando pago...');
  readonly errorMessage     = signal<string | null>(null);
  readonly paypalLoading    = signal(true);
  readonly paypalError      = signal<string | null>(null);

  /** PayPal Client ID — loaded from platform_settings or env */
  private paypalClientId = '';

  ngOnInit(): void {
    const c = this.checkout.loadCart();
    if (!c || c.items.length === 0) {
      this.router.navigate(['/search']);
      return;
    }

    if (isPlatformBrowser(this.platformId)) {
      this.initPayPal();
    }
  }

  ngOnDestroy(): void {
    // Remove PayPal script on destroy to avoid leaks on re-navigation
    const existing = document.getElementById('paypal-sdk-script');
    existing?.remove();
  }

  // ---------------------------------------------------------------------------
  // PayPal SDK initialization
  // ---------------------------------------------------------------------------

  private async initPayPal(): Promise<void> {
    this.paypalLoading.set(true);
    this.paypalError.set(null);

    try {
      // 1. Load Client ID from platform_settings
      const { data: setting } = await this.supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'paypal_client_id')
        .maybeSingle();

      this.paypalClientId = (setting?.value as string | undefined)
        ?? (window as unknown as Record<string, string>)['PAYPAL_CLIENT_ID']
        ?? '';

      if (!this.paypalClientId) {
        this.paypalError.set('Pasarela de pago no configurada. Contacta a soporte.');
        this.paypalLoading.set(false);
        return;
      }

      // 2. Load PayPal JS SDK dynamically
      await this.loadPayPalScript(this.paypalClientId);

      // 3. Render PayPal buttons
      if (!window.paypal) {
        throw new Error('PayPal SDK failed to load.');
      }

      await window.paypal.Buttons({
        style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' },

        /** Step A: Ask our Edge Function to create the PayPal order */
        createOrder: async (): Promise<string> => {
          const c = this.checkout.cart();
          if (!c) throw new Error('Carrito vacío.');

          const session = await this.supabase.auth.getSession();
          const token   = session.data.session?.access_token;
          if (!token) throw new Error('Sesión de usuario no válida.');

          const supabaseUrl = (this.supabase as unknown as { supabaseUrl: string }).supabaseUrl
            ?? 'https://tyohkooarijtnnyheoex.supabase.co';

          const res = await fetch(`${supabaseUrl}/functions/v1/create-paypal-order`, {
            method:  'POST',
            headers: {
              'Content-Type':  'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              eventId:   c.eventId,
              eventName: c.eventName,
              amountMXN: this.checkout.total(),
              sessionId: c.sessionId,
            }),
          });

          const data = await res.json() as { paypalOrderId?: string; error?: string };
          if (!res.ok || !data.paypalOrderId) {
            throw new Error(data.error ?? 'Error al crear la orden de PayPal.');
          }

          return data.paypalOrderId;
        },

        /** Step B: Payment approved — capture via our Edge Function */
        onApprove: async (data: { orderID: string }): Promise<void> => {
          this.isProcessing.set(true);
          this.processingMessage.set('Confirmando pago con PayPal...');
          this.errorMessage.set(null);

          try {
            const order = await this.checkout.finalizeOrder(data.orderID, false);
            this.router.navigate(['/checkout/confirmation', order.id]);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al procesar la orden.';
            this.errorMessage.set(msg);
            this.isProcessing.set(false);
          }
        },

        onError: (err: unknown): void => {
          console.error('PayPal button error:', err);
          this.paypalError.set('Error en la pasarela de PayPal. Intenta de nuevo.');
        },

        onCancel: (): void => {
          this.errorMessage.set('Pago cancelado. Puedes intentarlo de nuevo cuando gustes.');
        },
      }).render('#paypal-button-container');

      this.paypalLoading.set(false);
    } catch (err) {
      console.error('initPayPal error:', err);
      this.paypalError.set('No se pudo inicializar PayPal. Por favor recarga la página.');
      this.paypalLoading.set(false);
    }
  }

  private loadPayPalScript(clientId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Remove any existing PayPal script to avoid duplicates
      document.getElementById('paypal-sdk-script')?.remove();

      const script  = document.createElement('script');
      script.id     = 'paypal-sdk-script';
      script.src    = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=MXN&intent=capture`;
      script.onload  = () => resolve();
      script.onerror = () => reject(new Error('Failed to load PayPal SDK script.'));
      document.head.appendChild(script);
    });
  }

  retryPayPal(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Clear container and re-init
      const container = document.getElementById('paypal-button-container');
      if (container) container.innerHTML = '';
      this.initPayPal();
    }
  }

  // ---------------------------------------------------------------------------
  // Courtesy (free) order
  // ---------------------------------------------------------------------------

  async processCourtesyOrder(): Promise<void> {
    this.isProcessing.set(true);
    this.processingMessage.set('Generando boletos de cortesía...');
    this.errorMessage.set(null);

    try {
      const order = await this.checkout.finalizeOrder('', true);
      this.router.navigate(['/checkout/confirmation', order.id]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar la cortesía.';
      this.errorMessage.set(msg);
    } finally {
      this.isProcessing.set(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Cancel & timer expiry
  // ---------------------------------------------------------------------------

  async cancelCheckout(): Promise<void> {
    this.isProcessing.set(true);
    this.processingMessage.set('Liberando reservas...');
    await this.checkout.cancelCheckout();
    this.router.navigate(['/search']);
  }

  async onTimerExpired(): Promise<void> {
    await this.checkout.cancelCheckout();
    this.router.navigate(['/search'], {
      queryParams: { expired: '1' },
    });
  }
}
