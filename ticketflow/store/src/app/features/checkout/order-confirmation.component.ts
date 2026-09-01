import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { SupabaseService } from '@ticketflow/data-access';
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
        <p class="text-sm text-dark/60">Cargando confirmación de tu compra...</p>
      </div>

      <!-- Main Confirmation View -->
      <div *ngIf="!isLoading() && order()" class="space-y-8 animate-fade-in">
        <!-- Success Hero Header -->
        <div class="text-center space-y-4">
          <div class="inline-flex w-20 h-20 rounded-full bg-primary/20 text-primary items-center justify-center text-4xl shadow-inner mb-2 animate-bounce">
            ✓
          </div>

          <h1 class="text-3xl sm:text-4xl font-black text-dark tracking-tight">
            ¡Compra Confirmada con Éxito!
          </h1>

          <p class="text-xs sm:text-sm text-dark/70 max-w-md mx-auto">
            Hemos emitido tus entradas oficiales. Puedes consultarlas y acceder a tus códigos QR en cualquier momento desde tu cuenta.
          </p>

          <!-- Order ID Pill -->
          <div class="inline-block px-4 py-1.5 rounded-full bg-dark/5 border border-dark/10 font-mono text-xs font-bold text-dark">
            Orden: <span class="text-primary font-black">#{{ order()!.id.substring(0, 8).toUpperCase() }}</span>
          </div>
        </div>

        <!-- Order Details Card -->
        <div class="p-6 sm:p-8 rounded-3xl border border-dark/10 bg-surface shadow-sm space-y-6">
          <!-- Event Info -->
          <div class="space-y-1 pb-4 border-b border-dark/10">
            <span class="text-[10px] font-bold uppercase tracking-wider text-primary block">Detalles del Espectáculo</span>
            <h2 class="text-xl font-extrabold text-dark">{{ order()!.events?.name }}</h2>
            <p class="text-xs text-dark/60">
              📅 {{ order()!.events?.event_date | date:'fullDate' }} · {{ order()!.events?.event_date | date:'shortTime' }} hrs
            </p>
          </div>

          <!-- Items Table -->
          <div class="space-y-3">
            <h3 class="text-xs font-bold uppercase tracking-wider text-dark/60">Boletos Emitidos</h3>

            <div class="divide-y divide-dark/10">
              <div
                *ngFor="let item of order()!.order_items"
                class="py-3 flex items-center justify-between gap-4 text-xs"
              >
                <div>
                  <span class="font-bold text-dark">{{ item.ticket_types?.name || 'Boleto' }}</span>
                  <span class="font-mono text-dark/50 ml-1.5">({{ item.quantity }}x)</span>
                </div>

                <div class="font-mono font-bold text-dark">
                  \${{ (item.total || (item.unit_price * item.quantity)) | number:'1.2-2' }} MXN
                </div>
              </div>
            </div>
          </div>

          <!-- Financial Summary -->
          <div class="pt-4 border-t border-dark/10 space-y-2 text-xs">
            <div class="flex items-center justify-between text-dark/70">
              <span>Subtotal:</span>
              <span class="font-mono font-bold">\${{ order()!.subtotal | number:'1.2-2' }} MXN</span>
            </div>

            <div *ngIf="order()!.discount_amount > 0" class="flex items-center justify-between text-contrast font-bold">
              <span>Descuento Aplicado:</span>
              <span class="font-mono">-\${{ order()!.discount_amount | number:'1.2-2' }} MXN</span>
            </div>

            <div class="pt-2 border-t border-dark/10 flex items-center justify-between text-sm">
              <span class="font-black text-dark">Total Pagado:</span>
              <span class="font-black text-primary text-xl font-mono">
                \${{ order()!.total | number:'1.2-2' }} MXN
              </span>
            </div>
          </div>
        </div>

        <!-- Action CTAs -->
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a [routerLink]="['/my-tickets', order()!.id]" class="w-full sm:w-auto">
            <tf-button variant="primary" size="lg" class="w-full sm:w-auto">
              📲 Ver Pase Digital (QR & PDF)
            </tf-button>
          </a>

          <a routerLink="/my-tickets" class="w-full sm:w-auto">
            <tf-button variant="secondary" size="lg" class="w-full sm:w-auto">
              🎟️ Todos Mis Boletos
            </tf-button>
          </a>

          <a routerLink="/search" class="w-full sm:w-auto">
            <tf-button variant="ghost" size="lg" class="w-full sm:w-auto">
              Explorar Más Shows
            </tf-button>
          </a>
        </div>
      </div>
    </div>
  `,
})
export class OrderConfirmationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly supabase = inject(SupabaseService).client;

  readonly isLoading = signal(true);
  readonly order = signal<OrderWithRelations | null>(null);

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
        this.order.set(data as OrderWithRelations);
      }
    } finally {
      this.isLoading.set(false);
    }
  }
}
