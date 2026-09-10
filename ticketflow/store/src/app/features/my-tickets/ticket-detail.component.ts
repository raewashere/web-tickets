import {
  Component,
  OnInit,
  inject,
  signal,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MyTicketsService } from './my-tickets.service';
import { AuthService } from '@ticketflow/data-access';
import type { OrderWithRelations, RefundRequest } from '@ticketflow/models';
import { generateQrDataUrl } from '../../shared/utils/qr.utils';
import { ButtonComponent, BadgeComponent, SpinnerComponent } from '@ticketflow/shared-ui';

@Component({
  selector: 'store-ticket-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ButtonComponent, BadgeComponent, SpinnerComponent],
  template: `
    <div class="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-8 print:py-0 print:px-0 print:max-w-full">

      <!-- Back nav & Print Button (hidden when printing) -->
      <div class="flex items-center justify-between print:hidden">
        <a
          routerLink="/my-tickets"
          class="inline-flex items-center gap-2 text-xs font-bold text-dark/60 hover:text-primary transition-colors"
        >
          <i class="fa-solid fa-arrow-left"></i> Volver a Mis Boletos
        </a>

        <button
          *ngIf="order()?.status === 'confirmed'"
          type="button"
          (click)="printPass()"
          class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-dark/10 hover:bg-dark/20 text-dark text-xs font-bold transition-colors"
        >
          <i class="fa-solid fa-print"></i>
          <span>Imprimir / Guardar PDF</span>
        </button>
      </div>

      <!-- Toast Feedback Message -->
      <div
        *ngIf="feedbackMessage()"
        class="p-4 rounded-2xl flex items-center justify-between transition-all print:hidden"
        [ngClass]="feedbackType() === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'"
      >
        <div class="flex items-center gap-3 text-sm font-semibold">
          <i class="fa-solid" [ngClass]="feedbackType() === 'success' ? 'fa-circle-check text-emerald-600' : 'fa-triangle-exclamation text-rose-600'"></i>
          <span>{{ feedbackMessage() }}</span>
        </div>
        <button
          type="button"
          (click)="feedbackMessage.set(null)"
          class="text-xs font-bold px-2 py-1 rounded-lg hover:bg-black/5"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading()" class="py-20 flex flex-col items-center gap-3 print:hidden">
        <tf-spinner size="lg" color="primary"></tf-spinner>
        <p class="text-sm text-dark/60">Cargando boleto...</p>
      </div>

      <!-- Not found -->
      <div *ngIf="!isLoading() && !order()" class="py-16 text-center space-y-3 print:hidden">
        <i class="fa-solid fa-ticket text-4xl text-slate-300 block mb-2"></i>
        <p class="text-dark/60 text-sm">No se encontró la orden solicitada.</p>
        <a routerLink="/my-tickets">
          <tf-button variant="primary" size="sm">Ver Mis Boletos</tf-button>
        </a>
      </div>

      <!-- Content -->
      <div *ngIf="!isLoading() && order()" class="space-y-6">

        <!-- Order header -->
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs text-dark/50 font-mono">
              Orden #{{ order()!.id.substring(0, 8).toUpperCase() }}
            </p>
            <h1 class="text-2xl font-black text-dark">{{ order()!.events?.name }}</h1>
            <p class="text-sm text-dark/60 mt-0.5">
              <i class="fa-solid fa-location-dot mr-1"></i> {{ order()!.events?.venues?.name }}
              &nbsp;·&nbsp;
              <i class="fa-regular fa-calendar mr-1"></i> {{ order()!.events?.event_date | date:'mediumDate' }}
            </p>
          </div>

          <!-- Status Badge -->
          <div>
            <span
              *ngIf="order()!.status === 'refunded'"
              class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200"
            >
              <i class="fa-solid fa-money-bill-transfer mr-1"></i> Reembolsado
            </span>
            <span
              *ngIf="order()!.status === 'confirmed' && currentRefund?.status === 'pending'"
              class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200"
            >
              <i class="fa-solid fa-clock mr-1"></i> En Revisión de Reembolso
            </span>
            <span
              *ngIf="order()!.status === 'confirmed' && currentRefund?.status === 'rejected'"
              class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200"
            >
              <i class="fa-solid fa-circle-xmark mr-1"></i> Reembolso Rechazado
            </span>
            <tf-badge *ngIf="order()!.status === 'confirmed' && !currentRefund" variant="success">
              Confirmada
            </tf-badge>
          </div>
        </div>

        <!-- Refund Status Notice Banner -->
        <div
          *ngIf="currentRefund"
          class="p-4 rounded-3xl text-xs space-y-1.5 print:hidden"
          [ngClass]="{
            'bg-amber-50 border border-amber-200 text-amber-900': currentRefund.status === 'pending',
            'bg-emerald-50 border border-emerald-200 text-emerald-900': currentRefund.status === 'approved' || order()!.status === 'refunded',
            'bg-rose-50 border border-rose-200 text-rose-900': currentRefund.status === 'rejected'
          }"
        >
          <div class="flex items-center justify-between font-bold">
            <span>
              <ng-container *ngIf="currentRefund.status === 'pending'"><i class="fa-solid fa-clock mr-1"></i> Tu solicitud de reembolso está en revisión por el organizador</ng-container>
              <ng-container *ngIf="currentRefund.status === 'approved' || order()!.status === 'refunded'"><i class="fa-solid fa-circle-check mr-1"></i> Reembolso completado con éxito</ng-container>
              <ng-container *ngIf="currentRefund.status === 'rejected'"><i class="fa-solid fa-circle-xmark mr-1"></i> Solicitud de reembolso rechazada</ng-container>
            </span>
            <span class="font-mono text-[11px] opacity-75">{{ currentRefund.created_at | date:'medium' }}</span>
          </div>
          <p class="text-slate-700">
            <strong>Motivo registrado:</strong> {{ currentRefund.reason }}
          </p>
          <p *ngIf="currentRefund.admin_notes" class="text-slate-800 italic">
            <strong>Respuesta del organizador:</strong> "{{ currentRefund.admin_notes }}"
          </p>
        </div>

        <!-- QR Pass Card (Boarding Pass Layout) -->
        <div
          class="rounded-3xl border bg-surface shadow-lg overflow-hidden print:shadow-none print:border-2"
          [ngClass]="order()!.status === 'refunded' ? 'border-rose-300 opacity-90' : 'border-dark/10 print:border-black'"
        >
          <!-- Dark header strip -->
          <div
            class="px-6 py-4 flex items-center justify-between text-surface"
            [ngClass]="order()!.status === 'refunded' ? 'bg-rose-950' : 'bg-dark print:bg-black'"
          >
            <div>
              <span class="text-[10px] font-extrabold uppercase tracking-widest text-primary block">
                {{ order()!.status === 'refunded' ? 'Boleto Invalido / Cancelado' : 'Pase de Acceso Oficial' }}
              </span>
              <span class="text-surface font-black text-base leading-tight">
                {{ order()!.events?.name }}
              </span>
            </div>
            <span class="text-2xl"><i class="fa-solid" [ngClass]="order()!.status === 'refunded' ? 'fa-ban' : 'fa-ticket'"></i></span>
          </div>

          <!-- QR area -->
          <div class="p-8 flex flex-col items-center gap-5 relative">
            <!-- If Refunded Banner Overlay -->
            <div
              *ngIf="order()!.status === 'refunded'"
              class="w-full p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-center space-y-1"
            >
              <p class="font-black text-sm uppercase tracking-wider flex items-center justify-center gap-1.5"><i class="fa-solid fa-ban text-rose-600"></i> Este pase ha sido reembolsado y cancelado</p>
              <p class="text-[11px] text-rose-600">No es válido para el acceso al recinto.</p>
            </div>

            <!-- QR canvas image -->
            <div
              *ngIf="order()!.status === 'confirmed'"
              class="p-4 bg-white rounded-2xl border-2 border-dark/10 shadow-inner print:border-black"
            >
              <img
                *ngIf="qrDataUrl()"
                [src]="qrDataUrl()"
                [alt]="'Código QR de validación y acceso oficial para orden ' + (order()?.id?.substring(0, 8) || '')"
                class="w-56 h-56 sm:w-64 sm:h-64 rounded-lg object-contain"
              />
              <div *ngIf="!qrDataUrl()" class="w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
                <tf-spinner size="md" color="primary"></tf-spinner>
              </div>
            </div>

            <!-- Auth code -->
            <div class="text-center space-y-1">
              <p class="font-mono text-xs text-dark/50 tracking-widest font-bold">
                AUTH: {{ order()!.id.substring(0, 16).toUpperCase() }}
              </p>
              <p *ngIf="order()!.status === 'confirmed'" class="text-[10px] text-dark/40 print:text-black">
                Presenta este QR en la entrada del recinto desde tu celular o impreso para validar tu acceso.
              </p>
            </div>

            <!-- Ticket breakdown -->
            <div class="w-full divide-y divide-dark/10 border-t border-dark/10 pt-4 text-xs">
              <div *ngFor="let item of order()!.order_items"
                class="py-2.5 flex items-center justify-between text-dark/80"
              >
                <div class="flex items-center gap-2">
                  <span class="w-6 h-6 rounded-lg bg-primary/20 text-primary font-black text-xs flex items-center justify-center print:bg-gray-200 print:text-black">
                    {{ item.quantity }}
                  </span>
                  <span class="font-semibold">{{ item.ticket_types?.name }}</span>
                  <span class="font-mono text-dark/40 text-[10px]">{{ item.ticket_types?.sku }}</span>
                </div>
                <span class="font-mono font-bold">\${{ item.unit_price | number:'1.2-2' }} c/u</span>
              </div>
            </div>

            <!-- Totals -->
            <div class="w-full space-y-1 border-t border-dark/10 pt-3 text-xs">
              <div class="flex justify-between text-dark/60">
                <span>Subtotal</span>
                <span class="font-mono">\${{ order()!.subtotal | number:'1.2-2' }}</span>
              </div>
              <div *ngIf="order()!.discount_amount > 0" class="flex justify-between text-accent font-bold">
                <span>Descuento</span>
                <span class="font-mono">-\${{ order()!.discount_amount | number:'1.2-2' }}</span>
              </div>
              <div class="flex justify-between font-black text-dark text-sm pt-1 border-t border-dark/10">
                <span>Total {{ order()!.status === 'refunded' ? 'reembolsado' : 'pagado' }}</span>
                <span class="font-mono text-primary print:text-black">\${{ order()!.total | number:'1.2-2' }} MXN</span>
              </div>
            </div>
          </div>

          <!-- Holder strip -->
          <div class="px-6 py-4 bg-dark/5 border-t border-dark/10 flex items-center justify-between text-xs text-dark/70 print:bg-gray-100">
            <div>
              <span class="font-bold text-dark block">Titular del boleto</span>
              <span>{{ auth.user()?.user_metadata?.['full_name'] || auth.user()?.email }}</span>
            </div>
            <div class="text-right">
              <span class="font-bold text-dark block">Método de pago</span>
              <span class="capitalize">{{ order()!.payment_provider }}</span>
            </div>
          </div>
        </div>

        <!-- Action Bar & Buttons -->
        <div class="flex flex-col sm:flex-row items-center justify-center gap-3 print:hidden pt-2">
          <button
            *ngIf="order()!.status === 'confirmed'"
            type="button"
            (click)="printPass()"
            class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-dark text-surface hover:bg-black font-bold text-xs transition-all shadow-md"
          >
            <i class="fa-solid fa-print"></i>
            <span>Imprimir / Descargar en PDF</span>
          </button>

          <button
            *ngIf="canRequestRefund()"
            type="button"
            (click)="showRefundModal.set(true)"
            class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-all shadow-sm"
          >
            <i class="fa-solid fa-money-bill-transfer"></i>
            <span>Solicitar Reembolso</span>
          </button>
        </div>

        <p *ngIf="order()!.status === 'confirmed'" class="text-center text-xs text-dark/40 print:hidden">
          <i class="fa-regular fa-lightbulb text-amber-500 mr-1"></i> Puedes imprimir esta página o tomar captura de pantalla para acceder sin internet.
        </p>
      </div>

      <!-- Refund Request Modal -->
      <div
        *ngIf="showRefundModal()"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in print:hidden"
      >
        <div class="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200">
          <!-- Close Button -->
          <button
            type="button"
            (click)="closeRefundModal()"
            class="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-slate-100 text-slate-500 font-bold flex items-center justify-center transition-colors"
          >
            <i class="fa-solid fa-xmark"></i>
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
              Orden #{{ order()!.id.substring(0, 8).toUpperCase() }} · Total: <strong class="text-slate-800">\${{ order()!.total | number:'1.2-2' }} MXN</strong>
            </p>
          </div>

          <!-- Notice Alert -->
          <div class="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
            <p class="font-bold flex items-center gap-1.5">
              <i class="fa-solid fa-triangle-exclamation text-amber-600"></i> Políticas de Devolución:
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
export class TicketDetailComponent implements OnInit {
  private readonly route           = inject(ActivatedRoute);
  private readonly myTicketsService = inject(MyTicketsService);
  readonly auth                    = inject(AuthService);
  private readonly platformId      = inject(PLATFORM_ID);

  readonly isLoading  = signal(true);
  readonly order      = signal<OrderWithRelations | null>(null);
  readonly qrDataUrl  = signal<string | null>(null);

  // Refund State
  readonly showRefundModal = signal(false);
  readonly isSubmittingRefund = signal(false);
  readonly refundError = signal<string | null>(null);
  refundCategory = 'Cancelación de planes personales';
  refundDetails = '';

  // Toast feedback
  readonly feedbackMessage = signal<string | null>(null);
  readonly feedbackType = signal<'success' | 'error'>('success');

  get currentRefund(): RefundRequest | null {
    const o = this.order();
    if (!o?.refund_requests) return null;
    if (Array.isArray(o.refund_requests)) {
      return o.refund_requests[0] || null;
    }
    return o.refund_requests as RefundRequest;
  }

  canRequestRefund(): boolean {
    const o = this.order();
    if (!o || o.status !== 'confirmed') return false;
    if (this.currentRefund) return false;
    if (!o.events?.event_date) return false;
    return new Date(o.events.event_date).getTime() > Date.now();
  }

  async ngOnInit(): Promise<void> {
    await this.loadOrderDetail();
  }

  private async loadOrderDetail(): Promise<void> {
    const orderId = this.route.snapshot.paramMap.get('orderId');
    if (!orderId) { this.isLoading.set(false); return; }

    try {
      const userId = this.auth.user()?.id;
      if (!userId) { this.isLoading.set(false); return; }

      const orders = await this.myTicketsService.getMyOrders(userId);
      const found  = orders.find((o) => o.id === orderId) ?? null;
      this.order.set(found);

      // Generate QR locally if in browser and order is confirmed
      if (found && found.status === 'confirmed' && isPlatformBrowser(this.platformId)) {
        const payload = `TICKETFLOW-AUTH-${found.id}`;
        const url = await generateQrDataUrl(payload, 400);
        this.qrDataUrl.set(url);
      }
    } catch (err) {
      console.error('TicketDetail error:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  printPass(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.print();
    }
  }

  closeRefundModal(): void {
    this.showRefundModal.set(false);
    this.refundError.set(null);
  }

  async submitRefundRequest(): Promise<void> {
    const o = this.order();
    if (!o) return;

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
      const res = await this.myTicketsService.requestRefund(o.id, reason);
      if (res.success) {
        this.closeRefundModal();
        this.feedbackType.set('success');
        this.feedbackMessage.set('Solicitud de reembolso enviada con éxito.');
        await this.loadOrderDetail();
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

