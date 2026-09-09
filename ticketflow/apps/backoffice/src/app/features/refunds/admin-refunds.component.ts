import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackofficeService } from '../../services/backoffice.service';
import type { RefundRequestWithRelations } from '@ticketflow/models';
import { SpinnerComponent } from '@ticketflow/shared-ui';

@Component({
  selector: 'app-admin-refunds',
  standalone: true,
  imports: [CommonModule, FormsModule, SpinnerComponent],
  template: `
    <div class="space-y-8">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span class="text-[10px] font-black uppercase tracking-widest text-rose-700 bg-rose-100 border border-rose-300 px-3 py-1 rounded-full inline-block mb-2">
            Gestión Post-Venta Central
          </span>
          <h1 class="text-2xl sm:text-3xl font-black text-dark tracking-tight">
            Solicitudes de Reembolso Globales
          </h1>
          <p class="text-xs sm:text-sm text-dark/60 mt-1">
            Revisa y procesa las solicitudes de cancelación enviadas por los compradores de cualquier evento.
          </p>
        </div>

        <button
          type="button"
          (click)="loadRefunds()"
          class="px-4 py-2.5 rounded-xl bg-white border border-dark/10 hover:bg-dark/5 text-dark font-bold text-xs shadow-sm transition flex items-center gap-2 self-start sm:self-auto"
        >
          <span>🔄</span>
          <span>Actualizar Lista</span>
        </button>
      </div>

      <!-- Filters & Search -->
      <div class="p-4 rounded-2xl bg-white border border-dark/10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="w-full md:max-w-md relative">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="Buscar por orden, cliente, evento o motivo..."
            class="w-full pl-10 pr-4 py-2 rounded-xl border border-dark/20 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <span class="absolute left-3.5 top-2.5 text-dark/40 text-sm">🔍</span>
        </div>

        <div class="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            (click)="selectedFilter.set('all')"
            [class.bg-dark]="selectedFilter() === 'all'"
            [class.text-white]="selectedFilter() === 'all'"
            [class.bg-dark/5]="selectedFilter() !== 'all'"
            [class.text-dark]="selectedFilter() !== 'all'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
          >
            Todas ({{ refunds().length }})
          </button>
          <button
            type="button"
            (click)="selectedFilter.set('pending')"
            [class.bg-amber-500]="selectedFilter() === 'pending'"
            [class.text-white]="selectedFilter() === 'pending'"
            [class.bg-amber-50]="selectedFilter() !== 'pending'"
            [class.text-amber-800]="selectedFilter() !== 'pending'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
          >
            Pendientes ({{ pendingCount() }})
          </button>
          <button
            type="button"
            (click)="selectedFilter.set('approved')"
            [class.bg-emerald-600]="selectedFilter() === 'approved'"
            [class.text-white]="selectedFilter() === 'approved'"
            [class.bg-emerald-50]="selectedFilter() !== 'approved'"
            [class.text-emerald-800]="selectedFilter() !== 'approved'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
          >
            Aprobadas
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="py-24 flex flex-col items-center justify-center gap-3">
        <tf-spinner size="lg"></tf-spinner>
        <p class="text-xs text-dark/50">Cargando solicitudes de reembolso...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMessage()" class="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
        {{ errorMessage() }}
      </div>

      <!-- Refunds Table -->
      <div *ngIf="!isLoading() && filteredRefunds().length > 0" class="bg-white rounded-2xl border border-dark/10 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs sm:text-sm">
            <thead class="bg-dark/5 border-b border-dark/10 text-dark/60 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th class="py-3.5 px-4 sm:px-6">Orden / Cliente</th>
                <th class="py-3.5 px-4">Evento</th>
                <th class="py-3.5 px-4 text-right">Monto</th>
                <th class="py-3.5 px-4">Motivo de Solicitud</th>
                <th class="py-3.5 px-4 text-center">Estado</th>
                <th class="py-3.5 px-4 sm:px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-dark/10">
              <tr *ngFor="let ref of filteredRefunds()" class="hover:bg-dark/[0.02] transition">
                <td class="py-4 px-4 sm:px-6">
                  <div class="space-y-0.5">
                    <span class="font-extrabold text-dark block">Orden #{{ ref.order_id.substring(0, 8) }}</span>
                    <span class="text-xs text-dark/60">{{ ref.customer_name || ref.customer_email || 'Cliente' }}</span>
                  </div>
                </td>
                <td class="py-4 px-4 font-semibold text-dark/80">
                  🎪 {{ ref.event_name || 'Evento' }}
                </td>
                <td class="py-4 px-4 text-right font-black font-mono text-dark">
                  \${{ (ref.order_total || ref.amount) | number:'1.2-2' }} MXN
                </td>
                <td class="py-4 px-4 max-w-xs">
                  <p class="text-xs text-dark/80 italic">"{{ ref.reason }}"</p>
                  <span class="text-[10px] text-dark/40 font-mono block mt-0.5">
                    {{ ref.created_at | date:'dd/MM/yyyy HH:mm' }}
                  </span>
                </td>
                <td class="py-4 px-4 text-center">
                  <span
                    *ngIf="ref.status === 'pending'"
                    class="inline-block px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[11px]"
                  >
                    ⏳ Pendiente
                  </span>
                  <span
                    *ngIf="ref.status === 'approved'"
                    class="inline-block px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]"
                  >
                    ✅ Aprobado
                  </span>
                  <span
                    *ngIf="ref.status === 'rejected'"
                    class="inline-block px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px]"
                  >
                    ✕ Rechazado
                  </span>
                </td>
                <td class="py-4 px-4 sm:px-6 text-right">
                  <div *ngIf="ref.status === 'pending'" class="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      (click)="processRefund(ref, 'approved')"
                      [disabled]="processingId() === ref.id"
                      class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      (click)="processRefund(ref, 'rejected')"
                      [disabled]="processingId() === ref.id"
                      class="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </div>
                  <span *ngIf="ref.status !== 'pending'" class="text-xs text-dark/40 italic">
                    Procesado
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading() && filteredRefunds().length === 0" class="p-12 text-center bg-white rounded-2xl border border-dashed border-dark/20 space-y-2">
        <span class="text-3xl">💸</span>
        <h3 class="font-bold text-dark text-base">No hay solicitudes de reembolso</h3>
        <p class="text-xs text-dark/50">No hay reembolsos coincidentes con tus criterios.</p>
      </div>
    </div>
  `,
})
export class AdminRefundsComponent implements OnInit {
  private readonly backofficeService = inject(BackofficeService);

  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly refunds = signal<RefundRequestWithRelations[]>([]);
  readonly processingId = signal<string | null>(null);

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

  async processRefund(refund: RefundRequestWithRelations, action: 'approved' | 'rejected'): Promise<void> {
    const orderIdShort = refund.order_id ? refund.order_id.substring(0, 8) : refund.id.substring(0, 8);
    const confirmMsg = action === 'approved' 
      ? `¿Confirmas la aprobación del reembolso de la orden #${orderIdShort}? Esto reincorporará el stock de boletos y anulará los QR.`
      : `¿Deseas rechazar la solicitud de reembolso para la orden #${orderIdShort}?`;

    if (!confirm(confirmMsg)) return;

    this.processingId.set(refund.id);

    try {
      await this.backofficeService.processRefundRequest(refund.id, action);
      await this.loadRefunds();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar reembolso.';
      alert(msg);
    } finally {
      this.processingId.set(null);
    }
  }
}
