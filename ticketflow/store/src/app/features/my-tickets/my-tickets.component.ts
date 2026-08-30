import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MyTicketsService } from './my-tickets.service';
import { AuthService } from '@ticketflow/data-access';
import type { OrderWithRelations, OrderItemWithTicketType } from '@ticketflow/models';
import {
  ButtonComponent,
  BadgeComponent,
  SpinnerComponent,
} from '@ticketflow/shared-ui';

@Component({
  selector: 'store-my-tickets',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonComponent,
    BadgeComponent,
    SpinnerComponent,
  ],
  template: `
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-4xl font-black text-dark tracking-tight">
            Mis Boletos
          </h1>
          <p class="text-xs sm:text-sm text-dark/60 mt-1">
            Consulta tus entradas compradas y presenta tu código QR oficial en el acceso.
          </p>
        </div>

        <a routerLink="/search">
          <tf-button variant="primary" size="md">
            + Explorar Más Shows
          </tf-button>
        </a>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="py-24 flex flex-col items-center justify-center gap-3">
        <tf-spinner size="lg" color="primary"></tf-spinner>
        <p class="text-sm text-dark/60">Cargando tus entradas...</p>
      </div>

      <!-- Empty State -->
      <div
        *ngIf="!isLoading() && orders().length === 0"
        class="py-20 text-center rounded-3xl border border-dashed border-dark/20 p-8 bg-surface space-y-4"
      >
        <span class="text-5xl block">🎟️</span>
        <h3 class="text-lg font-bold text-dark">Aún no tienes boletos comprados</h3>
        <p class="text-xs text-dark/60 max-w-sm mx-auto">
          Encuentra tus conciertos y festivales favoritos y adquiere tus entradas oficiales al instante.
        </p>
        <a routerLink="/search">
          <tf-button variant="primary" size="md">
            Explorar Cartelera
          </tf-button>
        </a>
      </div>

      <!-- Orders List -->
      <div *ngIf="!isLoading() && orders().length > 0" class="space-y-6">
        <div
          *ngFor="let order of orders()"
          class="p-6 sm:p-8 rounded-3xl border border-dark/10 bg-surface shadow-sm hover:shadow-md transition-all space-y-6"
        >
          <!-- Order Top Header: Date & Status -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-dark/10">
            <div class="flex items-center gap-3">
              <span class="font-mono font-bold text-xs bg-dark/5 px-2.5 py-1 rounded-lg text-dark">
                Orden #{{ order.id.substring(0, 8).toUpperCase() }}
              </span>
              <tf-badge variant="success">Confirmada</tf-badge>
            </div>

            <div class="text-xs text-dark/50">
              Comprado el: <strong>{{ order.created_at | date:'medium' }}</strong>
            </div>
          </div>

          <!-- Event Body Card -->
          <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <!-- Event Info -->
            <div class="flex items-start gap-4">
              <!-- Flyer Thumbnail -->
              <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-dark/10 overflow-hidden flex-shrink-0">
                <img
                  *ngIf="order.events?.flyer_url"
                  [src]="order.events!.flyer_url"
                  [alt]="order.events!.name"
                  class="w-full h-full object-cover"
                />
                <div *ngIf="!order.events?.flyer_url" class="w-full h-full flex items-center justify-center text-2xl">
                  🎸
                </div>
              </div>

              <!-- Titles & Date -->
              <div class="space-y-1">
                <span class="text-xs font-bold uppercase text-primary">
                  {{ order.events?.artists?.name }}
                </span>
                <h3 class="text-lg font-black text-dark leading-snug">
                  {{ order.events?.name }}
                </h3>
                <p class="text-xs text-dark/60">
                  📍 {{ order.events?.venues?.name || 'Recinto Confirmado' }}
                </p>
                <p class="text-xs font-bold text-dark/80">
                  📅 {{ order.events?.event_date | date:'fullDate' }} · {{ order.events?.event_date | date:'shortTime' }} hrs
                </p>
              </div>
            </div>

            <!-- Action Button: Show QR Pass -->
            <div class="w-full md:w-auto flex-shrink-0">
              <tf-button
                variant="primary"
                size="md"
                class="w-full md:w-auto"
                (click)="openQrModal(order)"
              >
                📲 Ver Pase Digital (QR)
              </tf-button>
            </div>
          </div>

          <!-- Items Breakdown in Order -->
          <div class="pt-4 border-t border-dark/10 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div class="flex flex-wrap items-center gap-3">
              <span class="font-bold text-dark/60">Entradas:</span>
              <span
                *ngFor="let item of order.order_items"
                class="px-2.5 py-1 rounded-lg bg-dark/5 font-semibold text-dark"
              >
                {{ item.quantity }}x {{ item.ticket_types?.name }} (\${{ item.unit_price | number:'1.2-2' }})
              </span>
            </div>

            <div class="font-bold text-dark font-mono text-sm">
              Total: \${{ order.total | number:'1.2-2' }} MXN
            </div>
          </div>
        </div>
      </div>

      <!-- QR Digital Pass Modal -->
      <div
        *ngIf="selectedOrderForQr()"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/80 backdrop-blur-sm animate-fade-in"
      >
        <div class="relative w-full max-w-sm bg-surface rounded-3xl p-8 text-center space-y-6 shadow-2xl border border-dark/10">
          <!-- Close Button -->
          <button
            type="button"
            (click)="closeQrModal()"
            class="absolute top-4 right-4 p-2 rounded-full hover:bg-dark/10 text-dark/60 font-bold transition-colors"
          >
            ✕
          </button>

          <!-- Pass Header -->
          <div class="space-y-1">
            <span class="text-[10px] font-extrabold uppercase tracking-widest text-primary block">
              Pase de Acceso Oficial
            </span>
            <h3 class="font-black text-lg text-dark leading-tight">
              {{ selectedOrderForQr()!.events?.name }}
            </h3>
            <p class="text-xs text-dark/60">
              {{ selectedOrderForQr()!.events?.venues?.name }}
            </p>
          </div>

          <!-- QR Code Canvas / Image -->
          <div class="p-4 bg-white rounded-2xl border-2 border-dark/10 shadow-inner flex flex-col items-center justify-center space-y-2">
            <img
              [src]="'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=TICKETFLOW-AUTH-' + selectedOrderForQr()!.id"
              alt="QR Code Boleto"
              class="w-48 h-48 rounded-lg"
            />
            <span class="font-mono text-[10px] text-dark/50 tracking-widest font-bold">
              AUTH: {{ selectedOrderForQr()!.id.substring(0, 16).toUpperCase() }}
            </span>
          </div>

          <!-- Ticket Details in Pass -->
          <div class="p-3.5 rounded-2xl bg-dark/5 text-xs text-dark/70 space-y-1">
            <p class="font-bold text-dark">
              Titular: {{ auth.user()?.user_metadata?.['full_name'] || auth.user()?.email }}
            </p>
            <div class="text-[11px] text-dark/60 flex items-center justify-center gap-2">
              <span>📅 {{ selectedOrderForQr()!.events?.event_date | date:'mediumDate' }}</span>
              <span>·</span>
              <span>🕒 {{ selectedOrderForQr()!.events?.event_date | date:'shortTime' }} hrs</span>
            </div>
          </div>

          <p class="text-[10px] text-dark/40 leading-tight">
            Presenta este código QR en la entrada del recinto desde tu celular o impreso para validar tu acceso.
          </p>
        </div>
      </div>
    </div>
  `,
})
export class MyTicketsComponent implements OnInit {
  private readonly myTicketsService = inject(MyTicketsService);
  readonly auth = inject(AuthService);

  readonly isLoading = signal(true);
  readonly orders = signal<OrderWithRelations[]>([]);
  readonly selectedOrderForQr = signal<OrderWithRelations | null>(null);

  async ngOnInit(): Promise<void> {
    const user = this.auth.user();
    if (user) {
      await this.loadOrders(user.id);
    }
  }

  private async loadOrders(userId: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const data = await this.myTicketsService.getMyOrders(userId);
      this.orders.set(data);
    } catch (err) {
      console.error('Error loading my tickets:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  openQrModal(order: OrderWithRelations): void {
    this.selectedOrderForQr.set(order);
  }

  closeQrModal(): void {
    this.selectedOrderForQr.set(null);
  }
}
