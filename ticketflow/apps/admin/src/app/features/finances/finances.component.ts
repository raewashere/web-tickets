import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FinancesService } from './finances.service';
import type { ArtistFinancialSummary, ArtistPayoutSetting } from '@ticketflow/models';
import { SpinnerComponent } from '@ticketflow/shared-ui';

type FinanceTab = 'events' | 'payouts' | 'settings';

@Component({
  selector: 'app-finances',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SpinnerComponent],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span class="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full inline-block mb-2">
            Módulo Financiero
          </span>
          <h1 class="text-2xl sm:text-3xl font-black text-dark tracking-tight">
            Finanzas & Control de Liquidaciones
          </h1>
          <p class="text-xs sm:text-sm text-dark/60 mt-1">
            Consulta el balance neto de tus espectáculos, historial de transferencias recibidas y configura tus datos bancarios para dispersión.
          </p>
        </div>

        <button
          type="button"
          (click)="loadFinancialSummary()"
          class="px-4 py-2 rounded-xl bg-white border border-dark/10 hover:bg-dark/5 text-dark font-bold text-xs shadow-sm transition flex items-center gap-2 self-start sm:self-auto"
        >
          <span>🔄</span>
          <span>Actualizar Balances</span>
        </button>
      </div>

      <!-- Feedback Toast Banner -->
      <div
        *ngIf="feedbackMessage()"
        class="p-4 rounded-2xl flex items-center justify-between transition-all text-xs sm:text-sm font-semibold"
        [ngClass]="feedbackType() === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'"
      >
        <div class="flex items-center gap-3">
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
        <p class="text-xs sm:text-sm text-dark/60 font-medium">Calculando balances y liquidaciones...</p>
      </div>

      <!-- Financial Dashboard View -->
      <div *ngIf="!isLoading() && summary()" class="space-y-6">
        <!-- KPI Metric Cards Grid -->
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <!-- Saldo Disponible por Cobrar -->
          <div class="col-span-2 sm:col-span-1 p-5 rounded-3xl bg-gradient-to-br from-emerald-500/15 via-emerald-50/60 to-white border-2 border-emerald-500/30 shadow-sm space-y-1">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black uppercase tracking-wider text-emerald-800">Saldo Disponible</span>
              <span class="text-sm">💵</span>
            </div>
            <p class="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">
              \${{ summary()!.balance_due | number:'1.2-2' }}
            </p>
            <span class="text-[10px] text-emerald-800/70 font-semibold block">Pendiente por liquidar</span>
          </div>

          <!-- Total Neto Acumulado -->
          <div class="p-4 rounded-2xl bg-white border border-dark/10 shadow-sm space-y-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-dark/50 block">Neto Ganado</span>
            <p class="text-xl sm:text-2xl font-black text-dark font-mono">
              \${{ summary()!.net_earnings | number:'1.2-2' }}
            </p>
            <span class="text-[10px] text-dark/40 font-medium">Tras comisiones</span>
          </div>

          <!-- Total Liquidado / Pagado -->
          <div class="p-4 rounded-2xl bg-white border border-dark/10 shadow-sm space-y-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-dark/50 block">Total Pagado</span>
            <p class="text-xl sm:text-2xl font-black text-primary font-mono">
              \${{ summary()!.total_paid | number:'1.2-2' }}
            </p>
            <span class="text-[10px] text-dark/40 font-medium">Dispersado por SPEI</span>
          </div>

          <!-- Ventas Brutas Totales -->
          <div class="p-4 rounded-2xl bg-white border border-dark/10 shadow-sm space-y-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-dark/50 block">Venta Bruta</span>
            <p class="text-xl sm:text-2xl font-black text-dark/80 font-mono">
              \${{ summary()!.total_gross | number:'1.2-2' }}
            </p>
            <span class="text-[10px] text-dark/40 font-medium">Boletos confirmados</span>
          </div>

          <!-- Comisiones Plataforma -->
          <div class="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-white border border-dark/10 shadow-sm space-y-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-dark/50 block">Comisión TicketFlow</span>
            <p class="text-xl sm:text-2xl font-black text-slate-500 font-mono">
              \${{ summary()!.total_commission | number:'1.2-2' }}
            </p>
            <span class="text-[10px] text-dark/40 font-medium">Servicio retenido</span>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex items-center gap-2 border-b border-dark/10 pb-2">
          <button
            type="button"
            (click)="activeTab.set('events')"
            [class.bg-dark]="activeTab() === 'events'"
            [class.text-white]="activeTab() === 'events'"
            [class.bg-dark/5]="activeTab() !== 'events'"
            [class.text-dark]="activeTab() !== 'events'"
            class="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2"
          >
            <span>🎪 Desglose por Evento</span>
            <span class="px-2 py-0.5 rounded-full text-[10px]" [class.bg-white/20]="activeTab() === 'events'" [class.bg-dark/10]="activeTab() !== 'events'">
              {{ summary()!.events.length }}
            </span>
          </button>

          <button
            type="button"
            (click)="activeTab.set('payouts')"
            [class.bg-dark]="activeTab() === 'payouts'"
            [class.text-white]="activeTab() === 'payouts'"
            [class.bg-dark/5]="activeTab() !== 'payouts'"
            [class.text-dark]="activeTab() !== 'payouts'"
            class="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2"
          >
            <span>💳 Historial de Pagos</span>
            <span class="px-2 py-0.5 rounded-full text-[10px]" [class.bg-white/20]="activeTab() === 'payouts'" [class.bg-dark/10]="activeTab() !== 'payouts'">
              {{ summary()!.payouts.length }}
            </span>
          </button>

          <button
            type="button"
            (click)="activeTab.set('settings')"
            [class.bg-dark]="activeTab() === 'settings'"
            [class.text-white]="activeTab() === 'settings'"
            [class.bg-dark/5]="activeTab() !== 'settings'"
            [class.text-dark]="activeTab() !== 'settings'"
            class="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2"
          >
            <span>🏦 Datos Bancarios y Fiscales</span>
            <span *ngIf="summary()!.settings?.bank_account_number" class="text-emerald-500 text-xs">●</span>
          </button>
        </div>

        <!-- Tab 1: Desglose por Evento -->
        <div *ngIf="activeTab() === 'events'" class="space-y-4">
          <div *ngIf="summary()!.events.length === 0" class="py-16 text-center rounded-2xl border border-dashed border-dark/20 bg-white p-8 space-y-2">
            <span class="text-4xl block">🎪</span>
            <p class="text-sm font-bold text-dark">No hay eventos registrados</p>
            <p class="text-xs text-dark/50">Crea tu primer espectáculo para comenzar a generar ingresos.</p>
          </div>

          <div *ngIf="summary()!.events.length > 0" class="overflow-hidden rounded-2xl border border-dark/10 bg-white shadow-sm">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-dark/5 border-b border-dark/10 font-bold text-dark uppercase tracking-wider text-[10px]">
                    <th class="p-3.5 pl-5">Evento</th>
                    <th class="p-3.5">Boletos</th>
                    <th class="p-3.5">Bruto</th>
                    <th class="p-3.5">Comisión</th>
                    <th class="p-3.5">Reembolsos</th>
                    <th class="p-3.5 font-bold text-primary">Neto Liquidable</th>
                    <th class="p-3.5">Pagado</th>
                    <th class="p-3.5 pr-5 text-right font-black text-emerald-700">Saldo Pendiente</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-dark/5">
                  <tr *ngFor="let ev of summary()!.events" class="hover:bg-dark/[0.02] transition-colors">
                    <td class="p-3.5 pl-5">
                      <div class="font-bold text-dark text-sm leading-tight">{{ ev.event_name }}</div>
                      <div class="text-[11px] text-dark/50">{{ ev.venue_name || 'Recinto' }} · {{ ev.event_date | date:'mediumDate' }}</div>
                    </td>
                    <td class="p-3.5 font-mono font-bold text-dark/80">
                      {{ ev.tickets_sold }}
                    </td>
                    <td class="p-3.5 font-mono text-dark/70">
                      \${{ ev.gross | number:'1.2-2' }}
                    </td>
                    <td class="p-3.5 font-mono text-slate-500">
                      -\${{ ev.commission | number:'1.2-2' }}
                    </td>
                    <td class="p-3.5 font-mono" [class.text-rose-600]="ev.refunded > 0" [class.text-dark/40]="ev.refunded === 0">
                      {{ ev.refunded > 0 ? '-\$' + (ev.refunded | number:'1.2-2') : '—' }}
                    </td>
                    <td class="p-3.5 font-mono font-extrabold text-primary">
                      \${{ ev.net | number:'1.2-2' }}
                    </td>
                    <td class="p-3.5 font-mono text-emerald-700">
                      \${{ ev.paid | number:'1.2-2' }}
                    </td>
                    <td class="p-3.5 pr-5 text-right font-mono font-black text-sm" [class.text-emerald-700]="ev.balance > 0" [class.text-dark/40]="ev.balance === 0">
                      \${{ ev.balance | number:'1.2-2' }} MXN
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Tab 2: Historial de Pagos Recibidos -->
        <div *ngIf="activeTab() === 'payouts'" class="space-y-4">
          <div *ngIf="summary()!.payouts.length === 0" class="py-16 text-center rounded-2xl border border-dashed border-dark/20 bg-white p-8 space-y-2">
            <span class="text-4xl block">💳</span>
            <p class="text-sm font-bold text-dark">No hay transferencias registradas</p>
            <p class="text-xs text-dark/50">Cuando la plataforma liquide tus balances por SPEI, verás aquí los comprobantes y folios de transferencia.</p>
          </div>

          <div *ngIf="summary()!.payouts.length > 0" class="overflow-hidden rounded-2xl border border-dark/10 bg-white shadow-sm">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-dark/5 border-b border-dark/10 font-bold text-dark uppercase tracking-wider text-[10px]">
                    <th class="p-3.5 pl-5">Fecha / Folio</th>
                    <th class="p-3.5">Evento Asociado</th>
                    <th class="p-3.5">Método</th>
                    <th class="p-3.5">Referencia SPEI</th>
                    <th class="p-3.5">Monto Dispersado</th>
                    <th class="p-3.5">Estado</th>
                    <th class="p-3.5 pr-5 text-right">Comprobante</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-dark/5">
                  <tr *ngFor="let p of summary()!.payouts" class="hover:bg-dark/[0.02]">
                    <td class="p-3.5 pl-5">
                      <div class="font-bold text-dark">{{ p.processed_at || p.created_at | date:'mediumDate' }}</div>
                      <div class="font-mono text-[10px] text-dark/40">{{ p.id.substring(0, 8) }}</div>
                    </td>
                    <td class="p-3.5 font-medium text-dark/80">
                      {{ p.event_name || 'Liquidación General de Balance' }}
                    </td>
                    <td class="p-3.5 capitalize font-semibold text-dark/70">
                      {{ p.payout_method === 'bank_transfer' ? '🏦 Transferencia SPEI' : p.payout_method }}
                    </td>
                    <td class="p-3.5 font-mono text-dark/80 font-bold">
                      {{ p.reference_code || '—' }}
                    </td>
                    <td class="p-3.5 font-mono font-black text-sm text-emerald-700">
                      \${{ p.amount | number:'1.2-2' }} {{ p.currency }}
                    </td>
                    <td class="p-3.5">
                      <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        ✅ Completado
                      </span>
                    </td>
                    <td class="p-3.5 pr-5 text-right">
                      <a
                        *ngIf="p.receipt_url"
                        [href]="p.receipt_url"
                        target="_blank"
                        rel="noopener"
                        class="px-2.5 py-1 rounded-lg bg-dark/5 hover:bg-dark/10 text-dark font-bold text-[11px] transition inline-flex items-center gap-1"
                      >
                        <span>📄</span>
                        <span>Ver Recibo</span>
                      </a>
                      <span *ngIf="!p.receipt_url" class="text-dark/30 text-[11px]">Sin comprobante</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Tab 3: Datos Bancarios y Fiscales -->
        <div *ngIf="activeTab() === 'settings'" class="max-w-2xl bg-white rounded-3xl p-6 sm:p-8 border border-dark/10 shadow-sm space-y-6">
          <div class="space-y-1">
            <h3 class="text-lg font-black text-dark">
              Configuración de Cuenta para Pagos
            </h3>
            <p class="text-xs text-dark/60">
              Registra los datos de la cuenta bancaria en México (CLABE interbancaria) y datos fiscales donde se depositarán las liquidaciones.
            </p>
          </div>

          <div class="p-4 rounded-2xl bg-cyan-50/50 border border-cyan-200 text-xs text-cyan-950 flex items-start gap-3">
            <span class="text-lg shrink-0">🔒</span>
            <p class="leading-relaxed">
              Tus datos bancarios se almacenan de forma segura bajo cifrado y solo son accesibles por el equipo de finanzas de TicketFlow para realizar dispersiones oficiales.
            </p>
          </div>

          <form (ngSubmit)="saveSettings()" class="space-y-4 text-xs">
            <!-- Bank Account Holder -->
            <div class="space-y-1.5">
              <label class="font-bold text-dark">Nombre del Titular o Razón Social:*</label>
              <input
                type="text"
                [(ngModel)]="payoutForm.bank_account_holder"
                name="account_holder"
                placeholder="Nombre exacto que figura en tu estado de cuenta"
                class="w-full px-3.5 py-2.5 rounded-xl border border-dark/20 text-dark text-xs sm:text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                required
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Bank Name -->
              <div class="space-y-1.5">
                <label class="font-bold text-dark">Institución Bancaria:*</label>
                <input
                  type="text"
                  [(ngModel)]="payoutForm.bank_name"
                  name="bank_name"
                  placeholder="Ej. BBVA, Santander, Banorte, STP"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-dark/20 text-dark text-xs sm:text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  required
                />
              </div>

              <!-- CLABE -->
              <div class="space-y-1.5">
                <label class="font-bold text-dark">CLABE Interbancaria (18 dígitos):*</label>
                <input
                  type="text"
                  [(ngModel)]="payoutForm.bank_account_number"
                  name="account_number"
                  maxlength="18"
                  placeholder="012180012345678901"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-dark/20 font-mono text-dark text-xs sm:text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- RFC / Tax ID -->
              <div class="space-y-1.5">
                <label class="font-bold text-dark">RFC con Homoclave:*</label>
                <input
                  type="text"
                  [(ngModel)]="payoutForm.tax_id"
                  name="tax_id"
                  placeholder="Ej. ABCD900101XYZ"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-dark/20 uppercase font-mono text-dark text-xs sm:text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>

              <!-- Régimen Fiscal -->
              <div class="space-y-1.5">
                <label class="font-bold text-dark">Régimen Fiscal (Opcional):</label>
                <input
                  type="text"
                  [(ngModel)]="payoutForm.tax_regime"
                  name="tax_regime"
                  placeholder="Ej. Persona Física con Actividad Empresarial / RESICO"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-dark/20 text-dark text-xs sm:text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>
            </div>

            <!-- Payout Notification Email -->
            <div class="space-y-1.5">
              <label class="font-bold text-dark">Correo Electrónico para Comprobantes:*</label>
              <input
                type="email"
                [(ngModel)]="payoutForm.payout_email"
                name="payout_email"
                placeholder="facturacion@tuartista.com"
                class="w-full px-3.5 py-2.5 rounded-xl border border-dark/20 text-dark text-xs sm:text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
              />
            </div>

            <!-- Action Button -->
            <div class="pt-3 border-t border-dark/10 flex justify-end">
              <button
                type="submit"
                [disabled]="isSavingSettings()"
                class="px-6 py-2.5 rounded-xl bg-dark hover:bg-black text-white font-bold text-xs shadow-md transition flex items-center gap-2"
              >
                <tf-spinner *ngIf="isSavingSettings()" size="sm" color="white"></tf-spinner>
                <span>{{ isSavingSettings() ? 'Guardando...' : 'Guardar Información Bancaria' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class FinancesComponent implements OnInit {
  private readonly financesService = inject(FinancesService);

  readonly isLoading = signal(true);
  readonly isSavingSettings = signal(false);
  readonly summary = signal<ArtistFinancialSummary | null>(null);
  readonly activeTab = signal<FinanceTab>('events');

  readonly feedbackMessage = signal<string | null>(null);
  readonly feedbackType = signal<'success' | 'error'>('success');

  payoutForm: Partial<ArtistPayoutSetting> = {
    bank_name: '',
    bank_account_number: '',
    bank_account_holder: '',
    tax_id: '',
    tax_regime: '',
    payout_email: '',
  };

  async ngOnInit(): Promise<void> {
    await this.loadFinancialSummary();
  }

  async loadFinancialSummary(): Promise<void> {
    this.isLoading.set(true);
    try {
      const data = await this.financesService.getFinancialSummary();
      this.summary.set(data);
      if (data.settings) {
        this.payoutForm = {
          bank_name: data.settings.bank_name || '',
          bank_account_number: data.settings.bank_account_number || '',
          bank_account_holder: data.settings.bank_account_holder || '',
          tax_id: data.settings.tax_id || '',
          tax_regime: data.settings.tax_regime || '',
          payout_email: data.settings.payout_email || '',
        };
      }
    } catch (err: any) {
      console.error('Error loading finances:', err);
      this.feedbackType.set('error');
      this.feedbackMessage.set(err.message || 'Error al cargar los datos financieros.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveSettings(): Promise<void> {
    const s = this.summary();
    if (!s?.artist_id) return;

    this.isSavingSettings.set(true);
    try {
      const res = await this.financesService.savePayoutSettings(s.artist_id, this.payoutForm);
      if (res.success) {
        this.feedbackType.set('success');
        this.feedbackMessage.set(res.message || 'Datos bancarios guardados correctamente.');
        await this.loadFinancialSummary();
      } else {
        this.feedbackType.set('error');
        this.feedbackMessage.set(res.error || 'Error al guardar los datos.');
      }
    } catch (err: any) {
      this.feedbackType.set('error');
      this.feedbackMessage.set(err.message || 'Error inesperado.');
    } finally {
      this.isSavingSettings.set(false);
    }
  }
}
