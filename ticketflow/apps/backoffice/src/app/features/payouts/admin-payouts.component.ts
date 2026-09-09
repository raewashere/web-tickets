import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackofficeService } from '../../services/backoffice.service';
import type { AdminArtistFinancialItem } from '@ticketflow/models';
import { SpinnerComponent } from '@ticketflow/shared-ui';

@Component({
  selector: 'app-admin-payouts',
  standalone: true,
  imports: [CommonModule, FormsModule, SpinnerComponent],
  template: `
    <div class="space-y-8">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span class="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full inline-block mb-2">
            Dispersión Central de Fondos
          </span>
          <h1 class="text-2xl sm:text-3xl font-black text-dark tracking-tight">
            Control de Liquidaciones y Pagos
          </h1>
          <p class="text-xs sm:text-sm text-dark/60 mt-1">
            Revisa la responsabilidad financiera de la plataforma y registra las transferencias realizadas a los artistas.
          </p>
        </div>

        <button
          type="button"
          (click)="loadOverview()"
          class="px-4 py-2.5 rounded-xl bg-white border border-dark/10 hover:bg-dark/5 text-dark font-bold text-xs shadow-sm transition flex items-center gap-2 self-start sm:self-auto"
        >
          <i class="fa-solid fa-arrows-rotate"></i>
          <span>Actualizar Balances</span>
        </button>
      </div>

      <!-- Loading state -->
      <div *ngIf="isLoading()" class="py-24 flex flex-col items-center justify-center gap-3">
        <tf-spinner size="lg"></tf-spinner>
        <p class="text-xs text-dark/50">Calculando saldos y pasivos globales...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMessage()" class="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
        {{ errorMessage() }}
      </div>

      <!-- Main Financial Content -->
      <div *ngIf="!isLoading()" class="space-y-8">
        <!-- Platform Liability KPI Banner -->
        <div class="p-6 sm:p-8 rounded-3xl bg-dark text-white border border-dark/10 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div class="space-y-2 relative z-10">
            <span class="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full inline-block border border-emerald-500/30">
              Pasivo Financiero Total
            </span>
            <p class="text-xs text-white/60">Suma de saldos netos pendientes de dispersar a todos los artistas:</p>
            <p class="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
              \${{ totalPlatformLiability() | number:'1.2-2' }} <span class="text-sm font-normal text-white/60">MXN</span>
            </p>
          </div>

          <div class="flex items-center gap-4 relative z-10">
            <div class="p-4 rounded-2xl bg-white/5 border border-white/10 text-right">
              <span class="text-[10px] font-bold uppercase text-white/50 block">Artistas con saldo</span>
              <span class="text-2xl font-black text-emerald-400 font-mono">{{ artistsWithBalanceCount() }}</span>
            </div>
          </div>
        </div>

        <!-- Filters & Search -->
        <div class="p-4 rounded-2xl bg-white border border-dark/10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div class="w-full md:max-w-md relative">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              placeholder="Buscar artista, email o CLABE..."
              class="w-full pl-10 pr-4 py-2 rounded-xl border border-dark/20 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
            <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-dark/40 text-xs"></i>
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
              Todos ({{ artists().length }})
            </button>
            <button
              type="button"
              (click)="selectedFilter.set('with_balance')"
              [class.bg-emerald-600]="selectedFilter() === 'with_balance'"
              [class.text-white]="selectedFilter() === 'with_balance'"
              [class.bg-emerald-50]="selectedFilter() !== 'with_balance'"
              [class.text-emerald-800]="selectedFilter() !== 'with_balance'"
              class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
            >
              Pendientes por Pagar ({{ artistsWithBalanceCount() }})
            </button>
            <button
              type="button"
              (click)="selectedFilter.set('settled')"
              [class.bg-dark/20]="selectedFilter() === 'settled'"
              [class.text-dark]="selectedFilter() === 'settled'"
              [class.bg-dark/5]="selectedFilter() !== 'settled'"
              [class.text-dark/60]="selectedFilter() !== 'settled'"
              class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
            >
              Al Corriente
            </button>
          </div>
        </div>

        <!-- Artists Financial Overview Table -->
        <div *ngIf="filteredArtists().length > 0" class="bg-white rounded-2xl border border-dark/10 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs sm:text-sm">
              <thead class="bg-dark/5 border-b border-dark/10 text-dark/60 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th class="py-3.5 px-4 sm:px-6">Artista</th>
                  <th class="py-3.5 px-4 text-right">Ventas Brutas</th>
                  <th class="py-3.5 px-4 text-right">Comisión TF</th>
                  <th class="py-3.5 px-4 text-right">Ganancia Neta</th>
                  <th class="py-3.5 px-4 text-right">Total Pagado</th>
                  <th class="py-3.5 px-4 text-right">Saldo por Pagar</th>
                  <th class="py-3.5 px-4">Cuenta Bancaria</th>
                  <th class="py-3.5 px-4 sm:px-6 text-right">Acción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-dark/10">
                <tr *ngFor="let artist of filteredArtists()" class="hover:bg-dark/[0.02] transition">
                  <td class="py-4 px-4 sm:px-6 font-bold text-dark">
                    <div class="flex items-center gap-3">
                      <img
                        *ngIf="artist.photo_url"
                        [src]="artist.photo_url"
                        [alt]="artist.artist_name"
                        class="w-9 h-9 rounded-full object-cover border border-dark/10 shadow-xs flex-shrink-0"
                      />
                      <div *ngIf="!artist.photo_url" class="w-9 h-9 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center text-xs flex-shrink-0">
                        <i class="fa-solid fa-microphone-lines"></i>
                      </div>
                      <div>
                        <span class="block font-extrabold text-dark">{{ artist.artist_name }}</span>
                        <span class="text-[11px] text-dark/40 font-mono">{{ artist.artist_email || 'Sin correo' }}</span>
                      </div>
                    </div>
                  </td>
                  <td class="py-4 px-4 text-right font-mono text-dark/70">
                    \${{ artist.total_gross | number:'1.2-2' }}
                  </td>
                  <td class="py-4 px-4 text-right font-mono text-emerald-700 font-semibold">
                    \${{ artist.total_commission | number:'1.2-2' }}
                  </td>
                  <td class="py-4 px-4 text-right font-mono font-bold text-dark">
                    \${{ artist.net_earnings | number:'1.2-2' }}
                  </td>
                  <td class="py-4 px-4 text-right font-mono text-dark/70">
                    \${{ artist.total_paid | number:'1.2-2' }}
                  </td>
                  <td class="py-4 px-4 text-right font-mono font-black">
                    <span
                      [class.text-amber-600]="artist.balance_due > 0"
                      [class.text-dark/40]="artist.balance_due === 0"
                    >
                      \${{ artist.balance_due | number:'1.2-2' }} MXN
                    </span>
                  </td>
                  <td class="py-4 px-4">
                    <div *ngIf="artist.bank_account_number" class="space-y-0.5 font-mono text-[11px]">
                      <p class="font-bold text-dark">{{ artist.bank_name || 'Banco' }} — {{ artist.bank_account_number }}</p>
                      <p class="text-dark/50">RFC: {{ artist.tax_id || 'Sin RFC' }}</p>
                    </div>
                    <span *ngIf="!artist.bank_account_number" class="text-dark/40 text-xs italic">
                      Sin datos bancarios
                    </span>
                  </td>
                  <td class="py-4 px-4 sm:px-6 text-right">
                    <button
                      type="button"
                      (click)="openPayoutModal(artist)"
                      [disabled]="artist.balance_due <= 0"
                      class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-30 disabled:hover:bg-emerald-600 flex items-center gap-1.5 ml-auto"
                    >
                      <i class="fa-solid fa-credit-card"></i>
                      <span>Liquidar Pago</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="filteredArtists().length === 0" class="p-12 text-center bg-white rounded-2xl border border-dashed border-dark/20 space-y-2">
          <span class="text-3xl block text-dark/30">
            <i class="fa-solid fa-credit-card"></i>
          </span>
          <h3 class="font-bold text-dark text-base">No hay registros de liquidación</h3>
          <p class="text-xs text-dark/50">Revisa los términos del filtro o del buscador.</p>
        </div>
      </div>

      <!-- Modal para Registrar Liquidaciones -->
      <div *ngIf="selectedArtistForPayout()" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95">
          <div class="flex items-center justify-between border-b border-dark/10 pb-4">
            <div>
              <span class="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                Registrar Dispersión
              </span>
              <h2 class="text-xl font-black text-dark tracking-tight mt-1">
                Liquidar a {{ selectedArtistForPayout()!.artist_name }}
              </h2>
            </div>
            <button
              type="button"
              (click)="closePayoutModal()"
              class="p-2 text-dark/40 hover:text-dark rounded-xl hover:bg-dark/5 transition"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- Bank info banner -->
          <div class="p-4 rounded-2xl bg-dark/5 border border-dark/10 space-y-1 text-xs font-mono">
            <p class="font-bold text-dark">
              Banco: {{ selectedArtistForPayout()!.bank_name || 'No especificado' }}
            </p>
            <p class="text-dark/80">
              CLABE: {{ selectedArtistForPayout()!.bank_account_number || 'No especificada' }}
            </p>
            <p class="text-dark/60">
              RFC: {{ selectedArtistForPayout()!.tax_id || 'No especificado' }}
            </p>
          </div>

          <!-- Form payout -->
          <form (ngSubmit)="submitPayout()" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-dark/70 mb-1">Monto a Liquidar (MXN)</label>
              <input
                type="number"
                step="0.01"
                [(ngModel)]="payoutForm.amount"
                name="amount"
                required
                [max]="selectedArtistForPayout()!.balance_due"
                class="w-full px-4 py-2.5 rounded-xl border border-dark/20 font-mono text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <p class="text-[11px] text-dark/50 mt-1">
                Saldo pendiente disponible: <strong class="text-dark">\${{ selectedArtistForPayout()!.balance_due | number:'1.2-2' }} MXN</strong>
              </p>
            </div>

            <div>
              <label class="block text-xs font-bold text-dark/70 mb-1">Método de Dispersión</label>
              <select
                [(ngModel)]="payoutForm.method"
                name="method"
                class="w-full px-4 py-2.5 rounded-xl border border-dark/20 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="bank_transfer">Transferencia Interbancaria (SPEI)</option>
                <option value="paypal">PayPal Payouts</option>
                <option value="manual">Efectivo / Cheque / Manual</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-dark/70 mb-1">Código de Referencia / Folio SPEI</label>
              <input
                type="text"
                [(ngModel)]="payoutForm.reference"
                name="reference"
                placeholder="Ej. SPEI-98420491823"
                class="w-full px-4 py-2.5 rounded-xl border border-dark/20 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-dark/70 mb-1">URL de Comprobante / Recibo (opcional)</label>
              <input
                type="url"
                [(ngModel)]="payoutForm.receipt_url"
                name="receipt_url"
                placeholder="https://..."
                class="w-full px-4 py-2.5 rounded-xl border border-dark/20 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-dark/70 mb-1">Notas / Observaciones</label>
              <textarea
                [(ngModel)]="payoutForm.notes"
                name="notes"
                rows="2"
                placeholder="Comentarios adicionales sobre el pago..."
                class="w-full px-4 py-2.5 rounded-xl border border-dark/20 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              ></textarea>
            </div>

            <div class="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                (click)="closePayoutModal()"
                class="px-4 py-2.5 rounded-xl text-dark/60 hover:bg-dark/5 font-bold text-xs transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="isSubmittingPayout() || payoutForm.amount <= 0"
                class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                <span *ngIf="isSubmittingPayout()">Procesando...</span>
                <span *ngIf="!isSubmittingPayout()">Confirmar y Registrar Pago</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class AdminPayoutsComponent implements OnInit {
  private readonly backofficeService = inject(BackofficeService);

  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly artists = signal<AdminArtistFinancialItem[]>([]);

  searchQuery = '';
  readonly selectedFilter = signal<'all' | 'with_balance' | 'settled'>('all');

  selectedArtistForPayout = signal<AdminArtistFinancialItem | null>(null);
  isSubmittingPayout = signal(false);

  payoutForm = {
    amount: 0,
    method: 'bank_transfer',
    reference: '',
    notes: '',
    receipt_url: '',
  };

  readonly totalPlatformLiability = computed(() =>
    this.artists().reduce((sum, a) => sum + (a.balance_due || 0), 0)
  );

  readonly artistsWithBalanceCount = computed(
    () => this.artists().filter((a) => a.balance_due > 0).length
  );

  readonly filteredArtists = computed(() => {
    let list = this.artists();
    const filter = this.selectedFilter();

    if (filter === 'with_balance') {
      list = list.filter((a) => a.balance_due > 0);
    } else if (filter === 'settled') {
      list = list.filter((a) => a.balance_due === 0);
    }

    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          a.artist_name.toLowerCase().includes(q) ||
          (a.artist_email && a.artist_email.toLowerCase().includes(q)) ||
          (a.bank_account_number && a.bank_account_number.toLowerCase().includes(q))
      );
    }

    return list;
  });

  async ngOnInit(): Promise<void> {
    await this.loadOverview();
  }

  async loadOverview(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const data = await this.backofficeService.getAllArtistsFinancialOverview();
      this.artists.set(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar balances de liquidación.';
      this.errorMessage.set(msg);
    } finally {
      this.isLoading.set(false);
    }
  }

  openPayoutModal(artist: AdminArtistFinancialItem): void {
    this.selectedArtistForPayout.set(artist);
    this.payoutForm = {
      amount: artist.balance_due,
      method: 'bank_transfer',
      reference: '',
      notes: '',
      receipt_url: '',
    };
  }

  closePayoutModal(): void {
    this.selectedArtistForPayout.set(null);
  }

  async submitPayout(): Promise<void> {
    const artist = this.selectedArtistForPayout();
    if (!artist) return;

    this.isSubmittingPayout.set(true);

    try {
      await this.backofficeService.createPayoutRecord({
        artist_id: artist.artist_id,
        amount: this.payoutForm.amount,
        method: this.payoutForm.method,
        reference: this.payoutForm.reference,
        notes: this.payoutForm.notes,
        receipt_url: this.payoutForm.receipt_url,
      });

      this.closePayoutModal();
      await this.loadOverview();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar liquidación.';
      alert(msg);
    } finally {
      this.isSubmittingPayout.set(false);
    }
  }
}
