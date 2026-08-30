import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CheckoutService } from './checkout.service';
import { CountdownTimerComponent } from '../../shared/ui/countdown-timer.component';
import { ButtonComponent, SpinnerComponent } from '@ticketflow/shared-ui';

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

            <!-- 1. Zero-cost courtesy flow -->
            <div *ngIf="checkout.total() === 0" class="p-6 rounded-2xl bg-accent/20 border border-accent/40 text-center space-y-4">
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
                (click)="processOrder('FREE-COURTESY-' + generateRef())"
              >
                <span *ngIf="!isProcessing()">Canjear y Obtener Mis Boletos Gratis</span>
                <span *ngIf="isProcessing()" class="flex items-center gap-2">
                  <tf-spinner size="sm" color="dark"></tf-spinner>
                  <span>Generando boletos...</span>
                </span>
              </tf-button>
            </div>

            <!-- 2. Standard PayPal Gateway Option -->
            <div *ngIf="checkout.total() > 0" class="space-y-4">
              <!-- PayPal Smart Card -->
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
                  Paga de forma rápida y protegida con la plataforma líder mundial en pagos digitales.
                </p>

                <!-- Action Button for PayPal / Sandbox checkout -->
                <div class="pt-2">
                  <tf-button
                    variant="accent"
                    size="lg"
                    class="w-full !text-dark !font-black !py-3.5 !rounded-2xl shadow-md hover:shadow-lg transition-all"
                    [disabled]="isProcessing()"
                    (click)="processOrder('PAYPAL-SANDBOX-' + generateRef())"
                  >
                    <span *ngIf="!isProcessing()" class="flex items-center justify-center gap-2">
                      <span>Pagar con</span>
                      <span class="font-black italic text-blue-900 tracking-wider">PayPal</span>
                      <span>(\${{ checkout.total() | number:'1.2-2' }} MXN)</span>
                    </span>
                    <span *ngIf="isProcessing()" class="flex items-center justify-center gap-2">
                      <tf-spinner size="sm" color="dark"></tf-spinner>
                      <span>Procesando pago con PayPal...</span>
                    </span>
                  </tf-button>
                </div>
              </div>
            </div>

            <!-- Cancel Button -->
            <div class="pt-2 text-center">
              <button
                type="button"
                (click)="cancelCheckout()"
                class="text-xs font-bold text-contrast hover:underline"
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
export class PaymentComponent implements OnInit {
  readonly checkout = inject(CheckoutService);
  private readonly router = inject(Router);

  readonly isProcessing = signal(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const c = this.checkout.loadCart();
    if (!c || c.items.length === 0) {
      this.router.navigate(['/search']);
    }
  }

  generateRef(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  async processOrder(paymentRef: string): Promise<void> {
    this.isProcessing.set(true);
    this.errorMessage.set(null);

    try {
      const order = await this.checkout.finalizeOrder(paymentRef);
      this.router.navigate(['/checkout/confirmation', order.id]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar la orden de compra';
      this.errorMessage.set(msg);
    } finally {
      this.isProcessing.set(false);
    }
  }

  cancelCheckout(): void {
    this.checkout.clearCart();
    this.router.navigate(['/search']);
  }

  onTimerExpired(): void {
    alert('Tu tiempo de reserva ha expirado. Por favor, selecciona tus boletos nuevamente.');
    this.checkout.clearCart();
    this.router.navigate(['/search']);
  }
}
