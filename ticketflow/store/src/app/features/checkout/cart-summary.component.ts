import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CheckoutService } from './checkout.service';
import { CountdownTimerComponent } from '../../shared/ui/countdown-timer.component';
import { ButtonComponent } from '@ticketflow/shared-ui';

@Component({
  selector: 'store-cart-summary',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    CountdownTimerComponent,
    ButtonComponent,
  ],
  template: `
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <!-- Steps Indicator -->
      <div class="flex items-center justify-center gap-3 sm:gap-6 text-xs font-bold">
        <div class="flex items-center gap-2 text-primary">
          <span class="w-6 h-6 rounded-full bg-primary text-dark font-black flex items-center justify-center text-xs">1</span>
          <span>Revisión de Carrito</span>
        </div>
        <div class="w-8 sm:w-12 h-0.5 bg-dark/20"></div>
        <div class="flex items-center gap-2 text-dark/40">
          <span class="w-6 h-6 rounded-full bg-dark/10 text-dark/60 font-black flex items-center justify-center text-xs">2</span>
          <span>Pago Seguro</span>
        </div>
        <div class="w-8 sm:w-12 h-0.5 bg-dark/20"></div>
        <div class="flex items-center gap-2 text-dark/40">
          <span class="w-6 h-6 rounded-full bg-dark/10 text-dark/60 font-black flex items-center justify-center text-xs">3</span>
          <span>Boletos Emitidos</span>
        </div>
      </div>

      <!-- No cart empty state -->
      <div
        *ngIf="!checkout.cart() || checkout.cart()!.items.length === 0"
        class="py-20 text-center rounded-3xl border border-dashed border-dark/20 p-8 bg-surface space-y-4"
      >
        <span class="text-5xl block">🛒</span>
        <h3 class="text-lg font-bold text-dark">Tu carrito está vacío</h3>
        <p class="text-xs text-dark/60 max-w-sm mx-auto">
          No tienes boletos reservados en este momento. Explora nuestra cartelera para conseguir tus entradas.
        </p>
        <a routerLink="/search">
          <tf-button variant="primary" size="md">
            Explorar Cartelera de Eventos
          </tf-button>
        </a>
      </div>

      <!-- Active Cart -->
      <div *ngIf="checkout.cart() && checkout.cart()!.items.length > 0" class="space-y-8">
        <!-- Header & Countdown -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-dark/10">
          <div>
            <h1 class="text-2xl sm:text-3xl font-black text-dark tracking-tight">
              Resumen de tu Orden
            </h1>
            <p class="text-xs text-dark/60 mt-1">
              {{ checkout.cart()!.eventName }} · {{ checkout.cart()!.venueName || 'Recinto Confirmado' }}
            </p>
          </div>

          <store-countdown-timer
            [expiryTime]="checkout.expiryTime()"
            (timerExpired)="onTimerExpired()"
          ></store-countdown-timer>
        </div>

        <!-- Main 2-column Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <!-- Left: Items List & Coupon Box -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Items Table/Card -->
            <div class="p-6 rounded-3xl border border-dark/10 bg-surface space-y-4">
              <h3 class="font-extrabold text-base text-dark">Localidades Seleccionadas</h3>

              <div class="divide-y divide-dark/10">
                <div
                  *ngFor="let item of checkout.cart()!.items"
                  class="py-3.5 flex items-center justify-between gap-4"
                >
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-sm text-dark">{{ item.name }}</span>
                      <span class="text-[10px] font-mono font-bold bg-dark/5 px-2 py-0.5 rounded text-dark/70">
                        {{ item.sku }}
                      </span>
                    </div>
                    <span class="text-xs text-dark/60 font-mono">
                      {{ item.quantity }} x \${{ item.price | number:'1.2-2' }} MXN
                    </span>
                  </div>

                  <div class="font-black text-base text-dark font-mono">
                    \${{ (item.price * item.quantity) | number:'1.2-2' }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Coupon Code Section -->
            <div class="p-6 rounded-3xl border border-dark/10 bg-surface space-y-4">
              <h3 class="font-extrabold text-base text-dark flex items-center gap-2">
                <span>🏷️</span> Código Promocional o Cortesía
              </h3>

              <!-- If coupon applied -->
              <div
                *ngIf="checkout.appliedCoupon()"
                class="p-4 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-between"
              >
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-mono font-black text-sm text-green-800 uppercase">
                      {{ checkout.appliedCoupon()!.code }}
                    </span>
                    <span class="text-xs font-bold text-green-700">✓ Cupón Aplicado</span>
                  </div>
                  <span class="text-xs text-green-600">
                    Descuento obtenido: -\${{ checkout.discount() | number:'1.2-2' }} MXN
                  </span>
                </div>

                <button
                  type="button"
                  (click)="checkout.removeCoupon()"
                  class="text-xs font-bold text-contrast hover:underline"
                >
                  Quitar
                </button>
              </div>

              <!-- Input if no coupon applied -->
              <div *ngIf="!checkout.appliedCoupon()" class="space-y-2">
                <div class="flex gap-2">
                  <input
                    type="text"
                    [(ngModel)]="couponCodeInput"
                    placeholder="Ingresa código (ej. PROMO20)"
                    class="w-full px-4 py-2.5 rounded-xl border border-dark/20 bg-surface text-dark uppercase font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <tf-button
                    variant="secondary"
                    size="sm"
                    [disabled]="!couponCodeInput.trim() || isCheckingCoupon()"
                    (click)="applyCoupon()"
                  >
                    {{ isCheckingCoupon() ? 'Validando...' : 'Aplicar' }}
                  </tf-button>
                </div>

                <p *ngIf="couponError()" class="text-xs text-contrast">
                  {{ couponError() }}
                </p>
              </div>
            </div>
          </div>

          <!-- Right: Summary Box & Checkout CTA -->
          <div class="lg:col-span-1">
            <div class="p-6 rounded-3xl bg-dark text-surface space-y-6 shadow-xl border border-surface/10">
              <h3 class="font-extrabold text-base text-surface border-b border-surface/10 pb-3">
                Desglose del Pedido
              </h3>

              <div class="space-y-3 text-xs">
                <div class="flex items-center justify-between text-surface/70">
                  <span>Subtotal:</span>
                  <span class="font-mono font-bold text-surface">\${{ checkout.subtotal() | number:'1.2-2' }} MXN</span>
                </div>

                <div *ngIf="checkout.discount() > 0" class="flex items-center justify-between text-accent font-bold">
                  <span>Descuento Promocional:</span>
                  <span class="font-mono">-\${{ checkout.discount() | number:'1.2-2' }} MXN</span>
                </div>

                <div class="pt-3 border-t border-surface/10 flex items-center justify-between">
                  <span class="font-bold text-sm text-surface">Total a Pagar:</span>
                  <span class="text-2xl font-black text-primary font-mono">
                    \${{ checkout.total() | number:'1.2-2' }} MXN
                  </span>
                </div>
              </div>

              <div class="pt-2">
                <a routerLink="/checkout/payment">
                  <tf-button variant="primary" size="lg" class="w-full">
                    <span>Proceder al Pago Seguro →</span>
                  </tf-button>
                </a>
              </div>

              <div class="pt-2 text-[10px] text-surface/50 text-center space-y-1">
                <p>🔒 Transacción cifrada vía SSL de 256 bits.</p>
                <p>Aceptamos PayPal, tarjetas de crédito y débito.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class CartSummaryComponent implements OnInit {
  readonly checkout = inject(CheckoutService);
  private readonly router = inject(Router);

  couponCodeInput = '';
  readonly isCheckingCoupon = signal(false);
  readonly couponError = signal<string | null>(null);

  ngOnInit(): void {
    this.checkout.loadCart();
  }

  async applyCoupon(): Promise<void> {
    if (!this.couponCodeInput.trim()) return;

    this.isCheckingCoupon.set(true);
    this.couponError.set(null);

    try {
      const res = await this.checkout.applyCoupon(this.couponCodeInput);
      if (!res.valid) {
        this.couponError.set(res.message || 'Cupón no válido');
      } else {
        this.couponCodeInput = '';
      }
    } finally {
      this.isCheckingCoupon.set(false);
    }
  }

  async onTimerExpired(): Promise<void> {
    await this.checkout.cancelCheckout();
    this.router.navigate(['/search']);
  }
}
