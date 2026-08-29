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
import { TicketsService, UpsertCouponDto } from '../tickets.service';
import { AuthService } from '@ticketflow/data-access';
import type { Coupon, CouponType } from '@ticketflow/models';
import {
  ButtonComponent,
  SpinnerComponent,
} from '@ticketflow/shared-ui';

@Component({
  selector: 'app-coupon-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    SpinnerComponent,
  ],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/60 backdrop-blur-sm">
      <div class="bg-surface rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-dark/10">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-dark/10 bg-surface">
          <div>
            <h3 class="text-lg font-bold text-dark">
              {{ coupon ? 'Editar Cupón de Descuento' : 'Nuevo Cupón o Cortesía' }}
            </h3>
            <p class="text-xs text-dark/60 mt-0.5">
              Crea códigos promocionales porcentuales, fijos o pases 100% cortesía.
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

        <!-- Form Body -->
        <form [formGroup]="couponForm" (ngSubmit)="onSubmit()" class="p-6 space-y-4">
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

          <!-- Code -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-xs font-bold uppercase tracking-wider text-dark">
                Código Promocional *
              </label>
              <button
                type="button"
                (click)="autoGenerateCode()"
                class="text-xs text-primary hover:underline font-semibold"
              >
                🎲 Generar Código
              </button>
            </div>
            <input
              type="text"
              formControlName="code"
              placeholder="Ej. PRENSA-2026, VIP10, AMIGOS50"
              class="w-full px-4 py-2.5 rounded-xl border border-dark/20 bg-surface text-dark uppercase font-mono placeholder-dark/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
            />
            <p
              *ngIf="couponForm.get('code')?.touched && couponForm.get('code')?.invalid"
              class="text-xs text-contrast mt-1"
            >
              El código es obligatorio (mínimo 3 caracteres).
            </p>
          </div>

          <!-- Type & Value Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Coupon Type -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-dark mb-1.5">
                Tipo de Descuento *
              </label>
              <select
                formControlName="type"
                (change)="onTypeChange()"
                class="w-full px-4 py-2.5 rounded-xl border border-dark/20 bg-surface text-dark focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
              >
                <option value="percentage">Porcentaje (%)</option>
                <option value="fixed">Monto Fijo ($ MXN)</option>
                <option value="courtesy">Cortesía Total (100%)</option>
              </select>
            </div>

            <!-- Value (conditional) -->
            <div *ngIf="couponForm.get('type')?.value !== 'courtesy'">
              <label class="block text-xs font-bold uppercase tracking-wider text-dark mb-1.5">
                {{ couponForm.get('type')?.value === 'percentage' ? 'Porcentaje (%) *' : 'Monto Fijo ($ MXN) *' }}
              </label>
              <input
                type="number"
                min="1"
                [max]="couponForm.get('type')?.value === 'percentage' ? 100 : 999999"
                step="any"
                formControlName="value"
                [placeholder]="couponForm.get('type')?.value === 'percentage' ? 'Ej. 25' : 'Ej. 150'"
                class="w-full px-4 py-2.5 rounded-xl border border-dark/20 bg-surface text-dark placeholder-dark/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
              />
            </div>
          </div>

          <!-- Max Uses -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-dark mb-1.5">
              Límite Máximo de Usos (dejar vacío para ilimitado)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              formControlName="max_uses"
              placeholder="Ilimitado"
              class="w-full px-4 py-2.5 rounded-xl border border-dark/20 bg-surface text-dark placeholder-dark/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
            />
          </div>

          <!-- Validity Dates -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Valid From -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-dark mb-1.5">
                Válido Desde *
              </label>
              <input
                type="datetime-local"
                formControlName="valid_from"
                class="w-full px-4 py-2 rounded-xl border border-dark/20 bg-surface text-dark focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-xs transition-all"
              />
            </div>

            <!-- Valid Until -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-dark mb-1.5">
                Válido Hasta (opcional)
              </label>
              <input
                type="datetime-local"
                formControlName="valid_until"
                class="w-full px-4 py-2 rounded-xl border border-dark/20 bg-surface text-dark focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-xs transition-all"
              />
            </div>
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
              Cupón activo y disponible para canjear en taquilla
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
              [disabled]="couponForm.invalid || isSubmitting()"
            >
              <span *ngIf="!isSubmitting()">{{ coupon ? 'Guardar Cambios' : 'Crear Cupón' }}</span>
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
export class CouponFormComponent implements OnInit, OnChanges {
  @Input({ required: true }) eventId!: string;
  @Input() coupon: Coupon | null = null;

  @Output() saved = new EventEmitter<Coupon>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly ticketsService = inject(TicketsService);
  private readonly authService = inject(AuthService);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  couponForm: FormGroup = this.initForm();

  ngOnInit(): void {
    this.populateForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['coupon'] && !changes['coupon'].firstChange) {
      this.populateForm();
    }
  }

  private initForm(): FormGroup {
    return this.fb.group({
      code: ['', [Validators.required, Validators.minLength(3)]],
      type: ['percentage', [Validators.required]],
      value: [10, [Validators.min(1)]],
      max_uses: [null],
      valid_from: [this.formatDatetime(new Date()), [Validators.required]],
      valid_until: [null],
      is_active: [true],
    });
  }

  private populateForm(): void {
    if (this.coupon) {
      this.couponForm.patchValue({
        code: this.coupon.code,
        type: this.coupon.type,
        value: this.coupon.value,
        max_uses: this.coupon.max_uses,
        valid_from: this.coupon.valid_from ? this.formatDatetime(new Date(this.coupon.valid_from)) : '',
        valid_until: this.coupon.valid_until ? this.formatDatetime(new Date(this.coupon.valid_until)) : '',
        is_active: this.coupon.is_active,
      });
    } else {
      this.couponForm.reset({
        code: this.ticketsService.generateRandomCode(),
        type: 'percentage',
        value: 15,
        max_uses: null,
        valid_from: this.formatDatetime(new Date()),
        valid_until: null,
        is_active: true,
      });
    }
  }

  onTypeChange(): void {
    const type = this.couponForm.get('type')?.value;
    if (type === 'courtesy') {
      this.couponForm.get('value')?.clearValidators();
      this.couponForm.get('value')?.setValue(null);
    } else if (type === 'percentage') {
      this.couponForm.get('value')?.setValidators([Validators.required, Validators.min(1), Validators.max(100)]);
      if (!this.couponForm.get('value')?.value) this.couponForm.get('value')?.setValue(10);
    } else {
      this.couponForm.get('value')?.setValidators([Validators.required, Validators.min(1)]);
      if (!this.couponForm.get('value')?.value) this.couponForm.get('value')?.setValue(50);
    }
    this.couponForm.get('value')?.updateValueAndValidity();
  }

  autoGenerateCode(): void {
    this.couponForm.patchValue({
      code: this.ticketsService.generateRandomCode(),
    });
  }

  private formatDatetime(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  async onSubmit(): Promise<void> {
    if (this.couponForm.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const val = this.couponForm.value;
    const userId = this.authService.user()?.id;

    try {
      if (this.coupon) {
        const updated = await this.ticketsService.updateCoupon(
          this.coupon.id,
          {
            event_id: this.eventId,
            code: val.code,
            type: val.type as CouponType,
            value: val.type === 'courtesy' ? null : Number(val.value),
            max_uses: val.max_uses ? Number(val.max_uses) : null,
            valid_from: new Date(val.valid_from).toISOString(),
            valid_until: val.valid_until ? new Date(val.valid_until).toISOString() : null,
            is_active: Boolean(val.is_active),
          },
          userId
        );
        this.saved.emit(updated);
      } else {
        const created = await this.ticketsService.createCoupon(
          {
            event_id: this.eventId,
            code: val.code,
            type: val.type as CouponType,
            value: val.type === 'courtesy' ? null : Number(val.value),
            max_uses: val.max_uses ? Number(val.max_uses) : null,
            valid_from: new Date(val.valid_from).toISOString(),
            valid_until: val.valid_until ? new Date(val.valid_until).toISOString() : null,
            is_active: Boolean(val.is_active),
          },
          userId
        );
        this.saved.emit(created);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el cupón';
      this.errorMessage.set(msg);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
