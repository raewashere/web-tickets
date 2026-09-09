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
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { TicketsService, UpsertTicketTypeDto } from '../tickets.service';
import { AuthService } from '@ticketflow/data-access';
import type { TicketTypeWithAvailability, TicketType } from '@ticketflow/models';
import {
  ButtonComponent,
  SpinnerComponent,
} from '@ticketflow/shared-ui';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-ticket-type-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    SpinnerComponent,
    RouterModule,
  ],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/60 backdrop-blur-sm">
      <div class="bg-surface rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-dark/10">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-dark/10 bg-surface">
          <div>
            <h3 class="text-lg font-bold text-dark">
              {{ ticket ? 'Editar Tipo de Boleto' : 'Nuevo Tipo de Boleto' }}
            </h3>
            <p class="text-xs text-dark/60 mt-0.5">
              Define la tarifa, SKU, aforo y descripción para esta localidad.
            </p>
          </div>
          <button
            type="button"
            (click)="onCancel()"
            class="text-dark/40 hover:text-dark p-1.5 rounded-lg transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body Form -->
        <form [formGroup]="ticketForm" (ngSubmit)="onSubmit()" class="p-6 space-y-4">
          <!-- Error alert -->
          <div
            *ngIf="errorMessage()"
            class="p-3 rounded-xl bg-contrast/10 border border-contrast/20 text-contrast text-xs flex items-center gap-2"
          >
            <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span>{{ errorMessage() }}</span>
          </div>

          <!-- Name -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-dark mb-1.5">
              Nombre de la Localidad *
            </label>
            <input
              type="text"
              formControlName="name"
              (input)="onNameChange()"
              placeholder="Ej. VIP Front Row, Preferente A, General"
              class="w-full px-4 py-2.5 rounded-xl border border-dark/20 bg-surface text-dark placeholder-dark/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
            />
            <p
              *ngIf="ticketForm.get('name')?.touched && ticketForm.get('name')?.invalid"
              class="text-xs text-contrast mt-1"
            >
              El nombre del boleto es obligatorio.
            </p>
          </div>

          <!-- SKU -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-xs font-bold uppercase tracking-wider text-dark">
                Código SKU único *
              </label>
              <button
                type="button"
                (click)="autoSuggestSku()"
                class="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
              >
                <i class="fa-solid fa-wand-magic-sparkles"></i> Sugerir SKU
              </button>
            </div>
            <input
              type="text"
              formControlName="sku"
              placeholder="Ej. VIP-01, GEN-100"
              class="w-full px-4 py-2.5 rounded-xl border border-dark/20 bg-surface text-dark uppercase font-mono placeholder-dark/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
            />
            <p
              *ngIf="ticketForm.get('sku')?.touched && ticketForm.get('sku')?.invalid"
              class="text-xs text-contrast mt-1"
            >
              El SKU es obligatorio y debe ser único para este show.
            </p>
          </div>

          <!-- Price and Stock Row -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Price -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-dark mb-1.5">
                Precio de Venta ($ MXN) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                formControlName="price"
                placeholder="500.00"
                class="w-full px-4 py-2.5 rounded-xl border border-dark/20 bg-surface text-dark placeholder-dark/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
              />
            </div>

            <!-- Stock -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-dark mb-1.5">
                Boletos Disponibles (Stock) *
              </label>
              <input
                type="number"
                min="1"
                [max]="remainingCapacity !== null ? remainingCapacity : null"
                step="1"
                formControlName="stock"
                placeholder="100"
                class="w-full px-4 py-2.5 rounded-xl border border-dark/20 bg-surface text-dark placeholder-dark/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
              />
              <!-- Venue capacity helper -->
              <div *ngIf="venueCapacity !== null" class="mt-1.5 p-2 rounded-lg bg-dark/5 text-[11px] space-y-0.5">
                <div class="flex justify-between text-dark/70">
                  <span>Aforo total del recinto:</span>
                  <span class="font-mono font-bold">{{ venueCapacity }}</span>
                </div>
                <div class="flex justify-between text-dark/70">
                  <span>Asignados en otras localidades:</span>
                  <span class="font-mono font-bold">{{ usedStock }}</span>
                </div>
                <div
                  class="flex justify-between font-bold pt-1 border-t border-dark/10"
                  [class.text-emerald-700]="(remainingCapacity ?? 0) > 0"
                  [class.text-contrast]="(remainingCapacity ?? 0) <= 0"
                >
                  <span>Disponibles para esta localidad:</span>
                  <span class="font-mono">{{ remainingCapacity }}</span>
                </div>
              </div>
              <p
                *ngIf="ticketForm.get('stock')?.errors?.['max']"
                class="text-xs text-contrast mt-1 font-semibold"
              >
                El stock supera la capacidad disponible del recinto (máx. {{ remainingCapacity }} boletos).
              </p>
            </div>
          </div>

          <!-- Live Commission Calculation Box -->
          <div class="p-3.5 rounded-xl bg-accent/15 border border-accent/30 space-y-1.5 text-xs text-dark">
            <div class="flex items-center justify-between">
              <span class="text-dark/70">Precio base al comprador:</span>
              <span class="font-mono font-bold">\${{ getCommission().basePrice | number:'1.2-2' }}</span>
            </div>
            <div class="flex items-center justify-between text-contrast">
              <span>Comisión de plataforma (20%):</span>
              <span class="font-mono font-bold">-\${{ getCommission().commissionAmount | number:'1.2-2' }}</span>
            </div>
            <div class="pt-1.5 border-t border-dark/10 flex items-center justify-between font-extrabold text-sm text-dark">
              <span>Neto recibido por el artista:</span>
              <span class="font-mono text-dark">\${{ getCommission().netToArtist | number:'1.2-2' }}</span>
            </div>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-dark mb-1.5">
              Beneficios / Qué incluye (opcional)
            </label>
            <textarea
              formControlName="description"
              rows="2"
              placeholder="Ej. Acceso preferencial, foto con el artista, póster de regalo..."
              class="w-full px-4 py-2 rounded-xl border border-dark/20 bg-surface text-dark placeholder-dark/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-xs transition-all resize-none"
            ></textarea>
          </div>

          <!-- Active checkbox -->
          <div class="flex items-center gap-3 p-3 rounded-xl bg-dark/5 border border-dark/10">
            <input
              type="checkbox"
              id="is_active"
              formControlName="is_active"
              class="w-4 h-4 rounded text-primary focus:ring-primary border-dark/30 cursor-pointer"
            />
            <label for="is_active" class="text-xs font-semibold text-dark cursor-pointer select-none">
              Habilitado para la venta en taquilla pública
            </label>
          </div>

          <!-- Footer Actions -->
          <div class="flex items-center justify-end gap-3 pt-3 border-t border-dark/10">
            <tf-button
              type="button"
              variant="secondary"
              size="md"
              (click)="onCancel()"
              [disabled]="isSubmitting()"
            >
              Cancelar
            </tf-button>

            <tf-button
              type="submit"
              variant="primary"
              size="md"
              [disabled]="ticketForm.invalid || isSubmitting()"
            >
              <span *ngIf="!isSubmitting()">{{ ticket ? 'Guardar Cambios' : 'Crear Boleto' }}</span>
              <span *ngIf="isSubmitting()" class="flex items-center gap-2">
                <tf-spinner size="sm" color="dark"></tf-spinner>
                <span>Guardando...</span>
              </span>
            </tf-button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class TicketTypeFormComponent implements OnInit, OnChanges {
  @Input({ required: false }) eventId!: string;
  @Input() ticket: TicketType | null = null;
  @Input() venueCapacity: number | null = null;
  @Input() usedStock = 0;

  @Output() saved = new EventEmitter<TicketType>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly ticketsService = inject(TicketsService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** true when rendered as a routed page (not as a modal @Input component) */
  readonly isPageMode = signal(false);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isLoadingTicket = signal(false);

  ticketForm: FormGroup = this.initForm();

  get remainingCapacity(): number | null {
    if (this.venueCapacity === null) return null;
    const myCurrentStock = this.ticket ? Number(this.ticket.stock || 0) : 0;
    return Math.max(0, this.venueCapacity - this.usedStock + myCurrentStock);
  }

  ngOnInit(): void {
    // Page-mode: read eventId and optional tid from route params
    const routeEventId = this.route.snapshot.paramMap.get('id');
    const routeTid = this.route.snapshot.paramMap.get('tid');

    if (routeEventId && !this.eventId) {
      this.eventId = routeEventId;
      this.isPageMode.set(true);

      if (routeTid) {
        // Edit mode: load existing ticket type
        this.isLoadingTicket.set(true);
        this.ticketsService.getTicketTypeById(routeTid).then((tt) => {
          this.ticket = tt;
          this.populateForm();
          this.isLoadingTicket.set(false);
        }).catch(() => {
          this.errorMessage.set('No se pudo cargar el tipo de boleto.');
          this.isLoadingTicket.set(false);
        });
      } else {
        this.populateForm();
      }
    } else {
      this.populateForm();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ticket'] && !changes['ticket'].firstChange) {
      this.populateForm();
    }
    if (changes['venueCapacity'] || changes['usedStock'] || changes['ticket']) {
      this.updateStockValidator();
    }
  }

  private updateStockValidator(): void {
    const maxStock = this.remainingCapacity;
    const stockControl = this.ticketForm?.get('stock');
    if (!stockControl) return;

    const validators = [Validators.required, Validators.min(1)];
    if (maxStock !== null && maxStock >= 0) {
      validators.push(Validators.max(maxStock));
    }
    stockControl.setValidators(validators);
    stockControl.updateValueAndValidity();
  }


  private initForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      sku: ['', [Validators.required, Validators.maxLength(50)]],
      price: [null, [Validators.required, Validators.min(0)]],
      stock: [null, [Validators.required, Validators.min(1)]],
      description: [''],
      is_active: [true],
    });
  }

  private populateForm(): void {
    if (this.ticket) {
      this.ticketForm.patchValue({
        name: this.ticket.name,
        sku: this.ticket.sku,
        price: this.ticket.price,
        stock: this.ticket.stock,
        description: this.ticket.description || '',
        is_active: this.ticket.is_active,
      });
    } else {
      this.ticketForm.reset({
        name: '',
        sku: '',
        price: null,
        stock: null,
        description: '',
        is_active: true,
      });
    }
  }

  onNameChange(): void {
    if (!this.ticket && !this.ticketForm.get('sku')?.dirty) {
      const name = this.ticketForm.get('name')?.value || '';
      if (name.length >= 3) {
        this.ticketForm.patchValue({
          sku: this.ticketsService.suggestSku(name),
        });
      }
    }
  }

  autoSuggestSku(): void {
    const name = this.ticketForm.get('name')?.value || 'TCK';
    this.ticketForm.patchValue({
      sku: this.ticketsService.suggestSku(name),
    });
    this.ticketForm.get('sku')?.markAsDirty();
  }

  getCommission() {
    const price = Number(this.ticketForm.get('price')?.value) || 0;
    return this.ticketsService.calculateCommission(price);
  }

  onCancel(): void {
    if (this.isPageMode()) {
      this.router.navigate(['/events', this.eventId, 'tickets']);
    } else {
      this.cancelled.emit();
    }
  }

  async onSubmit(): Promise<void> {
    if (this.ticketForm.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const val = this.ticketForm.value;
    const userId = this.authService.user()?.id;

    try {
      if (this.ticket) {
        const updated = await this.ticketsService.updateTicketType(
          this.ticket.id,
          {
            event_id: this.eventId,
            name: val.name,
            sku: val.sku,
            price: Number(val.price),
            stock: Number(val.stock),
            description: val.description || null,
            is_active: Boolean(val.is_active),
          },
          userId
        );
        if (this.isPageMode()) {
          this.router.navigate(['/events', this.eventId, 'tickets']);
        } else {
          this.saved.emit(updated);
        }
      } else {
        const created = await this.ticketsService.createTicketType(
          {
            event_id: this.eventId,
            name: val.name,
            sku: val.sku,
            price: Number(val.price),
            stock: Number(val.stock),
            description: val.description || null,
            is_active: Boolean(val.is_active),
          },
          userId
        );
        if (this.isPageMode()) {
          this.router.navigate(['/events', this.eventId, 'tickets']);
        } else {
          this.saved.emit(created);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el tipo de boleto';
      this.errorMessage.set(msg);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
