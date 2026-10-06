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
import { ToastService } from '@ticketflow/shared-ui';
import { AuthService } from '@ticketflow/data-access';

@Component({
  selector: 'store-cart-summary',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    CountdownTimerComponent,
  ],
  template: `
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      <!-- Steps Indicator -->
      <div class="flex items-center justify-center gap-3 sm:gap-6 text-xs font-bold">
        <div class="flex items-center gap-2 text-primary">
          <span class="w-6 h-6 rounded-full bg-primary text-on-primary font-bold flex items-center justify-center text-xs">1</span>
          <span>Revisión de Carrito</span>
        </div>
        <div class="w-8 sm:w-12 h-0.5 bg-outline-variant/40"></div>
        <div class="flex items-center gap-2 text-on-surface-variant/60">
          <span class="w-6 h-6 rounded-full bg-surface-container text-on-surface-variant font-bold flex items-center justify-center text-xs">2</span>
          <span>Pago Seguro</span>
        </div>
        <div class="w-8 sm:w-12 h-0.5 bg-outline-variant/40"></div>
        <div class="flex items-center gap-2 text-on-surface-variant/60">
          <span class="w-6 h-6 rounded-full bg-surface-container text-on-surface-variant font-bold flex items-center justify-center text-xs">3</span>
          <span>Boletos Emitidos</span>
        </div>
      </div>

      <!-- No cart empty state -->
      <div
        *ngIf="!checkout.cart() || checkout.cart()!.items.length === 0"
        class="py-20 text-center rounded-3xl border border-dashed border-outline-variant/40 p-8 bg-surface shadow-sm space-y-4"
      >
        <i class="fa-solid fa-cart-shopping text-5xl text-on-surface-variant/30 block mb-2"></i>
        <h3 class="text-lg font-bold text-on-surface">Tu carrito está vacío</h3>
        <p class="text-xs sm:text-sm text-on-surface-variant max-w-sm mx-auto">
          No tienes boletos reservados en este momento. Explora nuestra cartelera para conseguir tus entradas.
        </p>
        <a routerLink="/search">
          <button
            type="button"
            class="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs sm:text-sm shadow-md transition-colors"
          >
            Explorar Cartelera de Eventos
          </button>
        </a>
      </div>

      <!-- Active Cart -->
      <div *ngIf="checkout.cart() && checkout.cart()!.items.length > 0" class="space-y-8">
        <!-- Header & Countdown -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/30">
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
              Resumen de tu Orden
            </h1>
            <p class="text-xs sm:text-sm text-on-surface-variant mt-1">
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
          <!-- Left: Items List & Buyer Info & Coupon Box -->
          <div class="lg:col-span-2 space-y-6">

            <!-- Buyer Info Card (Guest Checkout / Auth User) -->
            <div class="p-6 sm:p-7 rounded-3xl border border-outline-variant/30 bg-surface shadow-sm space-y-4">
              <div class="flex items-center justify-between">
                <h3 class="font-bold text-base text-on-surface flex items-center gap-2">
                  <i class="fa-solid fa-user-check text-primary"></i> Datos de Entrega de Boletos
                </h3>
                <span
                  *ngIf="auth.user()"
                  class="text-[10px] font-bold uppercase tracking-wider text-on-primary-container bg-primary-container px-2.5 py-1 rounded-full flex items-center gap-1"
                >
                  <i class="fa-solid fa-circle-check"></i> Cuenta Autenticada
                </span>
                <span
                  *ngIf="!auth.user()"
                  class="text-[10px] font-bold uppercase tracking-wider text-on-secondary-container bg-secondary-container px-2.5 py-1 rounded-full flex items-center gap-1"
                >
                  <i class="fa-solid fa-bolt"></i> Compra como Invitado
                </span>
              </div>

              <!-- Authenticated User Display -->
              <div *ngIf="auth.user()" class="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between text-xs">
                <div>
                  <span class="font-bold text-on-surface block">
                    {{ auth.user()?.user_metadata?.['full_name'] || 'Usuario Registrado' }}
                  </span>
                  <span class="text-on-surface-variant font-mono">{{ auth.user()?.email }}</span>
                </div>
                <span class="text-[11px] text-on-surface-variant/70">Tus entradas llegarán a este correo.</span>
              </div>

              <!-- Guest Form (Unauthenticated) -->
              <div *ngIf="!auth.user()" class="space-y-4 pt-1">
                <p class="text-xs text-on-surface-variant leading-relaxed">
                  No necesitas crear una cuenta. Ingresa tu nombre y correo para recibir el enlace de acceso directo y tus códigos QR.
                </p>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div class="space-y-1.5">
                    <label class="font-bold text-on-surface block">Nombre Completo *</label>
                    <input
                      type="text"
                      [(ngModel)]="guestNameInput"
                      placeholder="Ej. María García"
                      class="w-full px-3.5 py-2.5 rounded-xl border border-outline/40 bg-surface text-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                  </div>

                  <div class="space-y-1.5">
                    <label class="font-bold text-on-surface block">Correo Electrónico *</label>
                    <input
                      type="email"
                      [(ngModel)]="guestEmailInput"
                      placeholder="ejemplo@correo.com"
                      class="w-full px-3.5 py-2.5 rounded-xl border border-outline/40 bg-surface text-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                  </div>
                </div>

                <div class="p-3 rounded-2xl bg-primary-container/40 border border-primary/20 flex items-center justify-between text-xs">
                  <span class="text-on-surface-variant font-medium">¿Ya tienes una cuenta de BoletoCoqueto?</span>
                  <a routerLink="/login" class="font-bold text-primary hover:underline">
                    Iniciar Sesión <i class="fa-solid fa-arrow-right ml-1"></i>
                  </a>
                </div>

                <p *ngIf="buyerError()" class="text-xs text-error font-semibold flex items-center gap-1">
                  <i class="fa-solid fa-triangle-exclamation"></i> {{ buyerError() }}
                </p>
              </div>
            </div>

            <!-- Items Table/Card -->
            <div class="p-6 sm:p-7 rounded-3xl border border-outline-variant/30 bg-surface shadow-sm space-y-4">
              <h3 class="font-bold text-base text-on-surface">Localidades Seleccionadas</h3>

              <div class="divide-y divide-outline-variant/20">
                <div
                  *ngFor="let item of checkout.cart()!.items"
                  class="py-3.5 flex items-center justify-between gap-4"
                >
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-sm text-on-surface">{{ item.name }}</span>
                      <span class="text-[10px] font-mono font-bold bg-surface-container px-2 py-0.5 rounded text-on-surface-variant">
                        {{ item.sku }}
                      </span>
                    </div>
                    <span class="text-xs text-on-surface-variant font-mono">
                      {{ item.quantity }} x \${{ item.price | number:'1.2-2' }} MXN
                    </span>
                  </div>

                  <div class="font-bold text-base text-primary font-mono">
                    \${{ (item.price * item.quantity) | number:'1.2-2' }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Coupon Code Section -->
            <div class="p-6 sm:p-7 rounded-3xl border border-outline-variant/30 bg-surface shadow-sm space-y-4">
              <h3 class="font-bold text-base text-on-surface flex items-center gap-2">
                <i class="fa-solid fa-tag text-primary"></i> Código Promocional o Cortesía
              </h3>

              <!-- If coupon applied -->
              <div
                *ngIf="checkout.appliedCoupon()"
                class="p-4 rounded-2xl bg-secondary-container/50 border border-secondary/40 flex items-center justify-between"
              >
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-mono font-bold text-sm text-on-secondary-container uppercase">
                      {{ checkout.appliedCoupon()!.code }}
                    </span>
                    <span class="text-xs font-bold text-on-secondary-container"><i class="fa-solid fa-check mr-1"></i>Cupón Aplicado</span>
                    <span
                      *ngIf="checkout.appliedCoupon()!.ticket_sku"
                      class="text-[10px] font-mono font-bold bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded"
                    >
                      SKU: {{ checkout.appliedCoupon()!.ticket_sku }}
                    </span>
                  </div>
                  <span class="text-xs text-on-secondary-container/90 block mt-0.5">
                    Descuento obtenido: -\${{ checkout.discount() | number:'1.2-2' }} MXN
                  </span>
                </div>

                <button
                  type="button"
                  (click)="checkout.removeCoupon()"
                  class="text-xs font-bold text-error hover:underline"
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
                    class="w-full px-4 py-2.5 rounded-xl border border-outline/40 bg-surface text-on-surface uppercase font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                  <button
                    type="button"
                    class="px-4 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 disabled:opacity-40 transition-colors shadow-sm"
                    [disabled]="!couponCodeInput.trim() || isCheckingCoupon()"
                    (click)="applyCoupon()"
                  >
                    {{ isCheckingCoupon() ? 'Validando...' : 'Aplicar' }}
                  </button>
                </div>

                <p *ngIf="couponError()" class="text-xs text-error font-semibold">
                  {{ couponError() }}
                </p>
              </div>
            </div>
          </div>

          <!-- Right: Summary Box & Checkout CTA -->
          <div class="lg:col-span-1 space-y-6">
            <div class="p-6 sm:p-7 rounded-3xl bg-inverse-surface text-inverse-on-surface space-y-6 shadow-xl border border-outline-variant/20">
              <h3 class="font-bold text-base text-inverse-on-surface border-b border-outline-variant/20 pb-3">
                Desglose del Pedido
              </h3>

              <div class="space-y-3 text-xs">
                <div class="flex items-center justify-between text-inverse-on-surface/70">
                  <span>Subtotal Boletos:</span>
                  <span class="font-mono font-bold text-inverse-on-surface">\${{ checkout.subtotal() | number:'1.2-2' }} MXN</span>
                </div>

                <div *ngIf="checkout.discount() > 0" class="flex items-center justify-between text-secondary font-bold">
                  <span>Descuento Cupón:</span>
                  <span class="font-mono">-\${{ checkout.discount() | number:'1.2-2' }} MXN</span>
                </div>

                <div class="pt-3 border-t border-outline-variant/20 flex items-center justify-between">
                  <span class="font-bold text-sm text-inverse-on-surface">Total a Pagar:</span>
                  <span class="text-2xl font-bold text-secondary font-mono">
                    \${{ checkout.total() | number:'1.2-2' }} MXN
                  </span>
                </div>
                <p class="text-[10px] text-inverse-on-surface/50 text-right">Precio final con IVA y tarifa de servicio incluida.</p>
              </div>

              <div class="pt-2">
                <button
                  type="button"
                  (click)="proceedToPayment()"
                  class="w-full py-3.5 px-4 rounded-xl bg-secondary hover:bg-secondary/90 text-on-secondary font-bold text-xs sm:text-sm transition-all shadow-md shadow-secondary/20"
                >
                  <span>Proceder al Pago Seguro <i class="fa-solid fa-arrow-right ml-1"></i></span>
                </button>
              </div>

              <div class="pt-2 text-[10px] text-inverse-on-surface/50 text-center space-y-1">
                <p><i class="fa-solid fa-lock text-secondary mr-1"></i> Transacción cifrada vía SSL de 256 bits.</p>
                <p>Aceptamos PayPal, tarjetas de crédito y débito.</p>
              </div>
            </div>

            <!-- QR Ticket Preview Card -->
            <div class="p-6 rounded-3xl border border-outline-variant/30 bg-surface shadow-sm space-y-3 relative overflow-hidden">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                  <i class="fa-solid fa-qrcode text-primary"></i> Vista Previa del QR
                </span>
                <span class="text-[10px] font-bold uppercase tracking-wider text-on-secondary-container bg-secondary-container px-2 py-0.5 rounded-full flex items-center gap-1">
                  <i class="fa-solid fa-lock text-[9px]"></i> Bloqueado
                </span>
              </div>

              <div class="relative w-36 h-36 mx-auto rounded-2xl border-2 border-dashed border-outline-variant/40 bg-surface-container-low flex items-center justify-center p-2 overflow-hidden shadow-inner group">
                <!-- Mock QR pattern background -->
                <div class="w-full h-full bg-outline-variant/10 rounded-lg flex items-center justify-center filter blur-[3px]">
                  <i class="fa-solid fa-qrcode text-6xl text-on-surface-variant/30"></i>
                </div>
                <!-- Lock Badge overlay -->
                <div class="absolute inset-0 bg-inverse-surface/80 backdrop-blur-[2px] flex flex-col items-center justify-center text-inverse-on-surface gap-1">
                  <div class="w-9 h-9 rounded-full bg-secondary text-on-secondary flex items-center justify-center text-sm shadow-lg font-bold">
                    <i class="fa-solid fa-lock"></i>
                  </div>
                  <span class="text-[10px] font-bold uppercase tracking-wider text-secondary">Pendiente de Pago</span>
                </div>
              </div>

              <p class="text-[11px] text-on-surface-variant/70 text-center leading-relaxed">
                Tu código QR oficial escaneable de alta densidad se emitirá automáticamente al confirmar tu pago en <strong>Mis Boletos</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class CartSummaryComponent implements OnInit {
  readonly checkout = inject(CheckoutService);
  readonly auth     = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  couponCodeInput = '';
  guestNameInput = '';
  guestEmailInput = '';
  readonly isCheckingCoupon = signal(false);
  readonly couponError = signal<string | null>(null);
  readonly buyerError  = signal<string | null>(null);

  ngOnInit(): void {
    this.checkout.loadCart();
    this.guestNameInput  = this.checkout.guestName();
    this.guestEmailInput = this.checkout.guestEmail();
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

  proceedToPayment(): void {
    this.buyerError.set(null);

    // If user is not authenticated, validate guest input
    if (!this.auth.user()) {
      if (!this.guestNameInput.trim()) {
        this.buyerError.set('Por favor ingresa tu nombre completo.');
        return;
      }
      if (!this.guestEmailInput.trim() || !this.guestEmailInput.includes('@')) {
        this.buyerError.set('Por favor ingresa un correo electrónico válido para enviar tus boletos.');
        return;
      }
      this.checkout.setGuestInfo(this.guestEmailInput, this.guestNameInput);
    }

    this.router.navigate(['/checkout/payment']);
  }

  async onTimerExpired(): Promise<void> {
    this.toast.error(
      'Reserva Expirada',
      'Tu tiempo de 15 minutos ha concluido. Los boletos se liberaron para otros usuarios.'
    );
    await this.checkout.cancelCheckout();
    this.router.navigate(['/search']);
  }
}

