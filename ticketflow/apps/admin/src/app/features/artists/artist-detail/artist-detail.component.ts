import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ArtistsService } from '../artists.service';
import { AuthService } from '@ticketflow/data-access';
import type { Artist, ArtistWithType } from '@ticketflow/models';
import { ArtistFormComponent } from '../artist-form/artist-form.component';
import {
  ButtonComponent,
  CardComponent,
  BadgeComponent,
  SpinnerComponent,
} from '@ticketflow/shared-ui';

@Component({
  selector: 'app-artist-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ArtistFormComponent,
    ButtonComponent,
    CardComponent,
    BadgeComponent,
    SpinnerComponent,
  ],
  template: `
    <div class="space-y-6 max-w-5xl mx-auto">
      <!-- Top header bar -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-dark tracking-tight">
            Perfil del Artista
          </h1>
          <p class="text-sm text-dark/60 mt-1">
            Gestiona la información pública de tu agrupación o proyecto artístico.
          </p>
        </div>

        <div *ngIf="artist() && !isEditing()">
          <tf-button variant="primary" (onClick)="isEditing.set(true)">
            <span class="mr-1.5">✏️</span>
            Editar Perfil
          </tf-button>
        </div>
      </div>

      <!-- Success Notification -->
      <div
        *ngIf="notification()"
        class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between"
      >
        <div class="flex items-center gap-2">
          <span class="text-lg">✅</span>
          <span>{{ notification() }}</span>
        </div>
        <button
          type="button"
          (click)="notification.set(null)"
          class="text-emerald-700 hover:text-emerald-900 font-bold text-lg"
        >
          ×
        </button>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="py-20 flex flex-col items-center justify-center">
        <tf-spinner size="lg"></tf-spinner>
        <p class="text-dark/50 text-sm mt-4">Cargando información del artista...</p>
      </div>

      <!-- Edit Mode Form -->
      <div *ngIf="!isLoading() && (isEditing() || !artist())">
        <div *ngIf="!artist()" class="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20 text-dark text-sm">
          <p class="font-bold text-dark mb-1">¡Bienvenido a TicketFlow! 👋</p>
          <p class="text-dark/70">
            Completa los datos de tu perfil de artista para comenzar a crear y publicar tus eventos.
          </p>
        </div>

        <app-artist-form
          [initialArtist]="artist()"
          [showCancel]="artist() !== null"
          (saved)="onArtistSaved($event)"
          (cancelled)="isEditing.set(false)"
        ></app-artist-form>
      </div>

      <!-- Read-only Detail View -->
      <div *ngIf="!isLoading() && !isEditing() && artist()" class="space-y-6">
        <!-- Main Artist Card -->
        <div class="bg-white rounded-2xl border border-dark/10 shadow-sm overflow-hidden">
          <!-- Cover Banner -->
          <div class="h-36 sm:h-48 bg-gradient-to-r from-dark via-dark/90 to-primary/40 relative">
            <div class="absolute inset-0 bg-black/20"></div>
          </div>

          <!-- Profile info header -->
          <div class="px-6 sm:px-8 pb-8 pt-0 relative">
            <div class="flex flex-col sm:flex-row sm:items-end gap-5 -mt-16 sm:-mt-20 mb-6">
              <!-- Avatar / Photo -->
              <div class="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-white border-4 border-white shadow-md overflow-hidden flex-shrink-0 relative">
                <img
                  *ngIf="artist()?.photo_url"
                  [src]="artist()?.photo_url"
                  [alt]="artist()?.name"
                  class="w-full h-full object-cover"
                />
                <div
                  *ngIf="!artist()?.photo_url"
                  class="w-full h-full bg-dark text-primary font-black text-3xl sm:text-4xl flex items-center justify-center"
                >
                  {{ getInitial() }}
                </div>
              </div>

              <!-- Name and tags -->
              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-3">
                  <h2 class="text-2xl sm:text-3xl font-black text-dark tracking-tight">
                    {{ artist()?.name }}
                  </h2>
                  <tf-badge variant="primary" *ngIf="artist()?.artist_types?.name">
                    {{ artist()?.artist_types?.name }}
                  </tf-badge>
                </div>
                <p class="text-dark/60 text-sm mt-1">
                  {{ artist()?.email || 'Sin correo asignado' }}
                  <span *ngIf="artist()?.phone_number"> • {{ artist()?.phone_number }}</span>
                </p>
              </div>
            </div>

            <!-- Description -->
            <div class="border-t border-dark/10 pt-6">
              <h3 class="text-xs font-bold text-dark/50 uppercase tracking-wider mb-2">Biografía / Reseña</h3>
              <p class="text-dark/80 text-sm whitespace-pre-line leading-relaxed">
                {{ artist()?.description || 'Aún no has añadido una descripción sobre tu trayectoria artística.' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Gallery Photos Section -->
        <tf-card title="Galería de Fotos" subtitle="Fotos públicas que se muestran en la tienda y eventos">
          <div *ngIf="artist()?.gallery_urls && artist()!.gallery_urls!.length > 0; else noGallery" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <div
              *ngFor="let url of artist()?.gallery_urls"
              class="relative rounded-xl overflow-hidden aspect-square border border-dark/10 shadow-sm bg-dark/5 group cursor-pointer"
              (click)="selectedGalleryPhoto.set(url)"
            >
              <img [src]="url" alt="Galería de artista" class="w-full h-full object-cover transition duration-300 group-hover:scale-105" />
            </div>
          </div>
          <ng-template #noGallery>
            <div class="text-center py-8 text-dark/50 text-sm">
              <p>No has agregado fotos a tu galería aún.</p>
              <button
                type="button"
                (click)="isEditing.set(true)"
                class="mt-2 text-primary font-semibold hover:underline"
              >
                + Subir fotos
              </button>
            </div>
          </ng-template>
        </tf-card>

        <!-- Lightbox / Photo preview modal -->
        <div
          *ngIf="selectedGalleryPhoto()"
          class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          (click)="selectedGalleryPhoto.set(null)"
        >
          <div class="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl" (click)="$event.stopPropagation()">
            <img [src]="selectedGalleryPhoto()" alt="Vista previa" class="max-w-full max-h-[85vh] object-contain rounded-xl" />
            <button
              type="button"
              (click)="selectedGalleryPhoto.set(null)"
              class="absolute top-4 right-4 w-9 h-9 bg-black/60 text-white rounded-full flex items-center justify-center text-lg hover:bg-black/90 transition"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Info Grid: Billing & Contact Details -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <tf-card title="Datos de Contacto">
            <dl class="divide-y divide-dark/10 text-sm">
              <div class="py-3 flex justify-between">
                <dt class="text-dark/60">Correo electrónico</dt>
                <dd class="font-medium text-dark">{{ artist()?.email || '—' }}</dd>
              </div>
              <div class="py-3 flex justify-between">
                <dt class="text-dark/60">Teléfono de contacto</dt>
                <dd class="font-medium text-dark">{{ artist()?.phone_number || '—' }}</dd>
              </div>
            </dl>
          </tf-card>

          <tf-card title="Información Fiscal y Facturación">
            <dl class="divide-y divide-dark/10 text-sm">
              <div class="py-3 flex justify-between">
                <dt class="text-dark/60">Razón Social / Nombre Legal</dt>
                <dd class="font-medium text-dark">{{ artist()?.legal_name || '—' }}</dd>
              </div>
              <div class="py-3 flex justify-between">
                <dt class="text-dark/60">RFC / Identificador Fiscal</dt>
                <dd class="font-medium text-dark">{{ artist()?.tax_id || '—' }}</dd>
              </div>
              <div class="py-3 flex justify-between">
                <dt class="text-dark/60">Código Postal</dt>
                <dd class="font-medium text-dark">{{ artist()?.postal_code || '—' }}</dd>
              </div>
            </dl>
          </tf-card>
        </div>
      </div>
    </div>
  `,
})
export class ArtistDetailComponent implements OnInit {
  private readonly artistsService = inject(ArtistsService);
  private readonly auth = inject(AuthService);

  readonly artist = signal<ArtistWithType | null>(null);
  readonly isLoading = signal(true);
  readonly isEditing = signal(false);
  readonly notification = signal<string | null>(null);
  readonly selectedGalleryPhoto = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadProfile();
  }

  async loadProfile(): Promise<void> {
    this.isLoading.set(true);
    try {
      const user = this.auth.user();
      if (user) {
        const profile = await this.artistsService.getMyArtistProfile(user.id);
        this.artist.set(profile);
      }
    } catch (err) {
      console.error('Error loading artist profile:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  getInitial(): string {
    return (this.artist()?.name || 'A').charAt(0).toUpperCase();
  }

  async onArtistSaved(savedArtist: Artist): Promise<void> {
    this.isEditing.set(false);
    this.notification.set('Perfil guardado exitosamente.');
    await this.loadProfile();
  }
}
