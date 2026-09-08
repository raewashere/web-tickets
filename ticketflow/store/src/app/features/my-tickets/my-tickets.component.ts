import {
  Component,
  OnInit,
  inject,
  signal,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MyTicketsService } from './my-tickets.service';
import { WaitlistService } from '../../core/services/waitlist.service';
import { AuthService } from '@ticketflow/data-access';
import type { OrderWithRelations, RefundRequest, CustomerWaitlistSummary } from '@ticketflow/models';
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
    FormsModule,
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
            Mis Boletos & Reservas
          </h1>
          <p class="text-xs sm:text-sm text-slate-500 mt-1">
            Consulta tus entradas compradas, solicitudes de reembolso y registros en listas de espera.
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

      <!-- Tab Switcher -->
      <div class="flex items-center gap-3 border-b border-slate-200 pb-1">
        <button
          type="button"
          (click)="activeTab.set('tickets')"
          [class.text-slate-950]="activeTab() === 'tickets'"
          [class.border-cyan-500]="activeTab() === 'tickets'"
          [class.text-slate-500]="activeTab() !== 'tickets'"
          [class.border-transparent]="activeTab() !== 'tickets'"
          class="pb-3 px-3 text-sm font-black border-b-2 transition-all flex items-center gap-2"
        >
          <span>🎟️ Boletos Comprados</span>
          <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {{ orders().length }}
          </span>
        </button>

        <button
          type="button"
          (click)="activeTab.set('waitlist')"
          [class.text-slate-950]="activeTab() === 'waitlist'"
          [class.border-cyan-500]="activeTab() === 'waitlist'"
          [class.text-slate-500]="activeTab() !== 'waitlist'"
          [class.border-transparent]="activeTab() !== 'waitlist'"
          class="pb-3 px-3 text-sm font-black border-b-2 transition-all flex items-center gap-2"
        >
          <span>🔔 Listas de Espera</span>
          <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            {{ waitlistEntries().length }}
          </span>
        </button>
      </div>

      <!-- Toast Feedback Message -->
      <div
        *ngIf="feedbackMessage()"
        class="p-4 rounded-2xl flex items-center justify-between transition-all"
        [ngClass]="feedbackType() === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'"
      >
        <div class="flex items-center gap-3 text-sm font-semibold">
          <span>{{ feedbackType() === 'success' ? '✅' : '⚠️' }}</span>
          <span>{{ feedbackMessage() }}</span>
        </div>
        <button
          type="button"
          (click)="feedbackMessage.set(null)"
          class="text-xs font-bold px-2 py-1 rounded-lg hover:bg-black/5"
        >
          ✕
        </button>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="py-24 flex flex-col items-center justify-center gap-3">
        <tf-spinner size="lg" color="primary"></tf-spinner>
        <p class="text-sm text-slate-500 font-medium">Cargando tus entradas...</p>
      </div>

      <!-- Orders List (Tickets Tab) -->
      <div *ngIf="activeTab() === 'tickets'">
        <!-- Empty State for Orders -->
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

        <div *ngIf="!isLoading() && orders().length > 0" class="space-y-6">
          <div
            *ngFor="let order of orders()"
            class="p-6 sm:p-8 rounded-3xl border bg-white shadow-sm hover:shadow-md transition-all space-y-6"
            [ngClass]="order.status === 'refunded' ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'"
          >
            <!-- Order Top Header: Date & Status -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div class="flex flex-wrap items-center gap-2 sm:gap-3">
                <span class="font-mono font-bold text-xs bg-slate-100 px-2.5 py-1 rounded-lg text-slate-800">
                  Orden #{{ order.id.substring(0, 8).toUpperCase() }}
                </span>

                <!-- Status Badge -->
                <span
                  *ngIf="order.status === 'refunded'"
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200"
                >
                  💸 Reembolsado
                </span>
                <span
                  *ngIf="order.status === 'confirmed' && getRefund(order)?.status === 'pending'"
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200"
                >
                  ⏳ Reembolso en Revisión
                </span>
                <span
                  *ngIf="order.status === 'confirmed' && getRefund(order)?.status === 'rejected'"
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200"
                >
                  ❌ Solicitud Rechazada
                </span>
                <tf-badge *ngIf="order.status === 'confirmed' && !getRefund(order)" variant="success">
                  Confirmada
                </tf-badge>
              </div>

              <div class="text-xs text-slate-500">
                Comprado el: <strong class="text-slate-700">{{ order.created_at | date:'medium' }}</strong>
              </div>
            </div>

            <!-- Refund Status Info Alert (if applicable) -->
            <div
              *ngIf="getRefund(order) as refund"
              class="p-4 rounded-2xl text-xs space-y-1"
              [ngClass]="{
                'bg-amber-50 border border-amber-200 text-amber-900': refund.status === 'pending',
                'bg-emerald-50 border border-emerald-200 text-emerald-900': refund.status === 'approved' || order.status === 'refunded',
                'bg-rose-50 border border-rose-200 text-rose-900': refund.status === 'rejected'
              }"
            >
              <div class="flex items-center justify-between font-bold">
                <span>
                  {{ refund.status === 'pending' ? '⏳ Solicitud de reembolso en trámite' : refund.status === 'approved' || order.status === 'refunded' ? '✅ Reembolso completado' : '❌ Solicitud de reembolso declinada' }}
                </span>
                <span class="font-mono text-[11px] opacity-80">{{ refund.created_at | date:'short' }}</span>
              </div>
              <p class="text-slate-600">
                <strong>Motivo enviado:</strong> {{ refund.reason }}
              </p>
              <p *ngIf="refund.admin_notes" class="text-slate-700 italic">
                <strong>Nota del organizador:</strong> "{{ refund.admin_notes }}"
              </p>
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
                    [alt]="'Flyer del concierto ' + (order.events?.name || 'evento')"
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

                <!-- QR Button: Only if order is confirmed and not refunded -->
                <button
                  *ngIf="order.status === 'confirmed'"
                  type="button"
                  class="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-bold text-xs shadow-sm transition-all"
                  (click)="openQrModal(order)"
                >
                  📲 Ver QR
                </button>

                <!-- Request Refund Button -->
                <button
                  *ngIf="canRequestRefund(order)"
                  type="button"
                  (click)="openRefundModal(order)"
                  class="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors"
                >
                  💸 Solicitar Reembolso
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
      </div>

      <!-- Waitlist Tab Content -->
      <div *ngIf="activeTab() === 'waitlist'" class="space-y-6">
        <!-- Empty State for Waitlist -->
        <div
          *ngIf="!isLoading() && waitlistEntries().length === 0"
          class="py-20 text-center rounded-3xl border border-dashed border-slate-300 p-8 bg-white shadow-sm space-y-4"
        >
          <span class="text-5xl block">🔔</span>
          <h3 class="text-lg font-bold text-slate-900">No tienes registros en listas de espera</h3>
          <p class="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            Cuando un evento tenga localidades agotadas, podrás unirte a la lista de espera para recibir alertas prioritarias de compra.
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

        <!-- Waitlist Cards -->
        <div *ngIf="!isLoading() && waitlistEntries().length > 0" class="space-y-4">
          <div
            *ngFor="let entry of waitlistEntries()"
            class="p-6 rounded-3xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
          >
            <!-- Event & Details -->
            <div class="flex items-start gap-4">
              <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                <img
                  *ngIf="entry.flyer_url"
                  [src]="entry.flyer_url"
                  [alt]="'Flyer de ' + entry.event_name"
                  class="w-full h-full object-cover"
                />
                <div *ngIf="!entry.flyer_url" class="w-full h-full flex items-center justify-center text-xl text-slate-400">
                  🎪
                </div>
              </div>

              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span
                    *ngIf="entry.status === 'pending'"
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200"
                  >
                    ⏳ En Lista de Espera
                  </span>
                  <span
                    *ngIf="entry.status === 'notified'"
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"
                  >
                    🔔 ¡Boletos Liberados!
                  </span>
                  <span class="text-xs text-slate-400">· Registrado {{ entry.created_at | date:'mediumDate' }}</span>
                </div>

                <h3 class="text-base font-black text-slate-900 leading-snug">
                  {{ entry.event_name }}
                </h3>
                <p class="text-xs text-slate-500">
                  📍 {{ entry.venue_name || 'Recinto' }} · 📅 {{ entry.event_date | date:'mediumDate' }}
                </p>
                <p class="text-xs font-semibold text-slate-700 pt-0.5">
                  Localidad solicitada: <span class="font-bold text-cyan-600">{{ entry.ticket_type_name }}</span>
                </p>
              </div>
            </div>

            <!-- Action Link -->
            <div class="w-full md:w-auto flex-shrink-0">
              <a [routerLink]="['/events', entry.event_id]" class="w-full md:w-auto">
                <button
                  type="button"
                  class="w-full md:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <span>🎟️</span>
                  <span>Ver Evento & Boletos</span>
                </button>
              </a>
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
              [alt]="'Código QR digital de acceso para ' + (selectedOrderForQr()!.events?.name || 'evento')"
              class="w-56 h-56 rounded-lg shadow-sm object-contain"
            />
            <div *ngIf="!qrDataUrl()" class="w-56 h-56 flex items-center justify-center">
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

      <!-- Refund Request Modal -->
      <div
        *ngIf="selectedOrderForRefund()"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      >
        <div class="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200">
          <!-- Close Button -->
          <button
            type="button"
            (click)="closeRefundModal()"
            class="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-slate-100 text-slate-500 font-bold flex items-center justify-center transition-colors"
          >
            ✕
          </button>

          <!-- Header -->
          <div class="space-y-1">
            <span class="text-[10px] font-extrabold uppercase tracking-widest text-rose-600 block">
              Garantía y Devolución
            </span>
            <h3 class="text-xl font-black text-slate-900">
              Solicitar Reembolso
            </h3>
            <p class="text-xs text-slate-500">
              Orden #{{ selectedOrderForRefund()!.id.substring(0, 8).toUpperCase() }} · Total: <strong class="text-slate-800">\${{ selectedOrderForRefund()!.total | number:'1.2-2' }} MXN</strong>
            </p>
          </div>

          <!-- Notice Alert -->
          <div class="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
            <p class="font-bold flex items-center gap-1.5">
              <span>⚠️</span> Políticas de Devolución:
            </p>
            <p class="text-[11px] leading-relaxed">
              Tu solicitud será evaluada por el organizador del evento. Una vez aprobado, el importe se reintegrará y los boletos quedarán inválidos de forma permanente.
            </p>
          </div>

          <!-- Form -->
          <div class="space-y-4 text-xs">
            <div class="space-y-1.5">
              <label class="font-bold text-slate-700">Categoría del Motivo:</label>
              <select
                [(ngModel)]="refundCategory"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                <option value="Cancelación de planes personales">Cancelación de planes personales</option>
                <option value="Error en la compra o cantidad de boletos">Error en la compra o duplicidad</option>
                <option value="Imprevisto médico o de fuerza mayor">Imprevisto médico o de fuerza mayor</option>
                <option value="Inconformidad o cambio en el evento">Inconformidad o cambio en el evento</option>
                <option value="Otro motivo">Otro motivo</option>
              </select>
            </div>

            <div class="space-y-1.5">
              <label class="font-bold text-slate-700">Explica brevemente tu caso (mínimo 5 caracteres):</label>
              <textarea
                [(ngModel)]="refundDetails"
                rows="3"
                placeholder="Por favor describe detalladamente la razón de tu solicitud de reembolso..."
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none"
              ></textarea>
            </div>

            <!-- Error in modal -->
            <p *ngIf="refundError()" class="text-rose-600 font-bold text-xs">
              {{ refundError() }}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              (click)="closeRefundModal()"
              [disabled]="isSubmittingRefund()"
              class="px-4 py-2.5 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              (click)="submitRefundRequest()"
              [disabled]="isSubmittingRefund()"
              class="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <tf-spinner *ngIf="isSubmittingRefund()" size="sm" color="white"></tf-spinner>
              <span>{{ isSubmittingRefund() ? 'Enviando...' : 'Confirmar Solicitud' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class MyTicketsComponent implements OnInit {
  private readonly myTicketsService = inject(MyTicketsService);
  private readonly waitlistService = inject(WaitlistService);
  private readonly platformId = inject(PLATFORM_ID);
  readonly auth = inject(AuthService);

  readonly activeTab = signal<'tickets' | 'waitlist'>('tickets');
  readonly isLoading = signal(true);
  readonly orders = signal<OrderWithRelations[]>([]);
  readonly waitlistEntries = signal<CustomerWaitlistSummary[]>([]);
  readonly selectedOrderForQr = signal<OrderWithRelations | null>(null);
  readonly qrDataUrl = signal<string | null>(null);

  // Refund modal state
  readonly selectedOrderForRefund = signal<OrderWithRelations | null>(null);
  readonly isSubmittingRefund = signal(false);
  readonly refundError = signal<string | null>(null);
  refundCategory = 'Cancelación de planes personales';
  refundDetails = '';

  // Toast feedback
  readonly feedbackMessage = signal<string | null>(null);
  readonly feedbackType = signal<'success' | 'error'>('success');

  async ngOnInit(): Promise<void> {
    const user = this.auth.user();
    if (user) {
      await Promise.all([
        this.loadOrders(user.id),
        this.loadWaitlist(),
      ]);
    }
  }

  async loadOrders(userId: string): Promise<void> {
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

  async loadWaitlist(): Promise<void> {
    try {
      const data = await this.waitlistService.getMyWaitlist();
      this.waitlistEntries.set(data);
    } catch (err) {
      console.error('Error loading my waitlist:', err);
    }
  }

  getRefund(order: OrderWithRelations): RefundRequest | null {
    if (!order.refund_requests) return null;
    if (Array.isArray(order.refund_requests)) {
      return order.refund_requests[0] || null;
    }
    return order.refund_requests as RefundRequest;
  }

  canRequestRefund(order: OrderWithRelations): boolean {
    if (order.status !== 'confirmed') return false;
    const existingRefund = this.getRefund(order);
    if (existingRefund) return false;
    if (!order.events?.event_date) return false;
    return new Date(order.events.event_date).getTime() > Date.now();
  }

  async openQrModal(order: OrderWithRelations): Promise<void> {
    this.selectedOrderForQr.set(order);
    if (isPlatformBrowser(this.platformId)) {
      const url = await generateQrDataUrl(`TICKETFLOW-AUTH-${order.id}`, 400);
      this.qrDataUrl.set(url);
    }
  }

  closeQrModal(): void {
    this.selectedOrderForQr.set(null);
    this.qrDataUrl.set(null);
  }

  openRefundModal(order: OrderWithRelations): void {
    this.selectedOrderForRefund.set(order);
    this.refundCategory = 'Cancelación de planes personales';
    this.refundDetails = '';
    this.refundError.set(null);
  }

  closeRefundModal(): void {
    this.selectedOrderForRefund.set(null);
    this.refundError.set(null);
  }

  async submitRefundRequest(): Promise<void> {
    const order = this.selectedOrderForRefund();
    if (!order) return;

    const reason = this.refundDetails.trim()
      ? `[${this.refundCategory}] ${this.refundDetails.trim()}`
      : `[${this.refundCategory}] Solicitud de reembolso por parte del usuario.`;

    if (reason.length < 5) {
      this.refundError.set('Por favor describe tu motivo con al menos 5 caracteres.');
      return;
    }

    this.isSubmittingRefund.set(true);
    this.refundError.set(null);

    try {
      const res = await this.myTicketsService.requestRefund(order.id, reason);
      if (res.success) {
        this.closeRefundModal();
        this.feedbackType.set('success');
        this.feedbackMessage.set('Solicitud de reembolso enviada con éxito. El organizador la revisará a la brevedad.');
        const userId = this.auth.user()?.id;
        if (userId) {
          await this.loadOrders(userId);
        }
      } else {
        this.refundError.set(res.error || 'No se pudo procesar la solicitud.');
      }
    } catch (err: any) {
      this.refundError.set(err.message || 'Ocurrió un error inesperado.');
    } finally {
      this.isSubmittingRefund.set(false);
    }
  }
}

