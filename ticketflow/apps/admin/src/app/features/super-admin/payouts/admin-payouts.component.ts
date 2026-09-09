import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinancesService } from '../../finances/finances.service';
import type { AdminArtistFinancialItem } from '@ticketflow/models';
import { SpinnerComponent } from '@ticketflow/shared-ui';

type PayoutFilter = 'all' | 'with_balance' | 'settled';

@Component({
  selector: 'app-admin-payouts',
  standalone: true,
  imports: [CommonModule, FormsModule, SpinnerComponent],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span class="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full inline-block mb-2">
            Super-Admin Central
          </span>
          <h1 class="text-2xl sm:text-3xl font-black text-dark tracking-tight">
            Control Global de Liquidaciones & Pagos
          </h1>
          <p class="text-xs sm:text-sm text-dark/60 mt-1">
            Supervisa los balances netos generados por los artistas, audita retenciones de comisión y registra transferencias de liquidación.
          </p>
        </div>

        <button
          type="button"
          (click)="loadOverview()"
          class="px-4 py-2 rounded-xl bg-white border border-dark/10 hover:bg-dark/5 text-dark font-bold text-xs shadow-sm transition flex items-center gap-2 self-start sm:self-auto"
        >
          <i class="fa-solid fa-rotate-right"></i>
          <span>Actualizar Balances</span>
        </button>
      </div>

      <!-- Feedback Toast -->
      <div
        *ngIf="feedbackMessage()"
        class="p-4 rounded-2xl flex items-center justify-between transition-all text-xs sm:text-sm font-semibold"
        [ngClass]="feedbackType() === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'"
      >
        <div class="flex items-center gap-3">
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

      <!-- Summary KPI Row -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <!-- Pasivo Total / Saldo Pendiente Plataforma -->
        <div class="col-span-2 sm:col-span-1 p-5 rounded-3xl bg-gradient-to-br from-amber-500/15 via-amber-50/60 to-white border-2 border-amber-500/30 shadow-sm space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-black uppercase tracking-wider text-amber-800">Pasivo por Liquidar</span>
            <i class="fa-solid fa-clock text-amber-700"></i>
          </div>
          <p class="text-2xl sm:text-3xl font-black text-amber-700 font-mono">
            \${{ totalPlatformBalanceDue() | number:'1.2-2' }}
          </p>
          <span class="text-[10px] text-amber-800/70 font-semibold block">Total pendiente en plataforma</span>
        </div>

        <!-- Total Liquidado Histórico -->
        <div class="p-5 rounded-3xl bg-white border border-dark/10 shadow-sm space-y-1">
          <span class="text-[10px] font-black uppercase tracking-wider text-dark/50 block">Liquidado Histórico</span>
          <p class="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
            \${{ totalPlatformPaid() | number:'1.2-2' }}
          </p>
          <span class="text-[10px] text-dark/40 font-semibold block">Transferido a artistas</span>
        </div>

        <!-- Ventas Brutas Totales -->
        <div class="p-5 rounded-3xl bg-white border border-dark/10 shadow-sm space-y-1">
          <span class="text-[10px] font-black uppercase tracking-wider text-dark/50 block">Volumen Bruto Procesado</span>
          <p class="text-xl sm:text-2xl font-black text-dark font-mono">
            \${{ totalPlatformNet() | number:'1.2-2' }}
          </p>
          <span class="text-[10px] text-dark/40 font-semibold block">Venta acumulada</span>
        </div>

        <!-- Ingreso Plataforma (Comisiones) -->
        <div class="p-5 rounded-3xl bg-white border border-dark/10 shadow-sm space-y-1">
          <span class="text-[10px] font-black uppercase tracking-wider text-primary block">Comisiones TicketFlow</span>
          <p class="text-xl sm:text-2xl font-black text-primary font-mono">
            \${{ artists().length }}
          </p>
          <span class="text-[10px] text-dark/40 font-semibold block">Artistas Registrados</span>
        </div>
      </div>

      <!-- Search & Filters -->
      <div class="p-4 rounded-2xl bg-white border border-dark/10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <!-- Search Input -->
        <div class="w-full md:max-w-md relative">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="Buscar por nombre de artista, correo, RFC o CLABE..."
            class="w-full pl-10 pr-4 py-2 rounded-xl border border-dark/20 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <span class="absolute left-3.5 top-2.5 text-dark/40 text-sm"><i class="fa-solid fa-magnifying-glass"></i></span>
        </div>

        <!-- Filter tabs -->
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
            Todos ({{ artists().length }})
          </button>
          <button
            type="button"
            (click)="selectedFilter.set('with_balance')"
            [class.bg-amber-600]="selectedFilter() === 'with_balance'"
            [class.text-white]="selectedFilter() === 'with_balance'"
            [class.bg-amber-50]="selectedFilter() !== 'with_balance'"
            [class.text-amber-700]="selectedFilter() !== 'with_balance'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition border border-amber-200"
          >
            Con Saldo Pendiente ({{ artistsWithPendingBalanceCount() }})
          </button>
          <button
            type="button"
            (click)="selectedFilter.set('settled')"
            [class.bg-emerald-600]="selectedFilter() === 'settled'"
            [class.text-white]="selectedFilter() === 'settled'"
            [class.bg-emerald-50]="selectedFilter() !== 'settled'"
            [class.text-emerald-700]="selectedFilter() !== 'settled'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition border border-emerald-200"
          >
            Liquidados Al Día
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="py-20 flex flex-col items-center gap-3">
        <tf-spinner size="lg" color="primary"></tf-spinner>
        <p class="text-xs sm:text-sm text-dark/60">Cargando balances de artistas...</p>
      </div>

      <!-- Empty State -->
      <div
        *ngIf="!isLoading() && filteredArtists().length === 0"
        class="py-16 text-center rounded-2xl border border-dashed border-dark/20 bg-white p-8 space-y-3"
      >
        <i class="fa-solid fa-building-columns text-4xl text-dark/30 block mb-2"></i>
        <h3 class="text-base font-bold text-dark">No se encontraron artistas</h3>
        <p class="text-xs text-dark/50 max-w-sm mx-auto">
          No hay registros que coincidan con la búsqueda o filtro aplicado.
        </p>
      </div>

      <!-- Table of Artists & Balances -->
      <div *ngIf="!isLoading() && filteredArtists().length > 0" class="overflow-hidden rounded-2xl border border-dark/10 bg-white shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-dark/5 border-b border-dark/10 font-bold text-dark uppercase tracking-wider text-[10px]">
                <th class="p-3.5 pl-5">Artista</th>
                <th class="p-3.5">Eventos</th>
                <th class="p-3.5">Venta Bruta</th>
                <th class="p-3.5">Comisión</th>
                <th class="p-3.5 font-bold text-primary">Neto Ganado</th>
                <th class="p-3.5">Total Pagado</th>
                <th class="p-3.5 font-black text-amber-700">Saldo Pendiente</th>
                <th class="p-3.5">Datos Bancarios</th>
                <th class="p-3.5 pr-5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-dark/5">
              <tr *ngFor="let a of filteredArtists()" class="hover:bg-dark/[0.02] transition-colors">
                <!-- Artist Info -->
                <td class="p-3.5 pl-5">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-xl bg-dark text-white font-bold flex items-center justify-center shrink-0 overflow-hidden text-xs">
                      <img *ngIf="a.photo_url" [src]="a.photo_url" [alt]="a.artist_name" class="w-full h-full object-cover" />
                      <span *ngIf="!a.photo_url">{{ a.artist_name.charAt(0) }}</span>
                    </div>
                    <div>
                      <div class="font-bold text-dark text-sm">{{ a.artist_name }}</div>
                      <div class="text-[11px] text-dark/50">{{ a.artist_email || 'Sin email registrado' }}</div>
                    </div>
                  </div>
                </td>

                <!-- Events count -->
                <td class="p-3.5 font-bold text-dark/80 font-mono">
                  {{ a.total_events }}
                </td>

                <!-- Gross -->
                <td class="p-3.5 font-mono text-dark/70">
                  \${{ a.total_gross | number:'1.2-2' }}
                </td>

                <!-- Commission -->
                <td class="p-3.5 font-mono text-slate-500">
                  -\${{ a.total_commission | number:'1.2-2' }}
                </td>

                <!-- Net -->
                <td class="p-3.5 font-mono font-bold text-primary">
                  \${{ a.net_earnings | number:'1.2-2' }}
                </td>

                <!-- Total Paid -->
                <td class="p-3.5 font-mono text-emerald-700">
                  \${{ a.total_paid | number:'1.2-2' }}
                </td>

                <!-- Balance Due -->
                <td class="p-3.5 font-mono font-black text-sm" [class.text-amber-700]="a.balance_due > 0" [class.text-dark/40]="a.balance_due === 0">
                  \${{ a.balance_due | number:'1.2-2' }}
                </td>

                <!-- Banking Data -->
                <td class="p-3.5">
                  <div *ngIf="a.bank_account_number" class="space-y-0.5">
                    <div class="font-bold text-dark">{{ a.bank_name || 'Banco' }}</div>
                    <div class="font-mono text-[10px] text-dark/60">CLABE: {{ a.bank_account_number }}</div>
                    <div *ngIf="a.tax_id" class="text-[10px] text-dark/40 font-mono">RFC: {{ a.tax_id }}</div>
                  </div>
                  <span *ngIf="!a.bank_account_number" class="text-rose-600 font-semibold text-[11px] flex items-center gap-1">
                    <i class="fa-solid fa-triangle-exclamation"></i> Sin cuenta CLABE
                  </span>
                </td>

                <!-- Action Button -->
                <td class="p-3.5 pr-5 text-right whitespace-nowrap">
                  <button
                    type="button"
                    (click)="openDisperseModal(a)"
                    class="px-3 py-1.5 rounded-xl text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 ml-auto"
                    [class.bg-amber-600]="a.balance_due > 0"
                    [class.hover:bg-amber-500]="a.balance_due > 0"
                    [class.bg-dark]="a.balance_due === 0"
                    [class.hover:bg-black]="a.balance_due === 0"
                  >
                    <i class="fa-solid fa-money-bill-transfer"></i>
                    <span>{{ a.balance_due > 0 ? 'Liquidar Saldo' : 'Registrar Pago' }}</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Disperse / Payout Modal -->
      <div
        *ngIf="selectedArtistForPayout()"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      >
        <div class="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl border border-dark/10">
          <button
            type="button"
            (click)="closeModal()"
            class="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-dark/5 text-dark/50 font-bold flex items-center justify-center transition"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>

          <!-- Header -->
          <div class="space-y-1">
            <span class="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full inline-block">
              Dispersión Financiera
            </span>
            <h3 class="text-xl font-black text-dark">
              Registrar Liquidación a Artista
            </h3>
            <p class="text-xs text-dark/60">
              Artista: <strong>{{ selectedArtistForPayout()!.artist_name }}</strong> · Saldo pendiente: <strong class="text-amber-700 font-mono">\${{ selectedArtistForPayout()!.balance_due | number:'1.2-2' }} MXN</strong>
            </p>
          </div>

          <!-- Bank Account Info Alert -->
          <div class="p-3.5 rounded-2xl bg-cyan-50/50 border border-cyan-200 text-xs text-cyan-950 space-y-1">
            <div class="font-bold flex items-center gap-1.5">
              <i class="fa-solid fa-building-columns"></i> Datos de Destino del Artista:
            </div>
            <p *ngIf="selectedArtistForPayout()!.bank_account_number" class="text-[11px] font-mono leading-relaxed">
              <strong>{{ selectedArtistForPayout()!.bank_name }}</strong> · CLABE: <strong>{{ selectedArtistForPayout()!.bank_account_number }}</strong>
              <span *ngIf="selectedArtistForPayout()!.tax_id"> · RFC: {{ selectedArtistForPayout()!.tax_id }}</span>
            </p>
            <p *ngIf="!selectedArtistForPayout()!.bank_account_number" class="text-[11px] text-rose-600 font-bold flex items-center gap-1">
              <i class="fa-solid fa-triangle-exclamation"></i> El artista aún no ha capturado su CLABE interbancaria en su perfil financiero.
            </p>
          </div>

          <!-- Payout Form -->
          <div class="space-y-3.5 text-xs">
            <!-- Amount -->
            <div class="space-y-1">
              <label class="font-bold text-dark">Importe a Liquidar (MXN):*</label>
              <input
                type="number"
                [(ngModel)]="payoutAmount"
                min="1"
                step="0.01"
                class="w-full px-3.5 py-2.5 rounded-xl border border-dark/20 text-dark font-mono font-bold text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <!-- Method -->
              <div class="space-y-1">
                <label class="font-bold text-dark">Método de Dispersión:*</label>
                <select
                  [(ngModel)]="payoutMethod"
                  class="w-full px-3 py-2.5 rounded-xl border border-dark/20 text-dark font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="bank_transfer">Transferencia SPEI</option>
                  <option value="paypal">PayPal Payouts</option>
                  <option value="manual">Pago Manual / Efectivo</option>
                </select>
              </div>

              <!-- Reference SPEI -->
              <div class="space-y-1">
                <label class="font-bold text-dark">Folio / Clave de Rastreo SPEI:*</label>
                <input
                  type="text"
                  [(ngModel)]="payoutReference"
                  placeholder="Ej. SPEI2026090812345"
                  class="w-full px-3 py-2.5 rounded-xl border border-dark/20 font-mono text-dark focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <!-- Receipt URL (optional) -->
            <div class="space-y-1">
              <label class="font-bold text-dark">URL Comprobante o Factura (Opcional):</label>
              <input
                type="url"
                [(ngModel)]="payoutReceiptUrl"
                placeholder="https://storage.../comprobante.pdf"
                class="w-full px-3.5 py-2 rounded-xl border border-dark/20 text-dark focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <!-- Notes -->
            <div class="space-y-1">
              <label class="font-bold text-dark">Notas / Concepto:</label>
              <input
                type="text"
                [(ngModel)]="payoutNotes"
                placeholder="Ej. Liquidación taquilla eventos Septiembre 2026"
                class="w-full px-3.5 py-2 rounded-xl border border-dark/20 text-dark focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <!-- Error in modal -->
            <p *ngIf="modalError()" class="text-rose-600 font-bold text-xs">
              {{ modalError() }}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3 pt-2 border-t border-dark/10">
            <button
              type="button"
              (click)="closeModal()"
              [disabled]="isSubmittingPayout()"
              class="px-4 py-2 rounded-xl text-dark/70 font-bold text-xs hover:bg-dark/5 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              (click)="submitPayout()"
              [disabled]="isSubmittingPayout()"
              class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition flex items-center gap-2"
            >
              <tf-spinner *ngIf="isSubmittingPayout()" size="sm" color="white"></tf-spinner>
              <span>{{ isSubmittingPayout() ? 'Registrando...' : 'Confirmar y Aplicar Pago' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AdminPayoutsComponent implements OnInit {
  private readonly financesService = inject(FinancesService);

  readonly isLoading = signal(true);
  readonly artists = signal<AdminArtistFinancialItem[]>([]);
  readonly selectedFilter = signal<PayoutFilter>('all');
  searchQuery = '';

  // Disperse Modal State
  readonly selectedArtistForPayout = signal<AdminArtistFinancialItem | null>(null);
  payoutAmount = 0;
  payoutMethod = 'bank_transfer';
  payoutReference = '';
  payoutReceiptUrl = '';
  payoutNotes = '';
  readonly isSubmittingPayout = signal(false);
  readonly modalError = signal<string | null>(null);

  // Feedback Toast
  readonly feedbackMessage = signal<string | null>(null);
  readonly feedbackType = signal<'success' | 'error'>('success');

  // Stats
  readonly totalPlatformBalanceDue = computed(() =>
    this.artists().reduce((sum, a) => sum + (Number(a.balance_due) || 0), 0)
  );

  readonly totalPlatformPaid = computed(() =>
    this.artists().reduce((sum, a) => sum + (Number(a.total_paid) || 0), 0)
  );

  readonly totalPlatformNet = computed(() =>
    this.artists().reduce((sum, a) => sum + (Number(a.net_earnings) || 0), 0)
  );

  readonly artistsWithPendingBalanceCount = computed(() =>
    this.artists().filter((a) => Number(a.balance_due) > 0).length
  );

  readonly filteredArtists = computed(() => {
    let list = this.artists();
    const filter = this.selectedFilter();

    if (filter === 'with_balance') {
      list = list.filter((a) => Number(a.balance_due) > 0);
    } else if (filter === 'settled') {
      list = list.filter((a) => Number(a.balance_due) === 0);
    }

    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          a.artist_name.toLowerCase().includes(q) ||
          a.artist_email?.toLowerCase().includes(q) ||
          a.bank_name?.toLowerCase().includes(q) ||
          a.bank_account_number?.toLowerCase().includes(q) ||
          a.tax_id?.toLowerCase().includes(q)
      );
    }

    return list;
  });

  async ngOnInit(): Promise<void> {
    await this.loadOverview();
  }

  async loadOverview(): Promise<void> {
    this.isLoading.set(true);
    try {
      const data = await this.financesService.getAllArtistsFinancialOverview();
      this.artists.set(data);
    } catch (err: any) {
      console.error('Error loading admin payouts overview:', err);
      this.feedbackType.set('error');
      this.feedbackMessage.set(err.message || 'Error al cargar los balances de liquidación.');
    } finally {
      this.isLoading.set(false);
    }
  }

  openDisperseModal(artist: AdminArtistFinancialItem): void {
    this.selectedArtistForPayout.set(artist);
    this.payoutAmount = Number(artist.balance_due) || 0;
    this.payoutMethod = 'bank_transfer';
    this.payoutReference = '';
    this.payoutReceiptUrl = '';
    this.payoutNotes = `Liquidación de taquilla para ${artist.artist_name}`;
    this.modalError.set(null);
  }

  closeModal(): void {
    this.selectedArtistForPayout.set(null);
    this.modalError.set(null);
  }

  async submitPayout(): Promise<void> {
    const a = this.selectedArtistForPayout();
    if (!a) return;

    if (this.payoutAmount <= 0) {
      this.modalError.set('Ingresa un importe mayor a cero.');
      return;
    }

    this.isSubmittingPayout.set(true);
    this.modalError.set(null);

    try {
      const res = await this.financesService.createPayout(
        a.artist_id,
        null,
        this.payoutAmount,
        this.payoutMethod,
        this.payoutReference,
        this.payoutNotes,
        this.payoutReceiptUrl
      );

      if (res.success) {
        this.closeModal();
        this.feedbackType.set('success');
        this.feedbackMessage.set(res.message || 'Pago registrado y aplicado al balance exitosamente.');
        await this.loadOverview();
      } else {
        this.modalError.set(res.error || 'Error al procesar la liquidación.');
      }
    } catch (err: any) {
      this.modalError.set(err.message || 'Error inesperado al registrar el pago.');
    } finally {
      this.isSubmittingPayout.set(false);
    }
  }
}
