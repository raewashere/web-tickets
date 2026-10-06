import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { SupabaseService, AuthService } from '@ticketflow/data-access';
import type { OrderWithRelations } from '@ticketflow/models';
import {
  ButtonComponent,
  SpinnerComponent,
} from '@ticketflow/shared-ui';

@Component({
  selector: 'store-order-confirmation',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonComponent,
    SpinnerComponent,
  ],
  template: `
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <!-- Loading State -->
      <div *ngIf="isLoading()" class="py-24 flex flex-col items-center justify-center gap-3">
        <tf-spinner size="lg" color="primary"></tf-spinner>
        <p class="text-sm text-on-surface-variant">Cargando confirmación de tu compra...</p>
      </div>

      <!-- Main Confirmation View -->
      <div *ngIf="!isLoading() && order()" class="space-y-8 animate-fade-in">
        <!-- Success Hero Header -->
        <div class="text-center space-y-4">
          <div class="inline-flex w-20 h-20 rounded-full bg-secondary-container text-on-secondary-container items-center justify-center text-4xl shadow-inner mb-2 animate-bounce">
            <i class="fa-solid fa-check"></i>
          </div>

          <h1 class="text-3xl sm:text-4xl font-bold text-on-surface tracking-tight">
            ¡Compra Confirmada con Éxito!
          </h1>

          <p class="text-xs sm:text-sm text-on-surface-variant max-w-md mx-auto">
            Hemos emitido tus entradas oficiales. Puedes consultarlas y acceder a tus códigos QR en cualquier momento desde tu cuenta.
          </p>

          <!-- Order ID Pill -->
          <div class="inline-block px-4 py-1.5 rounded-full bg-surface-container border border-outline-variant/30 font-mono text-xs font-bold text-on-surface">
            Orden: <span class="text-primary font-bold">#{{ order()!.id.substring(0, 8).toUpperCase() }}</span>
          </div>
        </div>

        <!-- Order Details Card -->
        <div class="p-6 sm:p-8 rounded-3xl border border-outline-variant/30 bg-surface shadow-sm space-y-6">
          <!-- Event Info -->
          <div class="space-y-1 pb-4 border-b border-outline-variant/30">
            <span class="text-[10px] font-bold uppercase tracking-wider text-primary block">Detalles del Espectáculo</span>
            <h2 class="text-xl font-bold text-on-surface">{{ order()!.events?.name }}</h2>
            <p class="text-xs text-on-surface-variant">
              <i class="fa-regular fa-calendar mr-1"></i> {{ order()!.events?.event_date | date:'fullDate' }} · {{ order()!.events?.event_date | date:'shortTime' }} hrs
            </p>
          </div>

          <!-- Items Table -->
          <div class="space-y-3">
            <h3 class="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Boletos Emitidos</h3>

            <div class="divide-y divide-outline-variant/20">
              <div
                *ngFor="let item of order()!.order_items"
                class="py-3 flex items-center justify-between gap-4 text-xs"
              >
                <div>
                  <span class="font-bold text-on-surface">{{ item.ticket_types?.name || 'Boleto' }}</span>
                  <span class="font-mono text-on-surface-variant ml-1.5">({{ item.quantity }}x)</span>
                </div>

                <div class="font-mono font-bold text-on-surface">
                  \${{ (item.total || (item.unit_price * item.quantity)) | number:'1.2-2' }} MXN
                </div>
              </div>
            </div>
          </div>

          <!-- Financial Summary -->
          <div class="pt-4 border-t border-outline-variant/30 space-y-2 text-xs">
            <div class="flex items-center justify-between text-on-surface-variant">
              <span>Subtotal:</span>
              <span class="font-mono font-bold">\${{ order()!.subtotal | number:'1.2-2' }} MXN</span>
            </div>

            <div *ngIf="order()!.discount_amount > 0" class="flex items-center justify-between text-secondary font-bold">
              <span>Descuento Aplicado:</span>
              <span class="font-mono">-\${{ order()!.discount_amount | number:'1.2-2' }} MXN</span>
            </div>

            <div class="pt-2 border-t border-outline-variant/30 flex items-center justify-between text-sm">
              <span class="font-bold text-on-surface">Total Pagado:</span>
              <span class="font-bold text-primary text-xl font-mono">
                \${{ order()!.total | number:'1.2-2' }} MXN
              </span>
            </div>
          </div>
        </div>

        <!-- Action CTAs -->
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a
            *ngIf="auth.user()"
            [routerLink]="['/my-tickets', order()!.id]"
            class="w-full sm:w-auto"
          >
            <button
              type="button"
              class="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs sm:text-sm transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2"
            >
              <i class="fa-solid fa-qrcode"></i>
              <span>Ver Pase Digital (QR & PDF)</span>
            </button>
          </a>

          <a
            *ngIf="!auth.user() && order()?.access_token"
            [routerLink]="['/ticket', order()!.id]"
            [queryParams]="{ token: order()!.access_token }"
            class="w-full sm:w-auto"
          >
            <button
              type="button"
              class="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs sm:text-sm transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2"
            >
              <i class="fa-solid fa-qrcode"></i>
              <span>Ver Pase Digital de Invitado</span>
            </button>
          </a>

          <a *ngIf="auth.user()" routerLink="/my-tickets" class="w-full sm:w-auto">
            <button
              type="button"
              class="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-surface border border-outline-variant/40 hover:bg-surface-container text-on-surface font-bold text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <i class="fa-solid fa-ticket"></i>
              <span>Todos Mis Boletos</span>
            </button>
          </a>

          <a routerLink="/search" class="w-full sm:w-auto">
            <button
              type="button"
              class="w-full sm:w-auto px-6 py-3.5 rounded-xl text-on-surface-variant hover:text-on-surface font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2"
            >
              Explorar Más Shows
            </button>
          </a>
        </div>
      </div>
    </div>
  `,
})
export class OrderConfirmationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly supabase = inject(SupabaseService).client;
  readonly auth = inject(AuthService);

  readonly isLoading = signal(true);
  readonly order = signal<(OrderWithRelations & { access_token?: string }) | null>(null);

  async ngOnInit(): Promise<void> {
    const orderId = this.route.snapshot.paramMap.get('orderId');
    if (orderId) {
      await this.loadOrder(orderId);
    }
  }

  private async loadOrder(id: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase
        .from('orders')
        .select('*, events(*, venues(*), artists(*)), order_items(*, ticket_types(*)), coupons(*)')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching confirmed order:', error);
      } else {
        this.order.set(data as OrderWithRelations & { access_token?: string });
      }
    } finally {
      this.isLoading.set(false);
    }
  }
}
