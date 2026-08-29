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
import { VenuesService } from '../venues.service';
import { AuthService } from '@ticketflow/data-access';
import type { VenueConfiguration } from '@ticketflow/models';
import {
  ButtonComponent,
  SpinnerComponent,
} from '@ticketflow/shared-ui';

@Component({
  selector: 'app-venue-config-form',
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
              {{ config ? 'Editar Configuración de Aforo' : 'Nueva Configuración de Aforo' }}
            </h3>
            <p class="text-xs text-dark/60 mt-0.5">
              Define la capacidad y distribución de los asistentes para este recinto.
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

        <!-- Body -->
        <form [formGroup]="configForm" (ngSubmit)="onSubmit()" class="p-6 space-y-5">
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
            <label class="block text-xs font-semibold text-dark uppercase tracking-wider mb-1.5">
              Nombre de la configuración *
            </label>
            <input
              type="text"
              formControlName="name"
              placeholder="Ej. General de Pie, Aforo Completo, Modo Teatro"
              class="w-full px-4 py-2.5 rounded-xl border border-dark/20 bg-surface text-dark placeholder-dark/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
            />
            <p
              *ngIf="configForm.get('name')?.touched && configForm.get('name')?.invalid"
              class="text-xs text-contrast mt-1"
            >
              El nombre es obligatorio.
            </p>
          </div>

          <!-- Capacity -->
          <div>
            <label class="block text-xs font-semibold text-dark uppercase tracking-wider mb-1.5">
              Capacidad máxima (personas) *
            </label>
            <input
              type="number"
              min="1"
              step="1"
              formControlName="capacity"
              placeholder="Ej. 1500"
              class="w-full px-4 py-2.5 rounded-xl border border-dark/20 bg-surface text-dark placeholder-dark/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
            />
            <p
              *ngIf="configForm.get('capacity')?.touched && configForm.get('capacity')?.invalid"
              class="text-xs text-contrast mt-1"
            >
              Ingresa una capacidad válida (mínimo 1 persona).
            </p>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-xs font-semibold text-dark uppercase tracking-wider mb-1.5">
              Descripción o Detalles (opcional)
            </label>
            <textarea
              formControlName="description"
              rows="3"
              placeholder="Ej. Todo el aforo en planta baja de pie, sin gradas laterales..."
              class="w-full px-4 py-2.5 rounded-xl border border-dark/20 bg-surface text-dark placeholder-dark/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all resize-none"
            ></textarea>
          </div>

          <!-- Default Checkbox -->
          <div class="flex items-center gap-3 p-3.5 rounded-xl bg-dark/5 border border-dark/10">
            <input
              type="checkbox"
              id="is_default"
              formControlName="is_default"
              class="w-4 h-4 rounded text-primary focus:ring-primary border-dark/30 cursor-pointer"
            />
            <label for="is_default" class="text-xs font-medium text-dark cursor-pointer select-none">
              Marcar como configuración predeterminada de esta sede
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
              [disabled]="configForm.invalid || isSubmitting()"
            >
              <span *ngIf="!isSubmitting()">{{ config ? 'Guardar Cambios' : 'Crear Configuración' }}</span>
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
export class VenueConfigFormComponent implements OnInit, OnChanges {
  @Input({ required: true }) venueId!: string;
  @Input() config: VenueConfiguration | null = null;

  @Output() saved = new EventEmitter<VenueConfiguration>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly venuesService = inject(VenuesService);
  private readonly authService = inject(AuthService);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  configForm: FormGroup = this.initForm();

  ngOnInit(): void {
    this.populateForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && !changes['config'].firstChange) {
      this.populateForm();
    }
  }

  private initForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      capacity: [null, [Validators.required, Validators.min(1)]],
      description: [''],
      is_default: [false],
    });
  }

  private populateForm(): void {
    if (this.config) {
      this.configForm.patchValue({
        name: this.config.name,
        capacity: this.config.capacity,
        description: this.config.description || '',
        is_default: this.config.is_default || false,
      });
    } else {
      this.configForm.reset({
        name: '',
        capacity: null,
        description: '',
        is_default: false,
      });
    }
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  async onSubmit(): Promise<void> {
    if (this.configForm.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const val = this.configForm.value;
    const userId = this.authService.user()?.id;

    try {
      if (this.config) {
        const updated = await this.venuesService.updateConfiguration(
          this.config.id,
          {
            venue_id: this.venueId,
            name: val.name,
            capacity: Number(val.capacity),
            description: val.description || null,
            is_default: Boolean(val.is_default),
          },
          userId
        );
        this.saved.emit(updated);
      } else {
        const created = await this.venuesService.createConfiguration(
          {
            venue_id: this.venueId,
            name: val.name,
            capacity: Number(val.capacity),
            description: val.description || null,
            is_default: Boolean(val.is_default),
          },
          userId
        );
        this.saved.emit(created);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la configuración';
      this.errorMessage.set(msg);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
