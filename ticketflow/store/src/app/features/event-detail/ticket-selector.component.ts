import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { TicketTypeWithAvailability } from '@ticketflow/models';
import type { CartTicketItem } from './event-detail.service';
import { WaitlistService } from '../../core/services/waitlist.service';
import { AuthService } from '@ticketflow/data-access';
import { SpinnerComponent } from '@ticketflow/shared-ui';

@Component({
  selector: 'store-ticket-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, SpinnerComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <h3 class="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
          <i class="fa-solid fa-ticket text-cyan-600"></i> Selecciona tus Boletos
        </h3>
        <span class="text-xs text-slate-500 font-medium">
          Máx. 10 boletos
        </span>
      </div>

      <!-- Tickets List -->
      <div *ngIf="ticketTypes.length > 0" class="space-y-3.5">
        <div
          *ngFor="let t of ticketTypes"
          class="p-4 rounded-2xl border transition-all duration-200 space-y-3"
          [class.border-cyan-500]="getQuantity(t.id) > 0"
          [class.bg-cyan-50\/40]="getQuantity(t.id) > 0"
          [class.border-slate-200]="getQuantity(t.id) === 0"
          [class.bg-white]="getQuantity(t.id) === 0"
          [class.opacity-75]="t.available <= 0"
        >
          <!-- Top: Name, SKU, Availability & Description -->
          <div class="space-y-1">
            <div class="flex items-start justify-between gap-2">
              <h4 class="font-bold text-sm text-slate-900 leading-snug">{{ t.name }}</h4>
              <span class="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
                {{ t.sku }}
              </span>
            </div>

            <p *ngIf="t.description" class="text-xs text-slate-500 line-clamp-2">
              {{ t.description }}
            </p>

            <div class="text-xs pt-0.5 flex items-center justify-between">
              <span *ngIf="t.available > 0" class="text-emerald-700 font-semibold text-[11px]">
                ● {{ t.available }} disponibles
              </span>
              <span *ngIf="t.available <= 0" class="text-rose-600 font-bold uppercase tracking-wider text-[10px]">
                Agotado
              </span>

              <!-- Direct waitlist trigger for sold out item -->
              <button
                *ngIf="t.available <= 0 && eventId"
                type="button"
                (click)="selectTierForWaitlist(t.id)"
                class="text-[11px] font-bold text-cyan-600 hover:text-cyan-700 underline flex items-center gap-1"
              >
                <i class="fa-solid fa-bell"></i> Avisarme si se libera
              </button>
            </div>
          </div>

          <!-- Bottom: Price & Stepper -->
          <div class="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
            <div>
              <span class="text-[10px] uppercase font-bold text-slate-400 block leading-none">Precio</span>
              <span class="font-black text-base text-slate-900 font-mono mt-0.5 block">
                \${{ t.price | number:'1.2-2' }} <span class="text-[10px] font-normal text-slate-400">MXN</span>
              </span>
            </div>

            <!-- Stepper -->
            <div *ngIf="t.available > 0" class="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1 border border-slate-200 shrink-0">
              <button
                type="button"
                (click)="decrement(t)"
                [disabled]="getQuantity(t.id) <= 0"
                class="w-7 h-7 rounded-lg bg-white text-slate-800 font-black flex items-center justify-center hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm text-sm select-none"
              >
                −
              </button>

              <span class="w-7 text-center font-bold text-sm text-slate-900 font-mono select-none">
                {{ getQuantity(t.id) }}
              </span>

              <button
                type="button"
                (click)="increment(t)"
                [disabled]="getQuantity(t.id) >= Math.min(10, t.available) || totalCount >= 10"
                class="w-7 h-7 rounded-lg bg-cyan-400 text-slate-950 font-black flex items-center justify-center hover:bg-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm text-sm select-none"
              >
                +
              </button>
            </div>

            <div *ngIf="t.available <= 0" class="text-xs text-rose-600/80 font-bold italic shrink-0">
              Localidad Agotada
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="ticketTypes.length === 0" class="p-8 text-center text-slate-400 border border-dashed border-slate-300 rounded-2xl">
        <i class="fa-solid fa-ticket text-3xl text-slate-300 block mb-1"></i>
        <span>Aún no hay localidades disponibles para la venta.</span>
      </div>

      <!-- Floating or Bottom Summary Box -->
      <div *ngIf="totalCount > 0" class="p-5 sm:p-6 rounded-2xl bg-slate-900 text-white space-y-4 shadow-xl border border-slate-800">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-xs text-slate-400 uppercase font-bold tracking-wider block">Resumen</span>
            <span class="text-sm font-semibold text-slate-200">
              {{ totalCount }} {{ totalCount === 1 ? 'boleto seleccionado' : 'boletos seleccionados' }}
            </span>
          </div>

          <div class="text-right">
            <span class="text-xs text-slate-400 block">Total a pagar:</span>
            <span class="text-xl sm:text-2xl font-black text-amber-400 font-mono">
              \${{ totalPrice | number:'1.2-2' }} MXN
            </span>
          </div>
        </div>

        <button
          type="button"
          class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-md shadow-cyan-500/20"
          (click)="onProceed()"
        >
          <span>Continuar con {{ totalCount }} {{ totalCount === 1 ? 'Boleto' : 'Boletos' }} <i class="fa-solid fa-arrow-right ml-1"></i></span>
        </button>
      </div>

      <!-- Waitlist Box (Visible if event has sold-out tiers or all sold out) -->
      <div
        *ngIf="hasSoldOutTiers && eventId"
        class="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-orange-50/30 border border-amber-200/80 space-y-4 shadow-sm"
      >
        <div class="space-y-1">
          <span class="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full inline-block">
            Lista de Espera Oficial
          </span>
          <h4 class="text-base font-black text-slate-900 flex items-center gap-1.5">
            <i class="fa-solid fa-bell text-amber-600"></i> ¿No alcanzaste boletos?
          </h4>
          <p class="text-xs text-slate-600 leading-relaxed">
            Regístrate y recibe una alerta prioritaria en tu correo si se liberan reservaciones no pagadas o cancelaciones.
          </p>
        </div>

        <!-- Success notification -->
        <div
          *ngIf="waitlistSuccessMessage()"
          class="p-3.5 rounded-2xl bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2"
        >
          <i class="fa-solid fa-circle-check text-emerald-600"></i>
          <span>{{ waitlistSuccessMessage() }}</span>
        </div>

        <!-- Waitlist Form (Hidden if already successfully submitted) -->
        <div *ngIf="!waitlistSuccessMessage()" class="space-y-3 text-xs">
          <!-- Tier selection dropdown -->
          <div class="space-y-1">
            <label class="font-bold text-slate-700">Zona de interés:</label>
            <select
              [(ngModel)]="selectedWaitlistTier"
              class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="">Cualquier localidad disponible</option>
              <option *ngFor="let t of ticketTypes" [value]="t.id">
                {{ t.name }} (\${{ t.price | number:'1.2-2' }}) {{ t.available <= 0 ? '— Agotado' : '' }}
              </option>
            </select>
          </div>

          <!-- Email input -->
          <div class="space-y-1">
            <label class="font-bold text-slate-700">Correo Electrónico:</label>
            <input
              type="email"
              [(ngModel)]="waitlistEmail"
              placeholder="tu@correo.com"
              class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <!-- Phone input (optional) -->
          <div class="space-y-1">
            <label class="font-bold text-slate-500">Teléfono / WhatsApp (opcional):</label>
            <input
              type="tel"
              [(ngModel)]="waitlistPhone"
              placeholder="+52 55 1234 5678"
              class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <!-- Error message -->
          <p *ngIf="waitlistError()" class="text-rose-600 font-bold text-xs">
            {{ waitlistError() }}
          </p>

          <!-- Submit button -->
          <button
            type="button"
            (click)="submitWaitlist()"
            [disabled]="isSubmittingWaitlist()"
            class="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <tf-spinner *ngIf="isSubmittingWaitlist()" size="sm" color="white"></tf-spinner>
            <span><i class="fa-solid fa-bell mr-1" *ngIf="!isSubmittingWaitlist()"></i>{{ isSubmittingWaitlist() ? 'Registrando...' : 'Avisarme al Liberarse Boletos' }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class TicketSelectorComponent implements OnInit, OnChanges {
  @Input() eventId?: string;
  @Input() ticketTypes: TicketTypeWithAvailability[] = [];
  @Output() checkoutRequested = new EventEmitter<CartTicketItem[]>();

  private readonly waitlistService = inject(WaitlistService);
  private readonly auth = inject(AuthService);

  protected readonly Math = Math;

  quantities: Record<string, number> = {};

  // Waitlist form state
  selectedWaitlistTier = '';
  waitlistEmail = '';
  waitlistPhone = '';
  readonly isSubmittingWaitlist = signal(false);
  readonly waitlistSuccessMessage = signal<string | null>(null);
  readonly waitlistError = signal<string | null>(null);

  get hasSoldOutTiers(): boolean {
    return this.ticketTypes.some((t) => t.available <= 0);
  }

  get allSoldOut(): boolean {
    return this.ticketTypes.length > 0 && this.ticketTypes.every((t) => t.available <= 0);
  }

  ngOnInit(): void {
    this.initQuantities();
    this.initEmail();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ticketTypes']) {
      this.initQuantities();
    }
  }

  private initEmail(): void {
    const userEmail = this.auth.user()?.email;
    if (userEmail && !this.waitlistEmail) {
      this.waitlistEmail = userEmail;
    }
  }

  private initQuantities(): void {
    this.quantities = {};
    for (const t of this.ticketTypes) {
      this.quantities[t.id] = 0;
    }
  }

  getQuantity(ticketId: string): number {
    return this.quantities[ticketId] || 0;
  }

  get totalCount(): number {
    return Object.values(this.quantities).reduce((a, b) => a + b, 0);
  }

  get totalPrice(): number {
    return this.ticketTypes.reduce((acc, t) => {
      const q = this.getQuantity(t.id);
      return acc + q * Number(t.price);
    }, 0);
  }

  increment(t: TicketTypeWithAvailability): void {
    const current = this.getQuantity(t.id);
    const maxAllowed = Math.min(10, t.available);
    if (current < maxAllowed && this.totalCount < 10) {
      this.quantities[t.id] = current + 1;
    }
  }

  decrement(t: TicketTypeWithAvailability): void {
    const current = this.getQuantity(t.id);
    if (current > 0) {
      this.quantities[t.id] = current - 1;
    }
  }

  onProceed(): void {
    const selectedItems: CartTicketItem[] = [];
    for (const t of this.ticketTypes) {
      const q = this.getQuantity(t.id);
      if (q > 0) {
        selectedItems.push({
          ticketType: t,
          quantity: q,
        });
      }
    }
    this.checkoutRequested.emit(selectedItems);
  }

  selectTierForWaitlist(ticketTypeId: string): void {
    this.selectedWaitlistTier = ticketTypeId;
    this.initEmail();
  }

  async submitWaitlist(): Promise<void> {
    if (!this.eventId) return;

    const email = this.waitlistEmail.trim();
    if (!email || !email.includes('@')) {
      this.waitlistError.set('Por favor ingresa un correo electrónico válido.');
      return;
    }

    this.isSubmittingWaitlist.set(true);
    this.waitlistError.set(null);

    try {
      const res = await this.waitlistService.joinWaitlist(
        this.eventId,
        this.selectedWaitlistTier || null,
        email,
        this.waitlistPhone
      );

      if (res.success) {
        this.waitlistSuccessMessage.set(
          res.message || '¡Te has unido exitosamente a la lista de espera!'
        );
      } else {
        this.waitlistError.set(res.error || 'No fue posible registrarte en la lista de espera.');
      }
    } catch (err: any) {
      this.waitlistError.set(err.message || 'Error inesperado al unirse a la lista.');
    } finally {
      this.isSubmittingWaitlist.set(false);
    }
  }
}

