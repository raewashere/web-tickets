import {
  Component,
  OnInit,
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
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EventsService, UpsertEventDto } from '../events.service';
import { ArtistsService } from '../../artists/artists.service';
import { AuthService } from '@ticketflow/data-access';
import { VenuePickerComponent } from '../../venues/venue-picker/venue-picker.component';
import type {
  EventType,
  EventStatus,
  VenueWithConfigurations,
  VenueConfiguration,
} from '@ticketflow/models';
import {
  ButtonComponent,
  CardComponent,
  FileUploadComponent,
  SpinnerComponent,
} from '@ticketflow/shared-ui';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ButtonComponent,
    CardComponent,
    FileUploadComponent,
    SpinnerComponent,
    VenuePickerComponent,
  ],
  template: `
    <div class="max-w-4xl mx-auto space-y-6">
      <!-- Breadcrumb & Header -->
      <div>
        <nav class="flex items-center gap-2 text-xs text-dark/60 mb-2">
          <a routerLink="/events" class="hover:text-primary transition-colors flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Eventos
          </a>
          <span>/</span>
          <span class="text-dark font-semibold">
            {{ isEditMode() ? 'Editar Evento' : 'Crear Nuevo Evento' }}
          </span>
        </nav>

        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl sm:text-3xl font-extrabold text-dark tracking-tight">
              {{ isEditMode() ? 'Editar Evento' : 'Crear Nuevo Evento' }}
            </h1>
            <p class="text-sm text-dark/60 mt-1">
              Configura los detalles del show, fecha, sede y afiche promocional.
            </p>
          </div>

          <a *ngIf="isEditMode() && eventId" [routerLink]="['/events', eventId]">
            <tf-button variant="secondary" size="sm">
              Ver Detalle
            </tf-button>
          </a>
        </div>
      </div>

      <!-- Missing Artist Profile Alert -->
      <div
        *ngIf="!isLoading() && !artistId"
        class="p-5 rounded-2xl bg-accent/20 border border-accent/40 text-dark space-y-2"
      >
        <div class="flex items-center gap-2 font-bold text-sm">
          <span>⚠️</span>
          <span>Perfil de artista requerido</span>
        </div>
        <p class="text-xs text-dark/80">
          Debes completar tu perfil de artista antes de poder registrar y publicar eventos.
        </p>
        <a routerLink="/artist/profile" class="inline-block mt-2">
          <tf-button variant="primary" size="sm">
            Completar Perfil de Artista
          </tf-button>
        </a>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="py-24 flex flex-col items-center justify-center gap-3">
        <tf-spinner size="lg" color="primary"></tf-spinner>
        <p class="text-sm text-dark/60">Cargando datos del evento...</p>
      </div>

      <!-- Error alert -->
      <div
        *ngIf="errorMessage()"
        class="p-4 rounded-xl bg-contrast/10 border border-contrast/30 text-contrast text-sm flex items-center gap-3"
      >
        <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <span>{{ errorMessage() }}</span>
      </div>

      <!-- Event Form -->
      <form *ngIf="!isLoading() && artistId" [formGroup]="eventForm" class="space-y-6">
        <!-- 1. Main Info Card -->
        <tf-card title="Información General" subtitle="Nombre del show y tipo de espectáculo">
          <div class="space-y-5">
            <!-- Event Name -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-dark mb-1.5">
                Nombre del Evento / Concierto *
              </label>
              <input
                type="text"
                formControlName="name"
                placeholder="Ej. Tour Eclipse 2026 - Presentación Oficial"
                class="w-full px-4 py-2.5 rounded-xl border border-dark/20 bg-surface text-dark placeholder-dark/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
              />
              <p
                *ngIf="eventForm.get('name')?.touched && eventForm.get('name')?.invalid"
                class="text-xs text-contrast mt-1"
              >
                El nombre del evento es obligatorio (máximo 200 caracteres).
              </p>
            </div>

            <!-- Event Type Selection -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-dark mb-1.5">
                Tipo de Espectáculo / Género *
              </label>
              <select
                formControlName="event_type_id"
                class="w-full px-4 py-2.5 rounded-xl border border-dark/20 bg-surface text-dark focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
              >
                <option [ngValue]="null" disabled>Selecciona un tipo de evento...</option>
                <option *ngFor="let type of eventTypes()" [value]="type.id">
                  {{ type.name }}
                </option>
              </select>
              <p
                *ngIf="eventForm.get('event_type_id')?.touched && eventForm.get('event_type_id')?.invalid"
                class="text-xs text-contrast mt-1"
              >
                Selecciona una categoría para el evento.
              </p>
            </div>

            <!-- Description -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-dark mb-1.5">
                Descripción / Sinopsis del Evento
              </label>
              <textarea
                formControlName="description"
                rows="4"
                placeholder="Detalla de qué tratará el show, invitados especiales, restricciones de edad, etc."
                class="w-full px-4 py-2.5 rounded-xl border border-dark/20 bg-surface text-dark placeholder-dark/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all resize-none"
              ></textarea>
            </div>
          </div>
        </tf-card>

        <!-- 2. Dates & Schedule Card -->
        <tf-card title="Fechas y Horarios" subtitle="Cuándo se llevará a cabo el espectáculo y duración estimada">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <!-- Event Date & Time -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-dark mb-1.5">
                Fecha y Hora de Inicio *
              </label>
              <input
                type="datetime-local"
                formControlName="event_date"
                class="w-full px-4 py-2.5 rounded-xl border border-dark/20 bg-surface text-dark focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
              />
              <p
                *ngIf="eventForm.get('event_date')?.touched && eventForm.get('event_date')?.invalid"
                class="text-xs text-contrast mt-1"
              >
                La fecha y hora del show son obligatorias.
              </p>
            </div>

            <!-- Doors Open Time -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-dark mb-1.5">
                Apertura de Puertas
              </label>
              <input
                type="datetime-local"
                formControlName="doors_open"
                class="w-full px-4 py-2.5 rounded-xl border border-dark/20 bg-surface text-dark focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
              />
              <p class="text-xs text-dark/50 mt-1">
                Opcional: horario de apertura de acceso.
              </p>
            </div>

            <!-- Estimated Duration -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-dark mb-1.5">
                Duración Estimada *
              </label>
              <input
                type="number"
                min="15"
                max="1440"
                step="15"
                formControlName="duration_minutes"
                placeholder="120"
                class="w-full px-4 py-2.5 rounded-xl border border-dark/20 bg-surface text-dark focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all font-mono"
              />
              <div class="flex items-center gap-1 mt-2 flex-wrap">
                <button
                  type="button"
                  *ngFor="let mins of durationPresets"
                  (click)="eventForm.patchValue({ duration_minutes: mins })"
                  [class.bg-primary]="eventForm.get('duration_minutes')?.value === mins"
                  [class.text-dark]="eventForm.get('duration_minutes')?.value === mins"
                  [class.bg-dark/5]="eventForm.get('duration_minutes')?.value !== mins"
                  [class.text-dark/70]="eventForm.get('duration_minutes')?.value !== mins"
                  class="px-2 py-0.5 rounded-md text-[10px] font-bold transition hover:bg-primary/50"
                >
                  {{ mins < 60 ? mins + 'm' : (mins / 60) + 'h' }}
                </button>
              </div>
              <p class="text-[10px] text-dark/50 mt-1">
                Cierra compras y expira la vigencia del QR.
              </p>
            </div>
          </div>
        </tf-card>

        <!-- 3. Venue & Configuration Picker -->
        <tf-card title="Recinto y Aforo" subtitle="Selecciona la sede y la distribución de capacidad">
          <app-venue-picker
            [selectedVenueId]="eventForm.get('venue_id')?.value"
            [selectedConfigId]="eventForm.get('venue_configuration_id')?.value"
            (venueSelected)="onVenueSelected($event)"
            (configSelected)="onConfigSelected($event)"
            (venueCleared)="onVenueCleared()"
          ></app-venue-picker>

          <p
            *ngIf="(eventForm.get('venue_id')?.touched || eventForm.get('venue_configuration_id')?.touched) && (eventForm.get('venue_id')?.invalid || eventForm.get('venue_configuration_id')?.invalid)"
            class="text-xs text-contrast mt-2"
          >
            Debes seleccionar una sede y una configuración de aforo para continuar.
          </p>
        </tf-card>

        <!-- 4. Flyer Upload -->
        <tf-card title="Afiche / Flyer del Evento" subtitle="Imagen oficial para la cartelera y venta de boletos">
          <div class="space-y-4">
            <tf-file-upload
              label="Subir flyer del evento"
              hint="Formatos: JPG, PNG o WEBP (Recomendado 1080x1350px vertical, Máx. 10MB)"
              accept="image/*"
              [maxSizeMb]="10"
              [previewUrl]="previewFlyerUrl()"
              (fileSelected)="onFlyerSelected($event)"
            ></tf-file-upload>

            <div *ngIf="previewFlyerUrl()" class="flex items-center justify-between text-xs text-dark/60 px-1">
              <span>Flyer seleccionado</span>
              <button
                type="button"
                (click)="removeFlyer()"
                class="text-contrast hover:underline font-semibold"
              >
                Eliminar afiche
              </button>
            </div>
          </div>
        </tf-card>

        <!-- 5. Shared / Co-headline Toggle -->
        <tf-card title="Opciones Adicionales">
          <div class="flex items-center gap-3 p-3.5 rounded-xl bg-dark/5 border border-dark/10">
            <input
              type="checkbox"
              id="shared"
              formControlName="shared"
              class="w-4 h-4 rounded text-primary focus:ring-primary border-dark/20"
            />
            <label for="shared" class="text-xs text-dark select-none cursor-pointer">
              <span class="font-bold">Permitir co-producción o show compartido</span>
              <span class="block text-dark/60">Otros organizadores podrán vincular fechas adicionales con este artista.</span>
            </label>
          </div>
        </tf-card>

        <!-- Form Actions Bar -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-surface border border-dark/10 shadow-sm">
          <a routerLink="/events" class="w-full sm:w-auto">
            <tf-button type="button" variant="secondary" size="md" class="w-full sm:w-auto">
              Cancelar
            </tf-button>
          </a>

          <div class="flex items-center gap-3 w-full sm:w-auto">
            <!-- Save as Draft -->
            <tf-button
              type="button"
              variant="ghost"
              size="md"
              (click)="saveEvent('draft')"
              [disabled]="eventForm.invalid || isSubmitting()"
            >
              <span *ngIf="!isSubmitting()">Guardar como Borrador</span>
              <span *ngIf="isSubmitting()" class="flex items-center gap-2">
                <tf-spinner size="sm" color="dark"></tf-spinner>
                <span>Guardando...</span>
              </span>
            </tf-button>

            <!-- Save and Publish -->
            <tf-button
              type="button"
              variant="accent"
              size="md"
              (click)="saveEvent('published')"
              [disabled]="eventForm.invalid || isSubmitting()"
            >
              <span>🚀 {{ isEditMode() ? 'Guardar y Publicar' : 'Publicar Evento' }}</span>
            </tf-button>
          </div>
        </div>
      </form>
    </div>
  `,
})
export class EventFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventsService = inject(EventsService);
  private readonly artistsService = inject(ArtistsService);
  private readonly authService = inject(AuthService);

  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isEditMode = signal(false);
  readonly previewFlyerUrl = signal<string | null>(null);

  readonly eventTypes = signal<EventType[]>([]);
  readonly durationPresets = [60, 90, 120, 180, 240];
  artistId: string | null = null;
  eventId: string | null = null;
  selectedFlyerFile: File | null = null;

  eventForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
    event_type_id: [null, [Validators.required]],
    venue_id: [null, [Validators.required]],
    venue_configuration_id: [null, [Validators.required]],
    event_date: ['', [Validators.required]],
    doors_open: [''],
    duration_minutes: [120, [Validators.required, Validators.min(15), Validators.max(1440)]],
    shared: [false],
  });

  async ngOnInit(): Promise<void> {
    await this.initData();
  }

  private async initData(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      // 1. Fetch current artist profile
      const user = this.authService.user();
      if (user) {
        const profile = await this.artistsService.getMyArtistProfile(user.id);
        if (profile) {
          this.artistId = profile.id;
        }
      }

      // 2. Fetch event types catalogue
      const types = await this.eventsService.getEventTypes();
      this.eventTypes.set(types);

      // 3. If edit mode, load existing event
      const id = this.route.snapshot.paramMap.get('id');
      if (id && id !== 'new') {
        this.eventId = id;
        this.isEditMode.set(true);
        await this.loadEvent(id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al inicializar formulario';
      this.errorMessage.set(msg);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadEvent(id: string): Promise<void> {
    const event = await this.eventsService.getEvent(id);
    if (!event) {
      this.errorMessage.set('El evento no fue encontrado.');
      return;
    }

    this.artistId = event.artist_id;
    this.eventForm.patchValue({
      name: event.name,
      description: event.description || '',
      event_type_id: event.event_type_id,
      venue_id: event.venue_id,
      venue_configuration_id: event.venue_configuration_id,
      event_date: event.event_date ? this.formatDatetimeForInput(event.event_date) : '',
      doors_open: event.doors_open ? this.formatDatetimeForInput(event.doors_open) : '',
      duration_minutes: event.duration_minutes || 120,
      shared: event.shared,
    });

    if (event.flyer_url) {
      this.previewFlyerUrl.set(event.flyer_url);
    }
  }

  private formatDatetimeForInput(dateStr: string): string {
    const d = new Date(dateStr);
    const pad = (n: number) => String(n).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  onVenueSelected(venue: VenueWithConfigurations): void {
    this.eventForm.patchValue({ venue_id: venue.id });
    this.eventForm.get('venue_id')?.markAsDirty();
  }

  onConfigSelected(config: VenueConfiguration): void {
    this.eventForm.patchValue({ venue_configuration_id: config.id });
    this.eventForm.get('venue_configuration_id')?.markAsDirty();
  }

  onVenueCleared(): void {
    this.eventForm.patchValue({
      venue_id: null,
      venue_configuration_id: null,
    });
  }

  onFlyerSelected(file: File): void {
    this.selectedFlyerFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.previewFlyerUrl.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  removeFlyer(): void {
    this.selectedFlyerFile = null;
    this.previewFlyerUrl.set(null);
  }

  async saveEvent(targetStatus: EventStatus): Promise<void> {
    if (this.eventForm.invalid || this.isSubmitting() || !this.artistId) {
      this.eventForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const val = this.eventForm.value;
    const userId = this.authService.user()?.id;

    const dto: UpsertEventDto = {
      artist_id: this.artistId,
      name: val.name,
      description: val.description || null,
      event_type_id: val.event_type_id,
      venue_id: val.venue_id,
      venue_configuration_id: val.venue_configuration_id,
      event_date: new Date(val.event_date).toISOString(),
      doors_open: val.doors_open ? new Date(val.doors_open).toISOString() : null,
      duration_minutes: val.duration_minutes ? Number(val.duration_minutes) : 120,
      shared: Boolean(val.shared),
      status: targetStatus,
      flyer_url: this.previewFlyerUrl(),
    };

    try {
      if (this.isEditMode() && this.eventId) {
        const updated = await this.eventsService.updateEvent(
          this.eventId,
          dto,
          this.selectedFlyerFile || undefined,
          userId
        );
        this.router.navigate(['/events', updated.id]);
      } else {
        const created = await this.eventsService.createEvent(
          dto,
          this.selectedFlyerFile || undefined,
          userId
        );
        this.router.navigate(['/events', created.id]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el evento';
      this.errorMessage.set(msg);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
