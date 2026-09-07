import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MyTicketsService } from './my-tickets.service';
import { AuthService } from '@ticketflow/data-access';
import type { OrderWithRelations, OrderItemWithTicketType } from '@ticketflow/models';
import { generateQrDataUrl } from '../../shared/utils/qr.utils';
import {
  BadgeComponent,
  SpinnerComponent,
} from '@ticketflow/shared-ui';

@Component({
  selector: 'store-my-tickets',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    BadgeComponent,
    SpinnerComponent,
  ],
  template: `
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 class="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Mis Boletos
          </h1>
          <p class="text-xs sm:text-sm text-slate-500 mt-1">
            Consulta tus entradas compradas y presenta tu código QR oficial en el acceso.
          </p>
        </div>

        <a routerLink="/search">
          <button
            type="button"
            class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-md shadow-cyan-500/20"
          >
            + Explorar Más Shows
          </button>
        </a>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="py-24 flex flex-col items-center justify-center gap-3">
        <tf-spinner size="lg" color="primary"></tf-spinner>
        <p class="text-sm text-slate-500 font-medium">Cargando tus entradas...</p>
      </div>

      <!-- Empty State -->
      <div
        *ngIf="!isLoading() && orders().length === 0"
        class="py-20 text-center rounded-3xl border border-dashed border-slate-300 p-8 bg-white shadow-sm space-y-4"
      >
        <span class="text-5xl block">🎟️</span>
        <h3 class="text-lg font-bold text-slate-900">Aún no tienes boletos comprados</h3>
        <p class="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
          Encuentra tus conciertos y festivales favoritos y adquiere tus entradas oficiales al instante.
        </p>
        <a routerLink="/search">
          <button
            type="button"
            class="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition-colors shadow-sm"
          >
            Explorar Cartelera
          </button>
        </a>
      </div>

      <!-- Orders List -->
      <div *ngIf="!isLoading() && orders().length > 0" class="space-y-6">
        <div
          *ngFor="let order of orders()"
          class="p-6 sm:p-8 rounded-3xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all space-y-6"
        >
          <!-- Order Top Header: Date & Status -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <span class="font-mono font-bold text-xs bg-slate-100 px-2.5 py-1 rounded-lg text-slate-800">
                Orden #{{ order.id.substring(0, 8).toUpperCase() }}
              </span>
              <tf-badge variant="success">Confirmada</tf-badge>
            </div>

            <div class="text-xs text-slate-500">
              Comprado el: <strong class="text-slate-700">{{ order.created_at | date:'medium' }}</strong>
            </div>
          </div>

          <!-- Event Body Card -->
          <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <!-- Event Info -->
            <div class="flex items-start gap-4">
              <!-- Flyer Thumbnail -->
              <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                <img
                  *ngIf="order.events?.flyer_url"
                  [src]="order.events!.flyer_url"
                  [alt]="order.events!.name"
                  class="w-full h-full object-cover"
                />
                <div *ngIf="!order.events?.flyer_url" class="w-full h-full flex items-center justify-center text-2xl text-slate-400">
                  🎸
                </div>
              </div>

              <!-- Titles & Date -->
              <div class="space-y-1">
                <span class="text-xs font-bold uppercase text-cyan-600">
                  {{ order.events?.artists?.name }}
                </span>
                <h3 class="text-lg font-black text-slate-900 leading-snug">
                  {{ order.events?.name }}
                </h3>
                <p class="text-xs text-slate-500">
                  📍 {{ order.events?.venues?.name || 'Recinto Confirmado' }}
                </p>
                <p class="text-xs font-bold text-slate-700">
                  📅 {{ order.events?.event_date | date:'fullDate' }} · {{ order.events?.event_date | date:'shortTime' }} hrs
                </p>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="w-full md:w-auto flex-shrink-0 flex flex-col sm:flex-row gap-2.5">
              <a
                [routerLink]="['/my-tickets', order.id]"
                class="w-full sm:w-auto"
              >
                <button
                  type="button"
                  class="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-sm transition-colors"
                >
                  📄 Ver Detalle
                </button>
              </a>
              <button
                type="button"
                class="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-bold text-xs shadow-sm transition-all"
                (click)="openQrModal(order)"
              >
                📲 Ver QR
              </button>
            </div>
          </div>

          <!-- Items Breakdown in Order -->
          <div class="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div class="flex flex-wrap items-center gap-2 sm:gap-3">
              <span class="font-bold text-slate-500">Entradas:</span>
              <span
                *ngFor="let item of order.order_items"
                class="px-2.5 py-1 rounded-lg bg-slate-100 font-semibold text-slate-800"
              >
                {{ item.quantity }}x {{ item.ticket_types?.name }} (\${{ item.unit_price | number:'1.2-2' }})
              </span>
            </div>

            <div class="font-bold text-slate-900 font-mono text-sm">
              Total: \${{ order.total | number:'1.2-2' }} MXN
            </div>
          </div>
        </div>
      </div>

      <!-- QR Digital Pass Modal -->
      <div
        *ngIf="selectedOrderForQr()"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      >
        <div class="relative w-full max-w-sm bg-white rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl border border-slate-200">
          <!-- Close Button -->
          <button
            type="button"
            (click)="closeQrModal()"
            class="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-slate-100 text-slate-500 font-bold flex items-center justify-center transition-colors"
          >
            ✕
          </button>

          <!-- Pass Header -->
          <div class="space-y-1">
            <span class="text-[10px] font-extrabold uppercase tracking-widest text-cyan-600 block">
              Pase de Acceso Oficial
            </span>
            <h3 class="font-black text-lg text-slate-900 leading-tight">
              {{ selectedOrderForQr()!.events?.name }}
            </h3>
            <p class="text-xs text-slate-500">
              {{ selectedOrderForQr()!.events?.venues?.name }}
            </p>
          </div>

          <!-- QR Code — generado localmente sin dependencia externa -->
          <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner flex flex-col items-center justify-center space-y-2">
            <img
              *ngIf="qrDataUrl()"
              [src]="qrDataUrl()"
              alt="QR Code Boleto"
              class="w-48 h-48 rounded-lg shadow-sm"
            />
            <div *ngIf="!qrDataUrl()" class="w-48 h-48 flex items-center justify-center">
              <tf-spinner size="md" color="primary"></tf-spinner>
            </div>
            <span class="font-mono text-[10px] text-slate-400 tracking-widest font-bold">
              AUTH: {{ selectedOrderForQr()!.id.substring(0, 16).toUpperCase() }}
            </span>
          </div>

          <!-- Ticket Details in Pass -->
          <div class="p-3.5 rounded-2xl bg-slate-100 text-xs text-slate-700 space-y-1">
            <p class="font-bold text-slate-900">
              Titular: {{ auth.user()?.user_metadata?.['full_name'] || auth.user()?.email }}
            </p>
            <div class="text-[11px] text-slate-500 flex items-center justify-center gap-2">
              <span>📅 {{ selectedOrderForQr()!.events?.event_date | date:'mediumDate' }}</span>
              <span>·</span>
              <span>🕒 {{ selectedOrderForQr()!.events?.event_date | date:'shortTime' }} hrs</span>
            </div>
          </div>

          <p class="text-[10px] text-slate-400 leading-tight">
            Presenta este código QR en la entrada del recinto desde tu celular o impreso para validar tu acceso.
          </p>
        </div>
      </div>
    </div>
  `,
})
export class MyTicketsComponent implements OnInit {
  private readonly myTicketsService = inject(MyTicketsService);
  private readonly platformId = inject(PLATFORM_ID);
  readonly auth = inject(AuthService);

  readonly isLoading = signal(true);
  readonly orders = signal<OrderWithRelations[]>([]);
  readonly selectedOrderForQr = signal<OrderWithRelations | null>(null);
  readonly qrDataUrl = signal<string | null>(null);

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
    if (isPlatformBrowser(this.platformId)) {
      this.qrDataUrl.set(generateQrDataUrl(`TICKETFLOW-AUTH-${order.id}`, 220));
    }
  }

  closeQrModal(): void {
    this.selectedOrderForQr.set(null);
    this.qrDataUrl.set(null);
  }
}
