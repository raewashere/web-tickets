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
          <span class="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full inline-block mb-2">
            Módulo Financiero
          </span>
          <h1 class="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
            Finanzas & Control de Liquidaciones
          </h1>
          <p class="text-xs sm:text-sm text-on-surface-variant mt-1">
            Consulta el balance neto de tus espectáculos, historial de transferencias recibidas y configura tus datos bancarios para dispersión.
          </p>
        </div>

        <button
          type="button"
          (click)="loadFinancialSummary()"
          class="px-4 py-2 rounded-xl bg-surface-container border border-outline-variant/30 hover:bg-surface-variant text-on-surface font-bold text-xs shadow-sm transition flex items-center gap-2 self-start sm:self-auto"
        >
          <i class="fa-solid fa-rotate-right" [class.animate-spin]="isLoading()"></i>
          <span>Actualizar Balances</span>
        </button>
      </div>

      <!-- Feedback Toast Banner -->
      <div
        *ngIf="feedbackMessage()"
        class="p-4 rounded-2xl flex items-center justify-between transition-all text-xs sm:text-sm font-semibold"
        [ngClass]="feedbackType() === 'success' ? 'bg-tertiary-container border border-tertiary/30 text-on-tertiary-container' : 'bg-error-container border border-error/30 text-on-error-container'"
      >
        <div class="flex items-center gap-2">
          <i [class]="feedbackType() === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation text-error'"></i>
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

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="py-24 flex flex-col items-center justify-center gap-3">
        <tf-spinner size="lg" color="primary"></tf-spinner>
        <p class="text-xs sm:text-sm text-on-surface-variant font-medium">Calculando balances y liquidaciones...</p>
      </div>

      <!-- Financial Dashboard View -->
      <div *ngIf="!isLoading() && summary()" class="space-y-6">
        <!-- KPI Metric Cards Grid -->
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <!-- Saldo Disponible por Cobrar -->
          <div class="col-span-2 sm:col-span-1 p-5 rounded-3xl bg-gradient-to-br from-tertiary-container/40 via-tertiary-container/10 to-surface border-2 border-tertiary/40 shadow-sm space-y-1">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold uppercase tracking-wider text-on-tertiary-container dark:text-tertiary">Saldo Disponible</span>
              <i class="fa-solid fa-money-bill-wave text-on-tertiary-container dark:text-tertiary text-sm"></i>
            </div>
            <p class="text-2xl sm:text-3xl font-bold text-on-tertiary-container dark:text-tertiary font-mono">
              \${{ summary()!.balance_due | number:'1.2-2' }}
            </p>
            <span class="text-[10px] text-on-tertiary-container/80 dark:text-tertiary/80 font-semibold block">Pendiente por liquidar</span>
          </div>

          <!-- Total Neto Acumulado -->
          <div class="p-4 rounded-2xl bg-surface-container border border-outline-variant/30 shadow-sm space-y-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">Neto Ganado</span>
            <p class="text-xl sm:text-2xl font-bold text-on-surface font-mono">
              \${{ summary()!.net_earnings | number:'1.2-2' }}
            </p>
            <span class="text-[10px] text-on-surface-variant/80 font-medium">Tras comisiones</span>
          </div>

          <!-- Total Liquidado / Pagado -->
          <div class="p-4 rounded-2xl bg-surface-container border border-outline-variant/30 shadow-sm space-y-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">Total Pagado</span>
            <p class="text-xl sm:text-2xl font-bold text-primary font-mono">
              \${{ summary()!.total_paid | number:'1.2-2' }}
            </p>
            <span class="text-[10px] text-on-surface-variant/80 font-medium">Dispersado por SPEI</span>
          </div>

          <!-- Ventas Brutas Totales -->
          <div class="p-4 rounded-2xl bg-surface-container border border-outline-variant/30 shadow-sm space-y-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">Venta Bruta</span>
            <p class="text-xl sm:text-2xl font-bold text-on-surface font-mono">
              \${{ summary()!.total_gross | number:'1.2-2' }}
            </p>
            <span class="text-[10px] text-on-surface-variant/80 font-medium">Boletos confirmados</span>
          </div>

          <!-- Comisiones Plataforma -->
          <div class="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-surface-container border border-outline-variant/30 shadow-sm space-y-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">Comisión TicketFlow</span>
            <p class="text-xl sm:text-2xl font-bold text-on-surface-variant font-mono">
              \${{ summary()!.total_commission | number:'1.2-2' }}
            </p>
            <span class="text-[10px] text-on-surface-variant/80 font-medium">Servicio retenido</span>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex flex-wrap items-center gap-2 border-b border-outline-variant/20 pb-2">
          <button
            type="button"
            (click)="activeTab.set('events')"
            [class.bg-primary]="activeTab() === 'events'"
            [class.text-on-primary]="activeTab() === 'events'"
            [class.bg-surface-container]="activeTab() !== 'events'"
            [class.text-on-surface]="activeTab() !== 'events'"
            class="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2"
          >
            <i class="fa-solid fa-masks-theater"></i>
            <span>Desglose por Evento</span>
            <span class="px-2 py-0.5 rounded-full text-[10px]" [class.bg-white/20]="activeTab() === 'events'" [class.bg-surface-variant]="activeTab() !== 'events'">
              {{ summary()!.events.length }}
            </span>
          </button>

          <button
            type="button"
            (click)="activeTab.set('payouts')"
            [class.bg-primary]="activeTab() === 'payouts'"
            [class.text-on-primary]="activeTab() === 'payouts'"
            [class.bg-surface-container]="activeTab() !== 'payouts'"
            [class.text-on-surface]="activeTab() !== 'payouts'"
            class="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2"
          >
            <i class="fa-solid fa-credit-card"></i>
            <span>Historial de Pagos</span>
            <span class="px-2 py-0.5 rounded-full text-[10px]" [class.bg-white/20]="activeTab() === 'payouts'" [class.bg-surface-variant]="activeTab() !== 'payouts'">
              {{ summary()!.payouts.length }}
            </span>
          </button>

          <button
            type="button"
            (click)="activeTab.set('settings')"
            [class.bg-primary]="activeTab() === 'settings'"
            [class.text-on-primary]="activeTab() === 'settings'"
            [class.bg-surface-container]="activeTab() !== 'settings'"
            [class.text-on-surface]="activeTab() !== 'settings'"
            class="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2"
          >
            <i class="fa-solid fa-building-columns"></i>
            <span>Datos Bancarios y Fiscales</span>
            <span *ngIf="summary()!.settings.bank_account_number" class="text-tertiary text-xs">●</span>
          </button>
        </div>

        <!-- Tab 1: Desglose por Evento -->
        <div *ngIf="activeTab() === 'events'" class="space-y-4">
          <div *ngIf="summary()!.events.length === 0" class="py-16 text-center rounded-2xl border border-dashed border-outline-variant/40 bg-surface-container p-8 space-y-2">
            <span class="text-4xl block text-on-surface-variant/40">
              <i class="fa-solid fa-masks-theater"></i>
            </span>
            <p class="text-sm font-bold text-on-surface">No hay eventos registrados</p>
            <p class="text-xs text-on-surface-variant">Crea tu primer espectáculo para comenzar a generar ingresos.</p>
          </div>

          <div *ngIf="summary()!.events.length > 0" class="overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container shadow-sm">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-surface-variant/50 border-b border-outline-variant/20 font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">
                    <th class="p-3.5 pl-5">Evento</th>
                    <th class="p-3.5">Fecha</th>
                    <th class="p-3.5 text-center">Boletos Vendidos</th>
                    <th class="p-3.5">Venta Bruta</th>
                    <th class="p-3.5">Comisión</th>
                    <th class="p-3.5">Neto Artista</th>
                    <th class="p-3.5 pr-5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-outline-variant/20">
                  <tr *ngFor="let ev of summary()!.events" class="hover:bg-surface-variant/30 transition-colors">
                    <td class="p-3.5 pl-5 font-bold text-on-surface">
                      {{ ev.event_name }}
                    </td>
                    <td class="p-3.5 text-on-surface-variant whitespace-nowrap">
                      {{ ev.event_date | date:'mediumDate' }}
                    </td>
                    <td class="p-3.5 text-center font-bold font-mono text-on-surface">
                      {{ ev.tickets_sold | number }}
                    </td>
                    <td class="p-3.5 font-mono text-on-surface">
                      \${{ ev.gross | number:'1.2-2' }}
                    </td>
                    <td class="p-3.5 font-mono text-on-surface-variant">
                      \${{ ev.commission | number:'1.2-2' }}
                    </td>
                    <td class="p-3.5 font-mono font-bold text-primary">
                      \${{ ev.net | number:'1.2-2' }}
                    </td>
                    <td class="p-3.5 pr-5 text-right">
                      <a [routerLink]="['/events', ev.event_id]" class="text-primary hover:underline font-bold">
                        Ver Evento
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Tab 2: Historial de Pagos Recibidos -->
        <div *ngIf="activeTab() === 'payouts'" class="space-y-4">
          <div *ngIf="summary()!.payouts.length === 0" class="py-16 text-center rounded-2xl border border-dashed border-outline-variant/40 bg-surface-container p-8 space-y-2">
            <span class="text-4xl block text-on-surface-variant/40">
              <i class="fa-solid fa-credit-card"></i>
            </span>
            <p class="text-sm font-bold text-on-surface">No hay transferencias registradas</p>
            <p class="text-xs text-on-surface-variant">Cuando la plataforma liquide tus balances por SPEI, verás aquí los comprobantes y folios de transferencia.</p>
          </div>

          <div *ngIf="summary()!.payouts.length > 0" class="overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container shadow-sm">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-surface-variant/50 border-b border-outline-variant/20 font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">
                    <th class="p-3.5 pl-5">Fecha / Folio</th>
                    <th class="p-3.5">Evento Asociado</th>
                    <th class="p-3.5">Método</th>
                    <th class="p-3.5">Referencia SPEI</th>
                    <th class="p-3.5">Monto Dispersado</th>
                    <th class="p-3.5">Estado</th>
                    <th class="p-3.5 pr-5 text-right">Comprobante</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-outline-variant/20">
                  <tr *ngFor="let p of summary()!.payouts" class="hover:bg-surface-variant/30 transition-colors">
                    <td class="p-3.5 pl-5">
                      <div class="font-bold text-on-surface">{{ p.processed_at || p.created_at | date:'mediumDate' }}</div>
                      <div class="font-mono text-[10px] text-on-surface-variant">{{ p.id.substring(0, 8) }}</div>
                    </td>
                    <td class="p-3.5 font-medium text-on-surface">
                      {{ p.event_name || 'Liquidación General de Balance' }}
                    </td>
                    <td class="p-3.5 capitalize font-semibold text-on-surface-variant">
                      {{ p.payout_method === 'bank_transfer' ? 'Transferencia SPEI' : p.payout_method }}
                    </td>
                    <td class="p-3.5 font-mono text-on-surface font-bold">
                      {{ p.reference_code || '—' }}
                    </td>
                    <td class="p-3.5 font-mono font-bold text-sm text-primary">
                      \${{ p.amount | number:'1.2-2' }} {{ p.currency }}
                    </td>
                    <td class="p-3.5">
                      <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-tertiary-container text-on-tertiary-container border border-tertiary/30">
                        <i class="fa-solid fa-check text-[9px]"></i> Completado
                      </span>
                    </td>
                    <td class="p-3.5 pr-5 text-right">
                      <a
                        *ngIf="p.receipt_url"
                        [href]="p.receipt_url"
                        target="_blank"
                        rel="noopener"
                        class="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-variant text-on-surface border border-outline-variant/30 font-bold text-[11px] transition inline-flex items-center gap-1.5"
                      >
                        <i class="fa-regular fa-file-pdf text-primary"></i>
                        <span>Ver Recibo</span>
                      </a>
                      <span *ngIf="!p.receipt_url" class="text-on-surface-variant/60 text-[11px]">Sin comprobante</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Tab 3: Datos Bancarios y Fiscales -->
        <div *ngIf="activeTab() === 'settings'" class="max-w-2xl bg-surface-container rounded-3xl p-6 sm:p-8 border border-outline-variant/30 shadow-sm space-y-6">
          <div class="space-y-1">
            <h3 class="text-lg font-bold text-on-surface">
              Configuración de Cuenta para Pagos
            </h3>
            <p class="text-xs text-on-surface-variant">
              Registra los datos de la cuenta bancaria en México (CLABE interbancaria) y datos fiscales donde se depositarán las liquidaciones.
            </p>
          </div>

          <div class="p-4 rounded-2xl bg-tertiary-container/40 border border-tertiary/30 text-xs text-on-surface flex items-start gap-3">
            <i class="fa-solid fa-shield-halved text-primary text-base shrink-0 mt-0.5"></i>
            <p class="leading-relaxed">
              Tus datos bancarios se almacenan de forma segura bajo cifrado y solo son accesibles por el equipo de finanzas de TicketFlow para realizar dispersiones oficiales.
            </p>
          </div>

          <form (ngSubmit)="saveSettings()" class="space-y-4 text-xs">
            <!-- Bank Account Holder -->
            <div class="space-y-1.5">
              <label class="font-bold text-on-surface">Nombre del Titular o Razón Social:*</label>
              <input
                type="text"
                [(ngModel)]="payoutForm.bank_account_holder"
                name="account_holder"
                placeholder="Nombre exacto que figura en tu estado de cuenta"
                class="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-xs sm:text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                required
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Bank Name -->
              <div class="space-y-1.5">
                <label class="font-bold text-on-surface">Institución Bancaria:*</label>
                <input
                  type="text"
                  [(ngModel)]="payoutForm.bank_name"
                  name="bank_name"
                  placeholder="Ej. BBVA, Santander, Banorte, STP"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-xs sm:text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  required
                />
              </div>

              <!-- CLABE -->
              <div class="space-y-1.5">
                <label class="font-bold text-on-surface">CLABE Interbancaria (18 dígitos):*</label>
                <input
                  type="text"
                  [(ngModel)]="payoutForm.bank_account_number"
                  name="account_number"
                  maxlength="18"
                  placeholder="012180012345678901"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/40 bg-surface font-mono text-on-surface text-xs sm:text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- RFC / Tax ID -->
              <div class="space-y-1.5">
                <label class="font-bold text-on-surface">RFC con Homoclave:*</label>
                <input
                  type="text"
                  [(ngModel)]="payoutForm.tax_id"
                  name="tax_id"
                  placeholder="Ej. ABCD900101XYZ"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/40 bg-surface uppercase font-mono text-on-surface text-xs sm:text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>

              <!-- Régimen Fiscal -->
              <div class="space-y-1.5">
                <label class="font-bold text-on-surface">Régimen Fiscal (Opcional):</label>
                <input
                  type="text"
                  [(ngModel)]="payoutForm.tax_regime"
                  name="tax_regime"
                  placeholder="Ej. Persona Física con Actividad Empresarial / RESICO"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-xs sm:text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>
            </div>

            <!-- Payout Notification Email -->
            <div class="space-y-1.5">
              <label class="font-bold text-on-surface">Correo Electrónico para Comprobantes:*</label>
              <input
                type="email"
                [(ngModel)]="payoutForm.payout_email"
                name="payout_email"
                placeholder="facturacion@tuartista.com"
                class="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-xs sm:text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
              />
            </div>

            <!-- Action Button -->
            <div class="pt-3 border-t border-outline-variant/20 flex justify-end">
              <button
                type="submit"
                [disabled]="isSavingSettings()"
                class="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs shadow-md transition flex items-center gap-2"
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
