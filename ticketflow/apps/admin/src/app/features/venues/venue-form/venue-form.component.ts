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
import { VenuesService, UpsertVenueDto } from '../venues.service';
import { AuthService } from '@ticketflow/data-access';
import { MapPickerComponent, MapCoordinates } from '../map-picker/map-picker.component';
import {
  ButtonComponent,
  CardComponent,
  FileUploadComponent,
  SpinnerComponent,
} from '@ticketflow/shared-ui';

interface CityPreset {
  name: string;
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-venue-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MapPickerComponent,
    ButtonComponent,
    CardComponent,
    FileUploadComponent,
    SpinnerComponent,
  ],
  template: `
    <div class="max-w-4xl mx-auto space-y-6">
      <!-- Breadcrumb & Header -->
      <div>
        <nav class="flex items-center gap-2 text-xs text-dark/60 mb-2">
          <a routerLink="/venues" class="hover:text-primary transition-colors flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Sedes
          </a>
          <span>/</span>
          <span class="text-dark font-semibold">
            {{ isEditMode() ? 'Editar Sede' : 'Nueva Sede' }}
          </span>
        </nav>

        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl sm:text-3xl font-extrabold text-dark tracking-tight">
              {{ isEditMode() ? 'Editar Sede' : 'Registrar Nueva Sede' }}
            </h1>
            <p class="text-sm text-dark/60 mt-1">
              {{ isEditMode()
                ? 'Actualiza los datos del recinto y mapa de distribución.'
                : 'Registra un recinto para programar tus eventos y aforos.' }}
            </p>
          </div>

          <a *ngIf="isEditMode() && venueId" [routerLink]="['/venues', venueId]">
            <tf-button variant="secondary" size="sm">
              Ver Detalle
            </tf-button>
          </a>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="py-20 flex flex-col items-center justify-center gap-3">
        <tf-spinner size="lg" color="primary"></tf-spinner>
        <p class="text-sm text-dark/60">Cargando datos de la sede...</p>
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

      <!-- Form -->
      <form *ngIf="!isLoading()" [formGroup]="venueForm" (ngSubmit)="onSubmit()" class="space-y-6">
        <!-- Basic Info Card -->
        <tf-card title="Información Principal" subtitle="Nombre y datos de identificación del recinto">
          <div class="space-y-5">
            <!-- Name -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-dark mb-1.5">
                Nombre de la Sede o Recinto *
              </label>
              <input
                type="text"
                formControlName="name"
                placeholder="Ej. Pepsi Center WTC, Foro Sol, Auditorio Telmex..."
                class="w-full px-4 py-2.5 rounded-xl border border-dark/20 bg-surface text-dark placeholder-dark/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
              />
              <p
                *ngIf="venueForm.get('name')?.touched && venueForm.get('name')?.invalid"
                class="text-xs text-contrast mt-1"
              >
                El nombre de la sede es obligatorio.
              </p>
            </div>

            <!-- Verified Toggle (Only shown for privileged users or when editing) -->
            <div *ngIf="canManageVerification()" class="flex items-center gap-3 p-3.5 rounded-xl bg-primary/10 border border-primary/20">
              <input
                type="checkbox"
                id="verified"
                formControlName="verified"
                class="w-4 h-4 rounded text-primary focus:ring-primary border-dark/30 cursor-pointer"
              />
              <label for="verified" class="text-xs font-semibold text-dark cursor-pointer select-none">
                Sede Verificada (Oficial)
              </label>
            </div>
          </div>
        </tf-card>

        <!-- Location Card -->
        <tf-card title="Ubicación Geográfica" subtitle="Haz clic en el mapa para seleccionar la ubicación del recinto">
          <div class="space-y-4">
            <!-- Quick City Presets -->
            <div>
              <p class="text-xs font-semibold text-dark/70 mb-2">Accesos directos por ciudad:</p>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  *ngFor="let city of cityPresets"
                  (click)="applyPreset(city)"
                  class="px-2.5 py-1 rounded-lg text-xs font-medium bg-dark/5 text-dark/80 hover:bg-primary/20 hover:text-dark border border-dark/10 transition-colors"
                >
                  📍 {{ city.name }}
                </button>
              </div>
            </div>

            <!-- Interactive Map Picker (Leaflet + OpenStreetMap) -->
            <admin-map-picker
              [lat]="venueForm.get('latitude')?.value"
              [lng]="venueForm.get('longitude')?.value"
              (coordinatesChanged)="onMapCoordinatesChanged($event)"
            ></admin-map-picker>
          </div>
        </tf-card>

        <!-- Floor Plan / Map Upload Card -->
        <tf-card title="Croquis / Plano del Recinto" subtitle="Sube una imagen con la distribución de zonas o asientos">
          <div class="space-y-4">
            <tf-file-upload
              label="Subir croquis de la sede"
              hint="Formatos recomendados: PNG, JPG, WEBP o PDF (Máx. 10MB)"
              accept="image/*,application/pdf"
              [maxSizeMb]="10"
              [previewUrl]="previewMapUrl()"
              (fileSelected)="onMapFileSelected($event)"
            ></tf-file-upload>

            <div *ngIf="previewMapUrl()" class="flex items-center justify-between text-xs text-dark/60 px-1">
              <span>Croquis listo para guardar</span>
              <button
                type="button"
                (click)="removeMap()"
                class="text-contrast hover:underline font-semibold"
              >
                Eliminar croquis
              </button>
            </div>
          </div>
        </tf-card>

        <!-- Action Buttons -->
        <div class="flex items-center justify-between pt-4 border-t border-dark/10">
          <a routerLink="/venues">
            <tf-button type="button" variant="secondary" size="md" [disabled]="isSubmitting()">
              Cancelar
            </tf-button>
          </a>

          <tf-button
            type="submit"
            variant="primary"
            size="md"
            [disabled]="venueForm.invalid || isSubmitting()"
          >
            <span *ngIf="!isSubmitting()">{{ isEditMode() ? 'Guardar Cambios' : 'Registrar Sede' }}</span>
            <span *ngIf="isSubmitting()" class="flex items-center gap-2">
              <tf-spinner size="sm" color="dark"></tf-spinner>
              <span>Guardando...</span>
            </span>
          </tf-button>
        </div>
      </form>
    </div>
  `,
})
export class VenueFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly venuesService = inject(VenuesService);
  private readonly authService = inject(AuthService);

  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isEditMode = signal(false);
  readonly previewMapUrl = signal<string | null>(null);

  venueId: string | null = null;
  selectedMapFile: File | null = null;

  readonly cityPresets: CityPreset[] = [
    { name: 'CDMX (Centro)', lat: 19.4326, lng: -99.1332 },
    { name: 'Guadalajara', lat: 20.6597, lng: -103.3496 },
    { name: 'Monterrey', lat: 25.6866, lng: -100.3161 },
    { name: 'Puebla', lat: 19.0414, lng: -98.2063 },
    { name: 'Querétaro', lat: 20.5888, lng: -100.3899 },
    { name: 'Tijuana', lat: 32.5149, lng: -117.0382 },
    { name: 'Cancún', lat: 21.1619, lng: -86.8515 },
  ];

  venueForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    latitude: [null],
    longitude: [null],
    verified: [false],
  });

  get googleMapsUrl(): string {
    const lat = this.venueForm.get('latitude')?.value;
    const lng = this.venueForm.get('longitude')?.value;
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }

  hasCoordinates(): boolean {
    const lat = this.venueForm.get('latitude')?.value;
    const lng = this.venueForm.get('longitude')?.value;
    return lat !== null && lng !== null && lat !== '' && lng !== '';
  }

  canManageVerification(): boolean {
    return this.authService.isAdmin();
  }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.venueId = id;
      this.isEditMode.set(true);
      await this.loadVenue(id);
    }
  }

  private async loadVenue(id: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const venue = await this.venuesService.getVenue(id);
      if (!venue) {
        this.errorMessage.set('La sede solicitada no fue encontrada.');
        return;
      }

      this.venueForm.patchValue({
        name: venue.name,
        latitude: venue.latitude,
        longitude: venue.longitude,
        verified: venue.verified,
      });

      if (venue.map_url) {
        this.previewMapUrl.set(venue.map_url);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar la sede';
      this.errorMessage.set(msg);
    } finally {
      this.isLoading.set(false);
    }
  }

  applyPreset(preset: CityPreset): void {
    this.venueForm.patchValue({
      latitude: preset.lat,
      longitude: preset.lng,
    });
    this.venueForm.markAsDirty();
  }

  /** Receives coordinates from the MapPickerComponent and patches the form. */
  onMapCoordinatesChanged(coords: MapCoordinates): void {
    this.venueForm.patchValue({
      latitude:  coords.lat,
      longitude: coords.lng,
    });
    this.venueForm.markAsDirty();
  }

  onMapFileSelected(file: File): void {
    this.selectedMapFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.previewMapUrl.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  removeMap(): void {
    this.selectedMapFile = null;
    this.previewMapUrl.set(null);
  }

  async onSubmit(): Promise<void> {
    if (this.venueForm.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const val = this.venueForm.value;
    const userId = this.authService.user()?.id;

    const dto: UpsertVenueDto = {
      name: val.name,
      latitude: val.latitude !== null && val.latitude !== '' ? Number(val.latitude) : null,
      longitude: val.longitude !== null && val.longitude !== '' ? Number(val.longitude) : null,
      map_url: this.previewMapUrl(),
      verified: Boolean(val.verified),
    };

    try {
      if (this.isEditMode() && this.venueId) {
        const updated = await this.venuesService.updateVenue(
          this.venueId,
          dto,
          this.selectedMapFile || undefined,
          userId
        );
        this.router.navigate(['/venues', updated.id]);
      } else {
        const created = await this.venuesService.createVenue(
          dto,
          this.selectedMapFile || undefined,
          userId
        );
        this.router.navigate(['/venues', created.id]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la sede';
      this.errorMessage.set(msg);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
