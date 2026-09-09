import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RefundsService } from './refunds.service';
import type { RefundRequestWithRelations } from '@ticketflow/models';
import { SpinnerComponent } from '@ticketflow/shared-ui';

type RefundFilter = 'all' | 'pending' | 'approved' | 'rejected';

@Component({
  selector: 'app-refund-list',
  standalone: true,
  imports: [CommonModule, FormsModule, SpinnerComponent],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span class="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full inline-block mb-2">
            Gestión de Post-Venta
          </span>
          <h1 class="text-2xl sm:text-3xl font-black text-dark tracking-tight">
            Solicitudes de Reembolso
          </h1>
          <p class="text-xs sm:text-sm text-dark/60 mt-1">
            Revisa, aprueba o rechaza solicitudes de devolución de boletos con reintegro automático de stock y cancelación de accesos.
          </p>
        </div>

        <button
          type="button"
          (click)="loadRefundRequests()"
          class="px-4 py-2 rounded-xl bg-white border border-dark/10 hover:bg-dark/5 text-dark font-bold text-xs shadow-sm transition flex items-center gap-2 self-start sm:self-auto"
        >
          <i class="fa-solid fa-rotate-right" [class.animate-spin]="isLoading()"></i>
          <span>Actualizar Lista</span>
        </button>
      </div>

      <!-- Feedback Banner -->
      <div
        *ngIf="feedbackMessage()"
        class="p-4 rounded-2xl flex items-center justify-between transition-all"
        [ngClass]="feedbackType() === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'"
      >
        <div class="flex items-center gap-2 text-xs sm:text-sm font-semibold">
          <i [class]="feedbackType() === 'success' ? 'fa-solid fa-circle-check text-emerald-600' : 'fa-solid fa-triangle-exclamation text-rose-600'"></i>
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

      <!-- Stats Cards Row -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <!-- Total -->
        <div class="p-4 rounded-2xl bg-white border border-dark/10 shadow-sm space-y-1">
          <span class="text-[10px] font-bold uppercase tracking-wider text-dark/50 block">Total Solicitudes</span>
          <p class="text-xl sm:text-2xl font-black text-dark">{{ requests().length }}</p>
          <span class="text-[10px] text-dark/40 font-medium">Histórico recibido</span>
        </div>

        <!-- Pending -->
        <div class="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/70 shadow-sm space-y-1">
          <span class="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center justify-between">
            <span>Pendientes</span>
            <i class="fa-regular fa-clock text-xs"></i>
          </span>
          <p class="text-xl sm:text-2xl font-black text-amber-700">{{ countPending() }}</p>
          <span class="text-[10px] text-amber-600/70 font-medium">Requieren resolución</span>
        </div>

        <!-- Approved -->
        <div class="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/70 shadow-sm space-y-1">
          <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center justify-between">
            <span>Aprobadas</span>
            <i class="fa-solid fa-circle-check text-xs"></i>
          </span>
          <p class="text-xl sm:text-2xl font-black text-emerald-700">{{ countApproved() }}</p>
          <span class="text-[10px] text-emerald-600/70 font-medium">Stock restablecido</span>
        </div>

        <!-- Rejected -->
        <div class="p-4 rounded-2xl bg-rose-50/50 border border-rose-200/70 shadow-sm space-y-1">
          <span class="text-[10px] font-bold uppercase tracking-wider text-rose-700 flex items-center justify-between">
            <span>Rechazadas</span>
            <i class="fa-solid fa-circle-xmark text-xs"></i>
          </span>
          <p class="text-xl sm:text-2xl font-black text-rose-700">{{ countRejected() }}</p>
          <span class="text-[10px] text-rose-600/70 font-medium">Boletos vigentes</span>
        </div>

        <!-- Total Refunded Amount -->
        <div class="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-white border border-dark/10 shadow-sm space-y-1">
          <span class="text-[10px] font-bold uppercase tracking-wider text-dark/50 block">Monto Reembolsado</span>
          <p class="text-xl sm:text-2xl font-black text-primary">\${{ totalRefundedAmount() | number:'1.2-2' }}</p>
          <span class="text-[10px] text-dark/40 font-medium">MXN devueltos</span>
        </div>
      </div>

      <!-- Filters & Search Bar -->
      <div class="p-4 rounded-2xl bg-white border border-dark/10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <!-- Search Input -->
        <div class="w-full md:max-w-md relative">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="Buscar por cliente, correo, orden o evento..."
            class="w-full pl-10 pr-4 py-2 rounded-xl border border-dark/20 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <span class="absolute left-3.5 top-2.5 text-dark/40 text-sm">
            <i class="fa-solid fa-magnifying-glass"></i>
          </span>
        </div>

        <!-- Filter tabs -->
        <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            (click)="selectedFilter.set('all')"
            [class.bg-dark]="selectedFilter() === 'all'"
            [class.text-white]="selectedFilter() === 'all'"
            [class.bg-dark/5]="selectedFilter() !== 'all'"
            [class.text-dark]="selectedFilter() !== 'all'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
          >
            Todas ({{ requests().length }})
          </button>
          <button
            type="button"
            (click)="selectedFilter.set('pending')"
            [class.bg-dark]="selectedFilter() === 'pending'"
            [class.text-white]="selectedFilter() === 'pending'"
            [class.bg-dark/5]="selectedFilter() !== 'pending'"
            [class.text-dark]="selectedFilter() !== 'pending'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
          >
            <span>Pendientes</span>
            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>({{ countPending() }})</span>
          </button>
          <button
            type="button"
            (click)="selectedFilter.set('approved')"
            [class.bg-dark]="selectedFilter() === 'approved'"
            [class.text-white]="selectedFilter() === 'approved'"
            [class.bg-dark/5]="selectedFilter() !== 'approved'"
            [class.text-dark]="selectedFilter() !== 'approved'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
          >
            Aprobadas ({{ countApproved() }})
          </button>
          <button
            type="button"
            (click)="selectedFilter.set('rejected')"
            [class.bg-dark]="selectedFilter() === 'rejected'"
            [class.text-white]="selectedFilter() === 'rejected'"
            [class.bg-dark/5]="selectedFilter() !== 'rejected'"
            [class.text-dark]="selectedFilter() !== 'rejected'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
          >
            Rechazadas ({{ countRejected() }})
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="py-20 flex flex-col items-center gap-3">
        <tf-spinner size="lg" color="primary"></tf-spinner>
        <p class="text-xs sm:text-sm text-dark/60">Cargando solicitudes de reembolso...</p>
      </div>

      <!-- Empty State -->
      <div
        *ngIf="!isLoading() && filteredRequests().length === 0"
        class="py-16 text-center rounded-2xl border border-dashed border-dark/20 bg-white p-8 space-y-3"
      >
        <span class="text-4xl block text-dark/30">
          <i class="fa-solid fa-money-bill-transfer"></i>
        </span>
        <h3 class="text-base font-bold text-dark">No hay solicitudes para mostrar</h3>
        <p class="text-xs text-dark/50 max-w-sm mx-auto">
          No se encontraron solicitudes de reembolso con los filtros de búsqueda actuales.
        </p>
      </div>

      <!-- Table of Refund Requests -->
      <div *ngIf="!isLoading() && filteredRequests().length > 0" class="overflow-hidden rounded-2xl border border-dark/10 bg-white shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-dark/5 border-b border-dark/10 font-bold text-dark uppercase tracking-wider text-[10px]">
                <th class="p-3.5 pl-5">Orden / Solicitud</th>
                <th class="p-3.5">Cliente</th>
                <th class="p-3.5">Evento</th>
                <th class="p-3.5">Monto</th>
                <th class="p-3.5">Motivo</th>
                <th class="p-3.5">Estado</th>
                <th class="p-3.5">Fecha</th>
                <th class="p-3.5 pr-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-dark/5">
              <tr
                *ngFor="let req of filteredRequests()"
                class="hover:bg-dark/[0.02] transition-colors"
              >
                <!-- Order ID -->
                <td class="p-3.5 pl-5 font-mono">
                  <span class="font-bold text-dark">#{{ req.order_id.substring(0, 8).toUpperCase() }}</span>
                  <span class="block text-[10px] text-dark/40">{{ req.id.substring(0, 8) }}</span>
                </td>

                <!-- Customer -->
                <td class="p-3.5">
                  <div class="font-bold text-dark">{{ req.customer_name || 'Cliente' }}</div>
                  <div class="text-[11px] text-dark/50">{{ req.customer_email || 'Sin correo' }}</div>
                </td>

                <!-- Event -->
                <td class="p-3.5">
                  <div class="font-bold text-dark leading-tight">{{ req.event_name || 'Evento' }}</div>
                  <div class="text-[10px] text-dark/50">{{ req.artist_name }} · {{ req.event_date | date:'shortDate' }}</div>
                </td>

                <!-- Amount -->
                <td class="p-3.5 font-mono font-bold text-dark">
                  \${{ req.amount | number:'1.2-2' }} MXN
                </td>

                <!-- Reason -->
                <td class="p-3.5 max-w-xs">
                  <p class="truncate text-dark/70" [title]="req.reason">
                    {{ req.reason }}
                  </p>
                </td>

                <!-- Status Badge -->
                <td class="p-3.5">
                  <span
                    *ngIf="req.status === 'pending'"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200"
                  >
                    <i class="fa-regular fa-clock text-[9px]"></i> Pendiente
                  </span>
                  <span
                    *ngIf="req.status === 'approved'"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200"
                  >
                    <i class="fa-solid fa-check text-[9px]"></i> Aprobada
                  </span>
                  <span
                    *ngIf="req.status === 'rejected'"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200"
                  >
                    <i class="fa-solid fa-xmark text-[9px]"></i> Rechazada
                  </span>
                </td>

                <!-- Date -->
                <td class="p-3.5 text-dark/50 whitespace-nowrap">
                  {{ req.created_at | date:'short' }}
                </td>

                <!-- Actions -->
                <td class="p-3.5 pr-5 text-right whitespace-nowrap">
                  <div *ngIf="req.status === 'pending'" class="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      (click)="openProcessModal(req, true)"
                      class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm transition"
                      title="Aprobar Reembolso"
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      (click)="openProcessModal(req, false)"
                      class="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] transition"
                      title="Rechazar Reembolso"
                    >
                      Rechazar
                    </button>
                  </div>

                  <button
                    *ngIf="req.status !== 'pending'"
                    type="button"
                    (click)="openDetailModal(req)"
                    class="px-2.5 py-1 rounded-lg bg-dark/5 hover:bg-dark/10 text-dark font-bold text-[11px] transition"
                  >
                    Ver Detalles
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Action Modal (Approve / Reject) -->
      <div
        *ngIf="activeModalRequest()"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      >
        <div class="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl border border-dark/10">
          <button
            type="button"
            (click)="closeModal()"
            class="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-dark/5 text-dark/50 font-bold flex items-center justify-center transition"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>

          <!-- Modal Title -->
          <div class="space-y-1">
            <span
              class="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full inline-block"
              [ngClass]="modalIsApproval() ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'"
            >
              {{ modalIsApproval() ? 'Aprobación de Reembolso' : 'Rechazo de Reembolso' }}
            </span>
            <h3 class="text-xl font-black text-dark">
              {{ modalIsApproval() ? '¿Confirmar Aprobación?' : '¿Confirmar Rechazo?' }}
            </h3>
            <p class="text-xs text-dark/60">
              Orden #{{ activeModalRequest()!.order_id.substring(0, 8).toUpperCase() }} · Cliente: <strong>{{ activeModalRequest()!.customer_name }}</strong>
            </p>
          </div>

          <!-- Alert summary -->
          <div
            class="p-3.5 rounded-2xl text-xs space-y-1"
            [ngClass]="modalIsApproval() ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' : 'bg-rose-50 border border-rose-200 text-rose-900'"
          >
            <p class="font-bold flex items-center gap-1.5">
              <i [class]="modalIsApproval() ? 'fa-solid fa-bolt text-emerald-600' : 'fa-solid fa-triangle-exclamation text-rose-600'"></i>
              <span>{{ modalIsApproval() ? 'Al aprobar esta solicitud:' : 'Al rechazar esta solicitud:' }}</span>
            </p>
            <ul class="list-disc list-inside space-y-0.5 text-[11px]">
              <li *ngIf="modalIsApproval()">El estado de la orden pasará a <strong>reembolsada</strong>.</li>
              <li *ngIf="modalIsApproval()">El stock de boletos se reintegrará automáticamente.</li>
              <li *ngIf="modalIsApproval()">Los códigos QR de acceso quedarán invalidados permanentemente.</li>
              <li *ngIf="!modalIsApproval()">La orden se mantendrá confirmada y los boletos válidos.</li>
              <li *ngIf="!modalIsApproval()">El cliente verá la razón del rechazo en su panel.</li>
            </ul>
          </div>

          <!-- Customer Reason -->
          <div class="p-3 rounded-xl bg-dark/5 text-xs text-dark/80 space-y-0.5">
            <span class="font-bold text-[10px] uppercase text-dark/50 block">Motivo del Cliente:</span>
            <p class="italic">"{{ activeModalRequest()!.reason }}"</p>
          </div>

          <!-- Admin Notes -->
          <div class="space-y-1.5 text-xs">
            <label class="font-bold text-dark">
              {{ modalIsApproval() ? 'Nota administrativa interna (opcional):' : 'Motivo del rechazo para el cliente (opcional):' }}
            </label>
            <textarea
              [(ngModel)]="modalAdminNotes"
              rows="2"
              placeholder="Escribe notas adicionales o justificación..."
              class="w-full px-3.5 py-2.5 rounded-xl border border-dark/20 text-dark text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none resize-none"
            ></textarea>
          </div>

          <!-- Error Feedback -->
          <p *ngIf="modalError()" class="text-rose-600 font-bold text-xs">
            {{ modalError() }}
          </p>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3 pt-2 border-t border-dark/10">
            <button
              type="button"
              (click)="closeModal()"
              [disabled]="isProcessing()"
              class="px-4 py-2 rounded-xl text-dark/70 font-bold text-xs hover:bg-dark/5 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              (click)="confirmProcessRefund()"
              [disabled]="isProcessing()"
              class="px-5 py-2 rounded-xl text-white font-bold text-xs shadow-md transition flex items-center gap-2"
              [ngClass]="modalIsApproval() ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'"
            >
              <tf-spinner *ngIf="isProcessing()" size="sm" color="white"></tf-spinner>
              <span>{{ isProcessing() ? 'Procesando...' : (modalIsApproval() ? 'Aprobar y Devolver' : 'Rechazar Solicitud') }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Detail Modal (Read Only) -->
      <div
        *ngIf="detailModalRequest()"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      >
        <div class="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl border border-dark/10">
          <button
            type="button"
            (click)="detailModalRequest.set(null)"
            class="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-dark/5 text-dark/50 font-bold flex items-center justify-center transition"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>

          <!-- Header -->
          <div class="space-y-1">
            <span class="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-0.5 rounded-full inline-block">
              Detalle de Solicitud
            </span>
            <h3 class="text-xl font-black text-dark">
              Orden #{{ detailModalRequest()!.order_id.substring(0, 8).toUpperCase() }}
            </h3>
            <p class="text-xs text-dark/60">
              Solicitud ID: <span class="font-mono">{{ detailModalRequest()!.id }}</span>
            </p>
          </div>

          <!-- Info Grid -->
          <div class="grid grid-cols-2 gap-3 text-xs bg-dark/5 p-4 rounded-2xl">
            <div>
              <span class="text-dark/50 text-[10px] uppercase font-bold block">Cliente</span>
              <p class="font-bold text-dark">{{ detailModalRequest()!.customer_name }}</p>
              <p class="text-dark/60 text-[11px]">{{ detailModalRequest()!.customer_email }}</p>
            </div>
            <div>
              <span class="text-dark/50 text-[10px] uppercase font-bold block">Evento</span>
              <p class="font-bold text-dark">{{ detailModalRequest()!.event_name }}</p>
              <p class="text-dark/60 text-[11px]">{{ detailModalRequest()!.event_date | date:'mediumDate' }}</p>
            </div>
            <div>
              <span class="text-dark/50 text-[10px] uppercase font-bold block">Importe</span>
              <p class="font-bold text-dark font-mono">\${{ detailModalRequest()!.amount | number:'1.2-2' }} MXN</p>
            </div>
            <div>
              <span class="text-dark/50 text-[10px] uppercase font-bold block">Estado Actual</span>
              <span
                class="inline-flex items-center gap-1 font-bold text-[11px]"
                [ngClass]="detailModalRequest()!.status === 'approved' ? 'text-emerald-700' : 'text-rose-700'"
              >
                <i [class]="detailModalRequest()!.status === 'approved' ? 'fa-solid fa-check text-[10px]' : 'fa-solid fa-xmark text-[10px]'"></i>
                <span>{{ detailModalRequest()!.status === 'approved' ? 'Aprobada' : 'Rechazada' }}</span>
              </span>
            </div>
          </div>

          <!-- Reason & Notes -->
          <div class="space-y-3 text-xs">
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span class="font-bold text-slate-500 text-[10px] uppercase block">Motivo enviado por el cliente:</span>
              <p class="text-slate-800 mt-1">{{ detailModalRequest()!.reason }}</p>
              <span class="text-[10px] text-slate-400 block mt-2">Enviado: {{ detailModalRequest()!.created_at | date:'medium' }}</span>
            </div>

            <div *ngIf="detailModalRequest()!.admin_notes" class="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <span class="font-bold text-amber-800 text-[10px] uppercase block">Respuesta / Notas del Administrador:</span>
              <p class="text-amber-900 mt-1">{{ detailModalRequest()!.admin_notes }}</p>
              <span *ngIf="detailModalRequest()!.reviewed_at" class="text-[10px] text-amber-700/70 block mt-2">
                Revisado: {{ detailModalRequest()!.reviewed_at | date:'medium' }}
              </span>
            </div>
          </div>

          <!-- Close -->
          <div class="text-right pt-2 border-t border-dark/10">
            <button
              type="button"
              (click)="detailModalRequest.set(null)"
              class="px-4 py-2 rounded-xl bg-dark text-white font-bold text-xs hover:bg-black transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class RefundListComponent implements OnInit {
  private readonly refundsService = inject(RefundsService);

  readonly isLoading = signal(true);
  readonly requests = signal<RefundRequestWithRelations[]>([]);
  readonly selectedFilter = signal<RefundFilter>('all');
  searchQuery = '';

  // Processing Modal
  readonly activeModalRequest = signal<RefundRequestWithRelations | null>(null);
  readonly modalIsApproval = signal(true);
  modalAdminNotes = '';
  readonly isProcessing = signal(false);
  readonly modalError = signal<string | null>(null);

  // Detail Modal
  readonly detailModalRequest = signal<RefundRequestWithRelations | null>(null);

  // Toast
  readonly feedbackMessage = signal<string | null>(null);
  readonly feedbackType = signal<'success' | 'error'>('success');

  // Stats computed
  readonly countPending = computed(() => this.requests().filter((r) => r.status === 'pending').length);
  readonly countApproved = computed(() => this.requests().filter((r) => r.status === 'approved').length);
  readonly countRejected = computed(() => this.requests().filter((r) => r.status === 'rejected').length);
  readonly totalRefundedAmount = computed(() =>
    this.requests()
      .filter((r) => r.status === 'approved')
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  );

  readonly filteredRequests = computed(() => {
    let list = this.requests();
    const filter = this.selectedFilter();

    if (filter !== 'all') {
      list = list.filter((r) => r.status === filter);
    }

    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.order_id.toLowerCase().includes(q) ||
          r.customer_email?.toLowerCase().includes(q) ||
          r.customer_name?.toLowerCase().includes(q) ||
          r.event_name?.toLowerCase().includes(q) ||
          r.artist_name?.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q)
      );
    }

    return list;
  });

  async ngOnInit(): Promise<void> {
    await this.loadRefundRequests();
  }

  async loadRefundRequests(): Promise<void> {
    this.isLoading.set(true);
    try {
      const data = await this.refundsService.getRefundRequests();
      this.requests.set(data);
    } catch (err: any) {
      console.error('Error loading refunds:', err);
      this.feedbackType.set('error');
      this.feedbackMessage.set(err.message || 'Error al cargar las solicitudes de reembolso.');
    } finally {
      this.isLoading.set(false);
    }
  }

  openProcessModal(req: RefundRequestWithRelations, isApproval: boolean): void {
    this.activeModalRequest.set(req);
    this.modalIsApproval.set(isApproval);
    this.modalAdminNotes = '';
    this.modalError.set(null);
  }

  closeModal(): void {
    this.activeModalRequest.set(null);
    this.modalError.set(null);
  }

  openDetailModal(req: RefundRequestWithRelations): void {
    this.detailModalRequest.set(req);
  }

  async confirmProcessRefund(): Promise<void> {
    const req = this.activeModalRequest();
    if (!req) return;

    this.isProcessing.set(true);
    this.modalError.set(null);

    try {
      const res = await this.refundsService.processRefund(
        req.id,
        this.modalIsApproval(),
        this.modalAdminNotes
      );

      if (res.success) {
        this.closeModal();
        this.feedbackType.set('success');
        this.feedbackMessage.set(
          this.modalIsApproval()
            ? `Reembolso para orden #${req.order_id.substring(0, 8).toUpperCase()} aprobado exitosamente. Stock devuelto.`
            : `Solicitud de reembolso para orden #${req.order_id.substring(0, 8).toUpperCase()} rechazada.`
        );
        await this.loadRefundRequests();
      } else {
        this.modalError.set(res.error || 'Error al procesar la solicitud.');
      }
    } catch (err: any) {
      this.modalError.set(err.message || 'Error inesperado.');
    } finally {
      this.isProcessing.set(false);
    }
  }
}
