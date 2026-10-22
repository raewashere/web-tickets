import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackofficeService } from '../../services/backoffice.service';
import type { RefundRequestWithRelations } from '@ticketflow/models';
import { SpinnerComponent, ToastService } from '@ticketflow/shared-ui';

@Component({
  selector: 'app-admin-refunds',
  standalone: true,
  imports: [CommonModule, FormsModule, SpinnerComponent],
  template: `
    <div class="space-y-8">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-widest text-on-secondary-container bg-secondary-container border border-secondary/20 px-3 py-1 rounded-full inline-block mb-2">
            Gestión Post-Venta Central
          </span>
          <h1 class="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
            Solicitudes de Reembolso Globales
          </h1>
          <p class="text-xs sm:text-sm text-on-surface-variant mt-1">
            Revisa y procesa las solicitudes de cancelación enviadas por los compradores con devolución automática en PayPal.
          </p>
        </div>

        <button
          type="button"
          (click)="loadRefunds()"
          class="px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/30 hover:bg-surface-variant/40 text-on-surface font-bold text-xs shadow-xs transition flex items-center gap-2 self-start sm:self-auto"
        >
          <i class="fa-solid fa-arrows-rotate" [class.animate-spin]="isLoading()"></i>
          <span>Actualizar Lista</span>
        </button>
      </div>

      <!-- Filters & Search -->
      <div class="p-4 rounded-2xl bg-surface-container border border-outline-variant/30 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="w-full md:max-w-md relative">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="Buscar por orden, cliente, evento o motivo..."
            class="w-full pl-10 pr-4 py-2 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-on-surface-variant text-xs"></i>
        </div>

        <div class="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            (click)="selectedFilter.set('all')"
            [class.bg-primary]="selectedFilter() === 'all'"
            [class.text-on-primary]="selectedFilter() === 'all'"
            [class.bg-surface]="selectedFilter() !== 'all'"
            [class.text-on-surface]="selectedFilter() !== 'all'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
          >
            Todas ({{ refunds().length }})
          </button>
          <button
            type="button"
            (click)="selectedFilter.set('pending')"
            [class.bg-primary]="selectedFilter() === 'pending'"
            [class.text-on-primary]="selectedFilter() === 'pending'"
            [class.bg-surface]="selectedFilter() !== 'pending'"
            [class.text-on-surface]="selectedFilter() !== 'pending'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
          >
            Pendientes ({{ pendingCount() }})
          </button>
          <button
            type="button"
            (click)="selectedFilter.set('approved')"
            [class.bg-primary]="selectedFilter() === 'approved'"
            [class.text-on-primary]="selectedFilter() === 'approved'"
            [class.bg-surface]="selectedFilter() !== 'approved'"
            [class.text-on-surface]="selectedFilter() !== 'approved'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
          >
            Aprobadas
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="py-24 flex flex-col items-center justify-center gap-3">
        <tf-spinner size="lg"></tf-spinner>
        <p class="text-xs text-on-surface-variant">Cargando solicitudes de reembolso...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMessage()" class="p-4 rounded-2xl bg-error-container text-on-error-container border border-error/20 text-xs font-bold">
        {{ errorMessage() }}
      </div>

      <!-- Refunds Table -->
      <div *ngIf="!isLoading() && filteredRefunds().length > 0" class="bg-surface-container rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs sm:text-sm">
            <thead class="bg-surface-variant/40 border-b border-outline-variant/20 text-on-surface-variant font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th class="py-3.5 px-4 sm:px-6">Orden / Cliente</th>
                <th class="py-3.5 px-4">Evento</th>
                <th class="py-3.5 px-4 text-right">Monto</th>
                <th class="py-3.5 px-4">Motivo de Solicitud</th>
                <th class="py-3.5 px-4 text-center">Estado</th>
                <th class="py-3.5 px-4 sm:px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant/20">
              <tr *ngFor="let ref of filteredRefunds()" class="hover:bg-primary/[0.03] transition">
                <td class="py-4 px-4 sm:px-6">
                  <div class="space-y-0.5">
                    <span class="font-bold font-mono text-on-surface block">Orden #{{ ref.order_id.substring(0, 8).toUpperCase() }}</span>
                    <span class="text-xs text-on-surface-variant">{{ ref.customer_name || ref.customer_email || 'Cliente' }}</span>
                  </div>
                </td>
                <td class="py-4 px-4 font-semibold text-on-surface">
                  <i class="fa-solid fa-calendar-days text-primary mr-1.5"></i>
                  <span>{{ ref.event_name || 'Evento' }}</span>
                </td>
                <td class="py-4 px-4 text-right font-bold font-mono text-primary">
                  \${{ (ref.order_total || ref.amount) | number:'1.2-2' }} MXN
                </td>
                <td class="py-4 px-4 max-w-xs">
                  <p class="text-xs text-on-surface italic">"{{ ref.reason }}"</p>
                  <p *ngIf="ref.admin_notes" class="text-[11px] text-on-surface-variant mt-0.5">
                    Nota Admin: {{ ref.admin_notes }}
                  </p>
                  <span class="text-[10px] text-on-surface-variant/70 font-mono block mt-0.5">
                    {{ ref.created_at | date:'dd/MM/yyyy HH:mm' }}
                  </span>
                </td>
                <td class="py-4 px-4 text-center">
                  <span
                    *ngIf="ref.status === 'pending'"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container border border-secondary/30 font-bold text-[11px]"
                  >
                    <i class="fa-solid fa-clock"></i>
                    <span>Pendiente</span>
                  </span>
                  <span
                    *ngIf="ref.status === 'approved'"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tertiary-container text-on-tertiary-container border border-tertiary/30 font-bold text-[11px]"
                  >
                    <i class="fa-solid fa-circle-check"></i>
                    <span>Aprobado</span>
                  </span>
                  <span
                    *ngIf="ref.status === 'rejected'"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-error-container text-on-error-container border border-error/20 font-bold text-[11px]"
                  >
                    <i class="fa-solid fa-circle-xmark text-error"></i>
                    <span>Rechazado</span>
                  </span>
                </td>
                <td class="py-4 px-4 sm:px-6 text-right">
                  <div *ngIf="ref.status === 'pending'" class="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      (click)="openProcessModal(ref, 'approved')"
                      [disabled]="processingId() === ref.id"
                      class="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs shadow-xs transition disabled:opacity-50"
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      (click)="openProcessModal(ref, 'rejected')"
                      [disabled]="processingId() === ref.id"
                      class="px-3 py-1.5 rounded-lg bg-error-container hover:bg-error/20 text-on-error-container border border-error/30 font-bold text-xs shadow-xs transition disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </div>
                  <span *ngIf="ref.status !== 'pending'" class="text-xs text-on-surface-variant italic">
                    Procesado
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading() && filteredRefunds().length === 0" class="p-12 text-center bg-surface-container rounded-2xl border border-dashed border-outline-variant/40 space-y-2">
        <span class="text-3xl block text-on-surface-variant/40">
          <i class="fa-solid fa-rotate-left"></i>
        </span>
        <h3 class="font-bold text-on-surface text-base">No hay solicitudes de reembolso</h3>
        <p class="text-xs text-on-surface-variant">No hay reembolsos coincidentes con tus criterios.</p>
      </div>

      <!-- M3 Confirmation Modal with Admin Notes -->
      <div
        *ngIf="activeModalRefund()"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      >
        <div class="relative w-full max-w-md bg-surface-container-high rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl border border-outline-variant/30">
          <button
            type="button"
            (click)="closeProcessModal()"
            class="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-surface-variant text-on-surface-variant font-bold flex items-center justify-center transition"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>

          <div class="space-y-1">
            <span
              class="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full inline-block"
              [ngClass]="modalAction() === 'approved' ? 'bg-tertiary-container text-on-tertiary-container border border-tertiary/30' : 'bg-error-container text-on-error-container border border-error/30'"
            >
              {{ modalAction() === 'approved' ? 'Aprobación y Reembolso PayPal' : 'Rechazo de Solicitud' }}
            </span>
            <h3 class="text-xl font-bold text-on-surface">
              {{ modalAction() === 'approved' ? '¿Confirmar Reembolso?' : '¿Rechazar Solicitud?' }}
            </h3>
            <p class="text-xs text-on-surface-variant">
              Orden #{{ activeModalRefund()!.order_id.substring(0, 8).toUpperCase() }} · Importe: <strong class="text-on-surface font-mono">\${{ (activeModalRefund()!.order_total || activeModalRefund()!.amount) | number:'1.2-2' }} MXN</strong>
            </p>
          </div>

          <div class="p-3 rounded-xl bg-surface text-xs text-on-surface space-y-0.5 border border-outline-variant/20">
            <span class="font-bold text-[10px] uppercase text-on-surface-variant block">Motivo del Cliente:</span>
            <p class="italic">"{{ activeModalRefund()!.reason }}"</p>
          </div>

          <div class="space-y-1.5 text-xs">
            <label class="font-bold text-on-surface">
              {{ modalAction() === 'approved' ? 'Nota administrativa (opcional):' : 'Motivo del rechazo para el comprador (opcional):' }}
            </label>
            <textarea
              [(ngModel)]="modalAdminNotes"
              rows="2"
              placeholder="Escribe una nota que verá el comprador en su boleto..."
              class="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none resize-none"
            ></textarea>
          </div>

          <div class="flex items-center justify-end gap-3 pt-2 border-t border-outline-variant/20">
            <button
              type="button"
              (click)="closeProcessModal()"
              [disabled]="processingId() !== null"
              class="px-4 py-2 rounded-xl text-on-surface-variant font-bold text-xs hover:bg-surface-variant transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              (click)="confirmProcessRefund()"
              [disabled]="processingId() !== null"
              class="px-5 py-2 rounded-xl font-bold text-xs shadow-md transition flex items-center gap-2"
              [ngClass]="modalAction() === 'approved' ? 'bg-primary text-on-primary hover:bg-primary/90' : 'bg-error text-on-error hover:opacity-90'"
            >
              <tf-spinner *ngIf="processingId() !== null" size="sm" color="white"></tf-spinner>
              <span>{{ processingId() !== null ? 'Procesando...' : (modalAction() === 'approved' ? 'Aprobar y Reembolsar' : 'Confirmar Rechazo') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AdminRefundsComponent implements OnInit {
  private readonly backofficeService = inject(BackofficeService);
  private readonly toast = inject(ToastService);

  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly refunds = signal<RefundRequestWithRelations[]>([]);
  readonly processingId = signal<string | null>(null);

  // Modal State
  readonly activeModalRefund = signal<RefundRequestWithRelations | null>(null);
  readonly modalAction = signal<'approved' | 'rejected'>('approved');
  modalAdminNotes = '';

  searchQuery = '';
  readonly selectedFilter = signal<'all' | 'pending' | 'approved'>('all');

  readonly pendingCount = computed(
    () => this.refunds().filter((r) => r.status === 'pending').length
  );

  readonly filteredRefunds = computed(() => {
    let list = this.refunds();
    const filter = this.selectedFilter();

    if (filter === 'pending') {
      list = list.filter((r) => r.status === 'pending');
    } else if (filter === 'approved') {
      list = list.filter((r) => r.status === 'approved');
    }

    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          (r.order_id && r.order_id.toLowerCase().includes(q)) ||
          (r.event_name && r.event_name.toLowerCase().includes(q)) ||
          (r.reason && r.reason.toLowerCase().includes(q)) ||
          (r.customer_email && r.customer_email.toLowerCase().includes(q))
      );
    }

    return list;
  });

  async ngOnInit(): Promise<void> {
    await this.loadRefunds();
  }

  async loadRefunds(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const data = await this.backofficeService.getAllRefundRequests();
      this.refunds.set(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar reembolsos.';
      this.errorMessage.set(msg);
    } finally {
      this.isLoading.set(false);
    }
  }

  openProcessModal(refund: RefundRequestWithRelations, action: 'approved' | 'rejected'): void {
    this.activeModalRefund.set(refund);
    this.modalAction.set(action);
    this.modalAdminNotes = '';
  }

  closeProcessModal(): void {
    this.activeModalRefund.set(null);
    this.modalAdminNotes = '';
  }

  async confirmProcessRefund(): Promise<void> {
    const refund = this.activeModalRefund();
    if (!refund) return;

    const action = this.modalAction();
    this.processingId.set(refund.id);

    try {
      await this.backofficeService.processRefundRequest(refund.id, action, this.modalAdminNotes);
      this.toast.success(
        action === 'approved' ? 'Reembolso Aprobado' : 'Solicitud Rechazada',
        action === 'approved'
          ? `Se procesó la devolución de la orden #${refund.order_id.substring(0, 8).toUpperCase()} y se restauró el stock.`
          : `La solicitud de la orden #${refund.order_id.substring(0, 8).toUpperCase()} fue marcada como rechazada.`
      );
      this.closeProcessModal();
      await this.loadRefunds();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar reembolso.';
      this.toast.error('Error al Procesar Reembolso', msg);
    } finally {
      this.processingId.set(null);
    }
  }
}
