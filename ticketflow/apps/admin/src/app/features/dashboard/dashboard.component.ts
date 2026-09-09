import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardService } from './dashboard.service';
import { AuthService } from '@ticketflow/data-access';
import { ArtistsService } from '../artists/artists.service';
import type { DashboardStats, Event, ArtistWithType } from '@ticketflow/models';
import {
  StatCardComponent,
  ButtonComponent,
  CardComponent,
  BadgeComponent,
  SpinnerComponent,
  SkeletonComponent,
} from '@ticketflow/shared-ui';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    StatCardComponent,
    ButtonComponent,
    CardComponent,
    BadgeComponent,
    SpinnerComponent,
    SkeletonComponent,
  ],
  template: `
    <div class="space-y-8">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-dark tracking-tight">
            Hola, {{ artist()?.name || auth.user()?.user_metadata?.['full_name'] || 'Artista' }}
          </h1>
          <p class="text-sm text-dark/60 mt-1">
            Resumen de actividad y rendimiento de tus eventos en TicketFlow.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <a routerLink="/artist/profile">
            <tf-button variant="secondary" size="md">
              <i class="fa-solid fa-microphone mr-2"></i> Mi Perfil
            </tf-button>
          </a>
          <a routerLink="/events">
            <tf-button variant="primary" size="md">
              <i class="fa-solid fa-plus mr-1.5"></i> Nuevo Evento
            </tf-button>
          </a>
        </div>
      </div>

      <!-- If no artist profile configured yet -->
      <div
        *ngIf="!isLoading() && !artist()"
        class="p-6 rounded-2xl bg-gradient-to-r from-dark to-dark/90 text-surface border border-primary/30 flex flex-col md:flex-row items-center justify-between gap-6"
      >
        <div class="space-y-1 text-center md:text-left">
          <h3 class="text-lg font-bold text-white flex items-center justify-center md:justify-start gap-2">
            <i class="fa-solid fa-wand-magic-sparkles text-primary"></i> Completa tu Perfil de Artista
          </h3>
          <p class="text-surface/70 text-sm">
            Para poder publicar eventos y recibir pagos necesitas registrar tu información artística y fiscal.
          </p>
        </div>
        <a routerLink="/artist/profile">
          <tf-button variant="accent" size="lg">Configurar Ahora <i class="fa-solid fa-arrow-right ml-1.5"></i></tf-button>
        </a>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="space-y-8">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <tf-skeleton variant="card"></tf-skeleton>
          <tf-skeleton variant="card"></tf-skeleton>
          <tf-skeleton variant="card"></tf-skeleton>
          <tf-skeleton variant="card"></tf-skeleton>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div class="lg:col-span-2 space-y-4">
            <tf-skeleton variant="card"></tf-skeleton>
            <tf-skeleton variant="card"></tf-skeleton>
          </div>
          <div>
            <tf-skeleton variant="card"></tf-skeleton>
          </div>
        </div>
      </div>

      <div *ngIf="!isLoading()" class="space-y-8">
        <!-- 4 KPI Stat Cards Row -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <tf-stat-card
            label="Total de Eventos"
            [value]="stats()?.totalEvents ?? 0"
            description="Borradores y publicados"
            icon="fa-solid fa-calendar-days"
          ></tf-stat-card>

          <tf-stat-card
            label="Eventos Activos"
            [value]="stats()?.publishedEvents ?? 0"
            description="Visibles en la tienda pública"
            icon="fa-solid fa-circle-check"
          ></tf-stat-card>

          <tf-stat-card
            label="Boletos Vendidos"
            [value]="stats()?.ticketsSold ?? 0"
            description="En todos tus eventos"
            icon="fa-solid fa-ticket"
          ></tf-stat-card>

          <tf-stat-card
            label="Ganancia Neta"
            [value]="formatCurrency(stats()?.netRevenue ?? 0)"
            description="Monto neto generado"
            icon="fa-solid fa-dollar-sign"
          ></tf-stat-card>
        </div>

        <!-- Main Content Area: Upcoming Events & Quick Links -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Upcoming Events Column (2 cols) -->
          <div class="lg:col-span-2 space-y-4">
            <tf-card title="Próximos Eventos Publicados" subtitle="Eventos en curso con venta de boletos activa">
              <div *ngIf="upcomingEvents().length === 0" class="py-12 text-center text-dark/50">
                <div class="text-4xl mb-2 text-dark/30">
                  <i class="fa-solid fa-masks-theater"></i>
                </div>
                <p class="font-medium text-dark/70">No tienes eventos próximos publicados</p>
                <p class="text-xs mt-1">Crea tu primer evento para comenzar a vender entradas.</p>
                <div class="mt-4">
                  <a routerLink="/events">
                    <tf-button variant="primary" size="sm">
                      <i class="fa-solid fa-plus mr-1"></i> Crear Evento
                    </tf-button>
                  </a>
                </div>
              </div>

              <div *ngIf="upcomingEvents().length > 0" class="divide-y divide-dark/10">
                <div
                  *ngFor="let event of upcomingEvents()"
                  class="py-4 flex items-center justify-between gap-4 hover:bg-dark/5 px-2 rounded-lg transition-colors"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-12 h-12 rounded-lg bg-dark/10 flex-shrink-0 overflow-hidden">
                      <img
                        *ngIf="event.flyer_url"
                        [src]="event.flyer_url"
                        [alt]="event.name"
                        class="w-full h-full object-cover"
                      />
                      <div
                        *ngIf="!event.flyer_url"
                        class="w-full h-full flex items-center justify-center text-dark/40"
                      >
                        <i class="fa-solid fa-music"></i>
                      </div>
                    </div>

                    <div class="min-w-0">
                      <h4 class="font-bold text-dark text-sm truncate">{{ event.name }}</h4>
                      <p class="text-xs text-dark/60 mt-0.5">
                        <i class="fa-regular fa-calendar mr-1"></i> {{ formatDate(event.event_date) }}
                      </p>
                    </div>
                  </div>

                  <div class="flex items-center gap-3">
                    <tf-badge variant="success">Publicado</tf-badge>
                    <a [routerLink]="['/events', event.id]">
                      <tf-button variant="ghost" size="sm">Ver <i class="fa-solid fa-arrow-right ml-1"></i></tf-button>
                    </a>
                  </div>
                </div>
              </div>
            </tf-card>
          </div>

          <!-- Fast Shortcuts Column (1 col) -->
          <div class="space-y-6">
            <tf-card title="Accesos Rápidos">
              <div class="space-y-3">
                <a
                  routerLink="/artist/profile"
                  class="flex items-center justify-between p-3 rounded-xl border border-dark/10 hover:border-primary/50 hover:bg-primary/5 transition-all text-sm group"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                      <i class="fa-solid fa-microphone"></i>
                    </div>
                    <div>
                      <p class="font-bold text-dark group-hover:text-primary transition-colors">Perfil de Artista</p>
                      <p class="text-xs text-dark/50">Foto, biografía y datos de facturación</p>
                    </div>
                  </div>
                  <i class="fa-solid fa-chevron-right text-dark/40 text-xs group-hover:translate-x-1 transition-transform"></i>
                </a>

                <a
                  routerLink="/events"
                  class="flex items-center justify-between p-3 rounded-xl border border-dark/10 hover:border-primary/50 hover:bg-primary/5 transition-all text-sm group"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <i class="fa-solid fa-calendar-check"></i>
                    </div>
                    <div>
                      <p class="font-bold text-dark group-hover:text-primary transition-colors">Gestión de Eventos</p>
                      <p class="text-xs text-dark/50">Boletos, cortesías y sedes</p>
                    </div>
                  </div>
                  <i class="fa-solid fa-chevron-right text-dark/40 text-xs group-hover:translate-x-1 transition-transform"></i>
                </a>

                <a
                  routerLink="/venues"
                  class="flex items-center justify-between p-3 rounded-xl border border-dark/10 hover:border-primary/50 hover:bg-primary/5 transition-all text-sm group"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-contrast/10 text-contrast flex items-center justify-center">
                      <i class="fa-solid fa-location-dot"></i>
                    </div>
                    <div>
                      <p class="font-bold text-dark group-hover:text-primary transition-colors">Catálogo de Sedes</p>
                      <p class="text-xs text-dark/50">Ubicaciones y configuraciones de capacidad</p>
                    </div>
                  </div>
                  <i class="fa-solid fa-chevron-right text-dark/40 text-xs group-hover:translate-x-1 transition-transform"></i>
                </a>
              </div>
            </tf-card>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly artistsService = inject(ArtistsService);

  readonly stats = signal<DashboardStats | null>(null);
  readonly upcomingEvents = signal<Event[]>([]);
  readonly artist = signal<ArtistWithType | null>(null);
  readonly isLoading = signal(true);

  async ngOnInit(): Promise<void> {
    await this.loadDashboard();
  }

  async loadDashboard(): Promise<void> {
    this.isLoading.set(true);
    try {
      const user = this.auth.user();
      if (user) {
        const artistProfile = await this.artistsService.getMyArtistProfile(user.id);
        this.artist.set(artistProfile);

        if (artistProfile?.id) {
          const res = await this.dashboardService.getStats(artistProfile.id);
          this.stats.set(res.stats);
          this.upcomingEvents.set(res.upcomingEvents);
        } else {
          this.stats.set({
            totalEvents: 0,
            draftEvents: 0,
            publishedEvents: 0,
            ticketsSold: 0,
            ticketsAvailable: 0,
            netRevenue: 0,
          });
        }
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  formatDate(dateStr?: string | null): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

}
