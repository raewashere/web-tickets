import {
  Component,
  Input,
  Output,
  EventEmitter,
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
import { ArtistsService, UpsertArtistDto } from '../artists.service';
import { AuthService } from '@ticketflow/data-access';
import type { Artist, ArtistType, ArtistWithType } from '@ticketflow/models';
import {
  ButtonComponent,
  CardComponent,
  InputComponent,
  FileUploadComponent,
  SpinnerComponent,
} from '@ticketflow/shared-ui';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-artist-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    CardComponent,
    InputComponent,
    FileUploadComponent,
    RouterModule,
  ],

  template: `
    <div class="space-y-6">
      <!-- Error notification -->
      <div
        *ngIf="errorMessage()"
        class="p-4 rounded-xl bg-contrast/10 border border-contrast/30 text-contrast text-sm flex items-center gap-3"
      >
        <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <span>{{ errorMessage() }}</span>
      </div>

      <form [formGroup]="artistForm" (ngSubmit)="onSubmit()" class="space-y-8">
        <!-- Basic Info Section -->
        <tf-card title="Información Pública del Artista" subtitle="Estos datos serán visibles para los compradores de entradas">
          <div class="space-y-6">
            <!-- Photo Upload -->
            <div>
              <label class="block text-sm font-medium text-dark mb-2">Foto / Portada del Artista</label>
              <tf-file-upload
                label="Subir foto del artista"
                hint="Formatos JPG, PNG o WEBP (máx. 5MB)"
                [previewUrl]="photoPreviewUrl() || artistForm.get('photo_url')?.value"
                (fileSelected)="onFileSelected($event)"
              ></tf-file-upload>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <tf-input
                  label="Nombre Artístico / Agrupación"
                  placeholder="Ej. Banda Los Astros"
                  formControlName="name"
                  [required]="true"
                  [error]="getNameError()"
                ></tf-input>
              </div>

              <div>
                <label class="block text-sm font-medium text-dark mb-1">
                  Tipo / Género de Artista
                  <span class="text-contrast ml-0.5">*</span>
                </label>
                <select
                  formControlName="artist_type_id"
                  class="w-full rounded-lg border border-dark/20 px-3 py-2 text-dark bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="" disabled>Selecciona un tipo...</option>
                  <option *ngFor="let type of artistTypes()" [value]="type.id">
                    {{ type.name }}
                  </option>
                </select>
                <p *ngIf="getArtistTypeError()" class="text-xs text-contrast mt-1">
                  {{ getArtistTypeError() }}
                </p>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-dark mb-1">Biografía / Descripción</label>
              <textarea
                formControlName="description"
                rows="4"
                placeholder="Escribe una breve reseña del artista o trayectoria..."
                class="w-full rounded-lg border border-dark/20 p-3 text-dark placeholder:text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              ></textarea>
            </div>
          </div>
        </tf-card>

        <!-- Gallery Photos Section -->
        <tf-card title="Galería de Fotos del Artista" subtitle="Sube múltiples fotos para mostrar en el perfil público del artista y detalle del evento">
          <div class="space-y-4">
            <!-- Multi photo input trigger -->
            <div
              class="border-2 border-dashed border-dark/20 rounded-2xl p-6 text-center hover:border-primary/50 transition-colors bg-white/50 cursor-pointer"
              (click)="galleryFileInput.click()"
            >
              <input
                #galleryFileInput
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                (change)="onGalleryFilesSelected($event)"
                class="hidden"
              />
              <div class="flex flex-col items-center justify-center gap-2">
                <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl">
                  <i class="fa-solid fa-camera"></i>
                </div>
                <div class="text-sm font-semibold text-dark">
                  Haz clic para añadir fotos a la galería
                </div>
                <p class="text-xs text-dark/50">
                  Formatos JPG, PNG, WEBP. Puedes seleccionar varias imágenes al mismo tiempo.
                </p>
              </div>
            </div>

            <!-- Existing and Pending Gallery Photos Grid -->
            <div *ngIf="existingGalleryUrls().length > 0 || pendingGalleryFiles().length > 0" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-2">
              <!-- Existing uploaded photos -->
              <div *ngFor="let url of existingGalleryUrls(); let i = index" class="relative group rounded-xl overflow-hidden aspect-square border border-dark/10 shadow-sm bg-dark/5">
                <img [src]="url" alt="Foto de galería" class="w-full h-full object-cover" />
                <button
                  type="button"
                  (click)="removeExistingGalleryPhoto(i)"
                  class="absolute top-2 right-2 w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center text-xs shadow hover:bg-red-700 transition"
                  title="Eliminar foto"
                >
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>

              <!-- Pending upload preview photos -->
              <div *ngFor="let preview of pendingPreviews(); let i = index" class="relative group rounded-xl overflow-hidden aspect-square border-2 border-primary/40 shadow-sm bg-primary/5">
                <img [src]="preview" alt="Nueva foto" class="w-full h-full object-cover" />
                <div class="absolute bottom-1 left-1 bg-primary text-dark text-[10px] font-bold px-1.5 py-0.5 rounded">
                  Nueva
                </div>
                <button
                  type="button"
                  (click)="removePendingGalleryFile(i)"
                  class="absolute top-2 right-2 w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center text-xs shadow hover:bg-red-700 transition"
                  title="Quitar"
                >
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>
          </div>
        </tf-card>

        <!-- Contact & Legal Section -->
        <tf-card title="Contacto y Facturación" subtitle="Información interna para contacto y liquidación de ventas">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <tf-input
                label="Correo de Contacto"
                type="email"
                placeholder="contacto@artista.com"
                formControlName="email"
                [required]="true"
                [error]="getEmailError()"
              ></tf-input>
            </div>

            <div>
              <tf-input
                label="Teléfono"
                type="tel"
                placeholder="+52 55 1234 5678"
                formControlName="phone_number"
              ></tf-input>
            </div>

            <div>
              <tf-input
                label="Razón Social / Nombre Legal"
                placeholder="Nombre o empresa para facturación"
                formControlName="legal_name"
              ></tf-input>
            </div>

            <div>
              <tf-input
                label="RFC / Identificación Fiscal"
                placeholder="Ej. ABC123456XYZ"
                formControlName="tax_id"
              ></tf-input>
            </div>

            <div>
              <tf-input
                label="Código Postal"
                placeholder="06700"
                formControlName="postal_code"
              ></tf-input>
            </div>
          </div>
        </tf-card>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-3 pt-2">
          <tf-button
            *ngIf="showCancel"
            type="button"
            variant="ghost"
            (onClick)="cancelled.emit()"
          >
            Cancelar
          </tf-button>

          <tf-button
            type="submit"
            variant="primary"
            size="lg"
            [loading]="isSaving()"
            [disabled]="artistForm.invalid || isSaving()"
          >
            {{ initialArtist ? 'Guardar Cambios' : 'Crear Perfil de Artista' }}
          </tf-button>
        </div>
      </form>
    </div>
  `,
})
export class ArtistFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly artistsService = inject(ArtistsService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  @Input() initialArtist?: ArtistWithType | null;
  @Input() showCancel = true;
  @Output() saved = new EventEmitter<Artist>();
  @Output() cancelled = new EventEmitter<void>();

  readonly artistTypes = signal<ArtistType[]>([]);
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly photoPreviewUrl = signal<string | null>(null);
  readonly existingGalleryUrls = signal<string[]>([]);
  readonly pendingGalleryFiles = signal<File[]>([]);
  readonly pendingPreviews = signal<string[]>([]);
  private selectedFile: File | null = null;

  artistForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    artist_type_id: ['', [Validators.required]],
    description: [''],
    email: ['', [Validators.required, Validators.email]],
    phone_number: [''],
    legal_name: [''],
    tax_id: [''],
    postal_code: [''],
    photo_url: [''],
  });

  async ngOnInit(): Promise<void> {
    const types = await this.artistsService.getArtistTypes();
    this.artistTypes.set(types);

    if (this.initialArtist) {
      this.artistForm.patchValue({
        name: this.initialArtist.name,
        artist_type_id: this.initialArtist.artist_type_id ?? (types[0]?.id || ''),
        description: this.initialArtist.description ?? '',
        email: this.initialArtist.email ?? this.auth.user()?.email ?? '',
        phone_number: this.initialArtist.phone_number ?? '',
        legal_name: this.initialArtist.legal_name ?? '',
        tax_id: this.initialArtist.tax_id ?? '',
        postal_code: this.initialArtist.postal_code ?? '',
        photo_url: this.initialArtist.photo_url ?? '',
      });
      if (this.initialArtist.photo_url) {
        this.photoPreviewUrl.set(this.initialArtist.photo_url);
      }
      if (this.initialArtist.gallery_urls && Array.isArray(this.initialArtist.gallery_urls)) {
        this.existingGalleryUrls.set([...this.initialArtist.gallery_urls]);
      }
    } else {
      // Prefill defaults for new profile
      const defaultEmail = this.auth.user()?.email || '';
      const defaultName =
        this.auth.user()?.user_metadata?.['full_name'] ||
        this.auth.user()?.user_metadata?.['display_name'] ||
        '';
      this.artistForm.patchValue({
        name: defaultName,
        email: defaultEmail,
        artist_type_id: types[0]?.id || '',
      });
    }
  }

  onFileSelected(file: File): void {
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.photoPreviewUrl.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  onGalleryFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);
    this.pendingGalleryFiles.update(current => [...current, ...files]);

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        this.pendingPreviews.update(previews => [...previews, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    input.value = '';
  }

  removeExistingGalleryPhoto(index: number): void {
    this.existingGalleryUrls.update(urls => urls.filter((_, i) => i !== index));
  }

  removePendingGalleryFile(index: number): void {
    this.pendingGalleryFiles.update(files => files.filter((_, i) => i !== index));
    this.pendingPreviews.update(previews => previews.filter((_, i) => i !== index));
  }

  getNameError(): string | undefined {
    const c = this.artistForm.get('name');
    if (c?.touched && c.errors) {
      if (c.errors['required']) return 'El nombre artístico es obligatorio';
      if (c.errors['minlength']) return 'Mínimo 2 caracteres';
    }
    return undefined;
  }

  getArtistTypeError(): string | undefined {
    const c = this.artistForm.get('artist_type_id');
    if (c?.touched && c.errors?.['required']) {
      return 'Selecciona un tipo de artista';
    }
    return undefined;
  }

  getEmailError(): string | undefined {
    const c = this.artistForm.get('email');
    if (c?.touched && c.errors) {
      if (c.errors['required']) return 'El correo de contacto es obligatorio';
      if (c.errors['email']) return 'Formato de correo no válido';
    }
    return undefined;
  }

  async onSubmit(): Promise<void> {
    if (this.artistForm.invalid) {
      this.artistForm.markAllAsTouched();
      return;
    }

    const currentUser = this.auth.user();
    if (!currentUser) {
      this.errorMessage.set('Debes iniciar sesión para guardar el perfil.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const dto: UpsertArtistDto = {
      ...this.artistForm.value,
      gallery_urls: this.existingGalleryUrls(),
    };

    try {
      let savedArtist: Artist;

      if (this.initialArtist?.id) {
        savedArtist = await this.artistsService.updateArtistProfile(
          this.initialArtist.id,
          currentUser.id,
          dto,
          this.selectedFile || undefined,
          this.pendingGalleryFiles()
        );
      } else {
        savedArtist = await this.artistsService.createArtistProfile(
          currentUser.id,
          dto,
          this.selectedFile || undefined,
          this.pendingGalleryFiles()
        );
      }

      this.saved.emit(savedArtist);
      // Navigate to profile view after saving (works both as page and modal)
      this.router.navigate(['/artist/profile']);
    } catch (err: unknown) {
      const e = err as Error;
      this.errorMessage.set(e.message || 'Error al guardar el perfil del artista.');
    } finally {
      this.isSaving.set(false);
    }
  }
}
