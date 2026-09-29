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
import { SpinnerComponent, ToastService } from '@ticketflow/shared-ui';
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
    SpinnerComponent,
  ],
  template: `
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      <!-- Steps Indicator -->
      <div class="flex items-center justify-center gap-3 sm:gap-6 text-xs font-bold">
        <a routerLink="/checkout" class="flex items-center gap-2 text-dark/70 hover:text-primary font-medium">
          <span class="w-6 h-6 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs"><i class="fa-solid fa-check text-[10px]"></i></span>
          <span>Carrito</span>
        </a>
        <div class="w-8 sm:w-12 h-0.5 bg-primary"></div>
        <div class="flex items-center gap-2 text-primary">
          <span class="w-6 h-6 rounded-full bg-primary text-surface font-bold flex items-center justify-center text-xs">2</span>
          <span>Pago Seguro</span>
        </div>
        <div class="w-8 sm:w-12 h-0.5 bg-dark/20"></div>
        <div class="flex items-center gap-2 text-dark/40">
          <span class="w-6 h-6 rounded-full bg-surface text-dark/60 font-bold flex items-center justify-center text-xs">3</span>
          <span>Confirmación</span>
        </div>
      </div>

      <div *ngIf="!checkout.cart()" class="py-16 text-center space-y-3 bg-white rounded-3xl border border-dashed border-dark/20 p-8">
        <i class="fa-solid fa-triangle-exclamation text-4xl text-accent block mb-2"></i>
        <p class="text-sm text-dark/50">No se encontró una orden activa en el carrito.</p>
        <a routerLink="/search">
          <button
            type="button"
            class="px-4 py-2 rounded-xl bg-dark text-surface font-bold text-xs hover:bg-dark/90 transition-colors shadow-sm"
          >
            Ir a la Cartelera
          </button>
        </a>
      </div>

      <div *ngIf="checkout.cart()" class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <!-- Left: Payment Form & Gateway -->
        <div class="lg:col-span-2 space-y-6">
          <div class="p-6 sm:p-8 rounded-3xl border border-dark/10 bg-white shadow-sm space-y-6">
            <div class="flex items-center justify-between pb-4 border-b border-dark/10">
              <div>
                <h2 class="text-xl font-bold text-dark">Método de Pago</h2>
                <p class="text-xs text-dark/50 mt-0.5">Selecciona tu plataforma de pago preferida.</p>
              </div>

              <store-countdown-timer
                [expiryTime]="checkout.expiryTime()"
                (timerExpired)="onTimerExpired()"
              ></store-countdown-timer>
            </div>

            <!-- Error alert -->
            <div
              *ngIf="errorMessage()"
              class="p-4 rounded-2xl bg-danger/5 border border-danger/20 text-danger text-xs flex items-center gap-2"
            >
              <i class="fa-solid fa-triangle-exclamation text-danger shrink-0"></i>
              <span>{{ errorMessage() }}</span>
            </div>

            <!-- Processing overlay -->
            <div
              *ngIf="isProcessing()"
              class="flex flex-col items-center justify-center py-10 gap-4"
            >
              <tf-spinner size="lg" color="primary"></tf-spinner>
              <p class="text-sm font-bold text-dark">{{ processingMessage() }}</p>
            </div>

            <!-- 1. Zero-cost courtesy flow -->
            <div *ngIf="checkout.total() === 0 && !isProcessing()" class="p-6 rounded-2xl bg-accent/10 border border-accent/30 text-center space-y-4">
              <i class="fa-solid fa-gift text-3xl text-accent block mb-2"></i>
              <h3 class="font-bold text-base text-dark">Cortesía 100% Bonificada</h3>
              <p class="text-xs text-dark/70 max-w-sm mx-auto leading-relaxed">
                Tu orden tiene un costo de $0.00 MXN gracias al cupón o cortesía aplicado. No requieres ingresar métodos de pago.
              </p>
              <button
                type="button"
                class="w-full py-3.5 px-4 rounded-xl bg-accent hover:bg-accent/90 text-dark font-bold text-xs sm:text-sm transition-all shadow-md shadow-accent/20"
                [disabled]="isProcessing()"
                (click)="processCourtesyOrder()"
              >
                Canjear y Obtener Mis Boletos Gratis
              </button>
            </div>

            <!-- 2. PayPal Smart Buttons (renders when total > 0) -->
            <div *ngIf="checkout.total() > 0 && !isProcessing()" class="space-y-4">
              <div class="p-5 rounded-2xl border-2 border-primary/20 bg-surface/50 space-y-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <i class="fa-brands fa-paypal text-2xl text-[#003087]"></i>
                    <div>
                      <span class="font-bold text-sm text-dark block">PayPal Express Checkout</span>
                      <span class="text-[11px] text-dark/50">Tarjetas de Crédito, Débito o Saldo PayPal</span>
                    </div>
                  </div>
                  <span class="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">Recomendado</span>
                </div>

                <p class="text-xs text-dark/70">
                  Total a pagar: <strong class="text-primary font-bold text-sm">\${{ checkout.total() | number:'1.2-2' }} MXN</strong>
                </p>

                <!-- PayPal SDK renders its buttons here -->
                <div id="paypal-button-container" class="min-h-[55px]">
                  <div *ngIf="paypalLoading()" class="flex items-center justify-center py-4">
                    <tf-spinner size="sm" color="primary"></tf-spinner>
                    <span class="ml-2 text-xs text-dark/50 font-medium">Cargando botones de pago...</span>
                  </div>
                  <div
                    *ngIf="!paypalLoading() && paypalError()"
                    class="p-3.5 rounded-xl bg-danger/5 text-danger border border-danger/20 text-xs text-center"
                  >
                    <i class="fa-solid fa-triangle-exclamation mr-1 text-danger"></i> {{ paypalError() }}
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
                class="text-xs font-bold text-danger hover:underline disabled:opacity-40"
              >
                Cancelar y regresar a la cartelera
              </button>
            </div>
          </div>
        </div>

        <!-- Right: Mini Order Recap -->
        <div class="lg:col-span-1 space-y-6">
          <div class="p-6 sm:p-7 rounded-3xl bg-dark text-surface space-y-4 shadow-xl border border-surface/10">
            <h3 class="font-bold text-sm text-surface border-b border-surface/10 pb-3">
              Resumen de Compra
            </h3>

            <div class="space-y-1.5 text-xs">
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
              <div class="flex justify-between text-surface/60">
                <span>Subtotal</span>
                <span class="font-mono">\${{ checkout.subtotal() | number:'1.2-2' }}</span>
              </div>
              <div *ngIf="checkout.discount() > 0" class="flex justify-between text-accent font-bold">
                <span>Descuento</span>
                <span class="font-mono">-\${{ checkout.discount() | number:'1.2-2' }}</span>
              </div>
            </div>

            <div class="pt-3 border-t border-surface/10 flex items-center justify-between text-xs">
              <span class="font-bold text-surface">Total:</span>
              <span class="text-xl font-bold text-accent font-mono">
                \${{ checkout.total() | number:'1.2-2' }} MXN
              </span>
            </div>
          </div>

          <!-- QR Ticket Preview Card -->
          <div class="p-6 rounded-3xl border border-dark/10 bg-white shadow-sm space-y-3 relative overflow-hidden">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-dark/70 flex items-center gap-1.5">
                <i class="fa-solid fa-qrcode text-primary"></i> Vista Previa del QR
              </span>
              <span class="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                <i class="fa-solid fa-lock text-[9px]"></i> Bloqueado
              </span>
            </div>

            <div class="relative w-36 h-36 mx-auto rounded-2xl border-2 border-dashed border-dark/20 bg-surface flex items-center justify-center p-2 overflow-hidden shadow-inner group">
              <!-- Mock QR pattern background -->
              <div class="w-full h-full bg-dark/10 rounded-lg flex items-center justify-center filter blur-[3px]">
                <i class="fa-solid fa-qrcode text-6xl text-dark/40"></i>
              </div>
              <!-- Lock Badge overlay -->
              <div class="absolute inset-0 bg-dark/70 backdrop-blur-[2px] flex flex-col items-center justify-center text-surface gap-1">
                <div class="w-9 h-9 rounded-full bg-accent text-dark flex items-center justify-center text-sm shadow-lg font-bold">
                  <i class="fa-solid fa-lock"></i>
                </div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-accent">Pendiente de Pago</span>
              </div>
            </div>

            <p class="text-[11px] text-dark/50 text-center leading-relaxed">
              Tu código QR oficial escaneable de alta densidad se emitirá automáticamente al confirmar tu pago en <strong>Mis Boletos</strong>.
            </p>
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
  private  readonly toast      = inject(ToastService);

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
          const gEmail  = this.checkout.guestEmail();
          const gName   = this.checkout.guestName();

          if (!token && (!gEmail || !gEmail.trim())) {
            throw new Error('Correo electrónico de invitado requerido.');
          }

          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const supabaseUrl = (this.supabase as unknown as { supabaseUrl: string }).supabaseUrl
            ?? 'https://kevgwhiosnyemaftbjqs.supabase.co';

          const res = await fetch(`${supabaseUrl}/functions/v1/create-paypal-order`, {
            method:  'POST',
            headers,
            body: JSON.stringify({
              eventId:   c.eventId,
              eventName: c.eventName,
              amountMXN: this.checkout.total(),
              sessionId: c.sessionId,
              guestEmail: token ? null : gEmail.trim(),
              guestName:  token ? null : (gName.trim() || gEmail.trim()),
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
            const result = await this.checkout.finalizeOrder(data.orderID, false);
            if (result.order?.access_token) {
              this.router.navigate(['/ticket', result.order.id], {
                queryParams: { token: result.order.access_token },
              });
            } else {
              this.router.navigate(['/checkout/confirmation', result.order.id]);
            }
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
      const result = await this.checkout.finalizeOrder('', true);
      if (result.order?.access_token) {
        this.router.navigate(['/ticket', result.order.id], {
          queryParams: { token: result.order.access_token },
        });
      } else {
        this.router.navigate(['/checkout/confirmation', result.order.id]);
      }
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
    this.toast.error(
      'Reserva Expirada',
      'Tu tiempo de 15 minutos ha concluido. Los boletos se liberaron para otros usuarios.'
    );
    await this.checkout.cancelCheckout();
    this.router.navigate(['/search'], {
      queryParams: { expired: '1' },
    });
  }
}
