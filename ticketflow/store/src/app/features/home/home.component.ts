import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HomeService } from './home.service';
import { EventCardComponent, StoreEventItem } from '../../shared/ui/event-card.component';
import type { EventType } from '@ticketflow/models';
import { SkeletonComponent } from '@ticketflow/shared-ui';

@Component({
  selector: 'store-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    EventCardComponent,
    SkeletonComponent,
  ],
  template: `
    <div class="space-y-12 sm:space-y-20 pb-16">
      <!-- 1. Hero Section -->
      <section class="relative bg-inverse-surface text-inverse-on-surface overflow-hidden py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <!-- Glow accents -->
        <div class="absolute top-0 left-1/4 w-96 h-96 bg-tertiary/20 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute bottom-0 right-1/4 w-96 h-96 bg-tertiary/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="max-w-5xl mx-auto text-center space-y-6 sm:space-y-8 relative z-10">
          <!-- Hero Badge -->
          <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-inverse-surface/60 border border-outline-variant/20 text-tertiary text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-sm">
            <i class="fa-solid fa-wand-magic-sparkles"></i>
            <span>La nueva forma de vivir la música en vivo</span>
          </div>

          <!-- Hero Headline -->
          <h1 class="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-inverse-on-surface leading-[1.15]">
            Tus conciertos favoritos,
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-secondary via-secondary to-tertiary block sm:inline mt-1 sm:mt-0">
              sin intermediarios
            </span>
          </h1>

          <!-- Hero Subtitle -->
          <p class="text-sm sm:text-lg text-inverse-on-surface/70 max-w-2xl mx-auto font-normal leading-relaxed">
            Compra entradas oficiales directamente de los artistas y recintos. Acceso inmediato con código QR y pagos protegidos por PayPal.
          </p>

          <!-- Central Search Bar -->
          <form (ngSubmit)="onSearchSubmit()" class="max-w-2xl mx-auto relative group pt-2">
            <div class="flex items-center bg-surface rounded-2xl shadow-2xl p-2 sm:p-2.5 border-2 border-surface/50 focus-within:border-tertiary focus-within:ring-4 focus-within:ring-tertiary/20 transition-all">
              <span class="pl-3 pr-2 text-on-surface/40 text-sm">
                <i class="fa-solid fa-magnifying-glass"></i>
              </span>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                name="heroSearch"
                placeholder="Busca por artista, concierto, ciudad o recinto..."
                class="w-full bg-transparent text-on-surface placeholder-on-surface/40 text-xs sm:text-sm font-medium focus:outline-none px-2"
              />
              <!-- Botón en tertiary para máximo contraste dentro del buscador -->
              <button
                type="submit"
                class="flex-shrink-0 px-5 py-2.5 rounded-xl bg-tertiary hover:bg-tertiary/90 text-on-tertiary font-bold text-xs sm:text-sm transition-all shadow-md shadow-tertiary/20"
              >
                Buscar
              </button>
            </div>
          </form>

          <!-- Category Chips -->
          <div class="pt-2 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
            <a
              routerLink="/search"
              class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-inverse-on-surface/10 hover:bg-inverse-on-surface/20 text-inverse-on-surface hover:text-inverse-on-surface border border-outline-variant/20 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <i class="fa-solid fa-fire text-tertiary"></i> Todos los Shows
            </a>
            <a
              *ngFor="let cat of eventTypes()"
              [routerLink]="['/search']"
              [queryParams]="{ type: cat.id }"
              class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-inverse-on-surface/5 hover:bg-inverse-on-surface/15 text-inverse-on-surface/70 hover:text-inverse-on-surface border border-outline-variant/10 transition-colors"
            >
              {{ cat.name }}
            </a>
          </div>
        </div>
      </section>

      <!-- 2. Featured Events Section -->
      <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-on-surface/10">
          <div>
            <div class="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
              <i class="fa-solid fa-ticket"></i>
              <span>Cartelera Oficial</span>
            </div>
            <h2 class="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight mt-1">
              Próximos Espectáculos
            </h2>
          </div>

          <a routerLink="/search" class="text-xs sm:text-sm font-bold text-primary hover:text-primary/80 flex items-center gap-1">
            <span>Ver toda la cartelera</span>
            <i class="fa-solid fa-arrow-right text-xs"></i>
          </a>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading()" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          <tf-skeleton variant="event-card"></tf-skeleton>
          <tf-skeleton variant="event-card"></tf-skeleton>
          <tf-skeleton variant="event-card"></tf-skeleton>
        </div>

        <!-- Events Grid -->
        <div
          *ngIf="!isLoading() && events().length > 0"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
        >
          <store-event-card
            *ngFor="let ev of events()"
            [event]="ev"
          ></store-event-card>
        </div>

        <!-- Empty State -->
        <div
          *ngIf="!isLoading() && events().length === 0"
          class="py-16 text-center rounded-3xl border border-dashed border-on-surface/20 p-8 bg-surface shadow-sm"
        >
          <span class="text-5xl block mb-2 text-on-surface/20">
            <i class="fa-solid fa-masks-theater"></i>
          </span>
          <h3 class="text-lg font-bold text-on-surface">No hay eventos publicados por el momento</h3>
          <p class="text-xs sm:text-sm text-on-surface/50 max-w-md mx-auto mt-1">
            Muy pronto se publicarán nuevas fechas de conciertos y festivales. ¡Vuelve a consultar!
          </p>
        </div>
      </section>

      <!-- 3. Value Propositions -->
      <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="rounded-3xl bg-inverse-surface text-inverse-on-surface p-8 sm:p-14 border border-outline-variant/20 shadow-xl">
          <div class="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-inverse-on-surface">
              ¿Por qué elegir BoletoCoqueto?
            </h2>
            <p class="text-xs sm:text-sm text-inverse-on-surface/60">
              Diseñado para fanáticos de la música y creadores de espectáculos.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div class="p-6 sm:p-7 rounded-2xl bg-inverse-on-surface/5 border border-outline-variant/10 space-y-3">
              <div class="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 text-primary flex items-center justify-center text-xl">
                <i class="fa-solid fa-ticket"></i>
              </div>
              <h3 class="text-base sm:text-lg font-bold text-inverse-on-surface">Boletos 100% Oficiales</h3>
              <p class="text-xs sm:text-sm text-inverse-on-surface/60 leading-relaxed">
                Sin intermediarios ni riesgo de clonación. Cada boleto se genera directamente desde la cuenta oficial del artista.
              </p>
            </div>

            <div class="p-6 sm:p-7 rounded-2xl bg-inverse-on-surface/5 border border-outline-variant/10 space-y-3">
              <div class="w-12 h-12 rounded-xl bg-secondary/20 border border-secondary/30 text-secondary flex items-center justify-center text-xl">
                <i class="fa-solid fa-bolt"></i>
              </div>
              <h3 class="text-base sm:text-lg font-bold text-inverse-on-surface">Acceso Rápido en tu Móvil</h3>
              <p class="text-xs sm:text-sm text-inverse-on-surface/60 leading-relaxed">
                Tus boletos digitales con código QR único listos para escanear en el acceso del recinto desde tu celular.
              </p>
            </div>

            <div class="p-6 sm:p-7 rounded-2xl bg-inverse-on-surface/5 border border-outline-variant/10 space-y-3">
              <div class="w-12 h-12 rounded-xl bg-tertiary/20 border border-tertiary/30 text-tertiary flex items-center justify-center text-xl">
                <i class="fa-solid fa-shield-halved"></i>
              </div>
              <h3 class="text-base sm:text-lg font-bold text-inverse-on-surface">Pagos Seguros vía PayPal</h3>
              <p class="text-xs sm:text-sm text-inverse-on-surface/60 leading-relaxed">
                Paga de forma protegida con PayPal, tarjeta de crédito o débito con la garantía de protección al comprador.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- 4. CTA for Artists -->
      <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="rounded-3xl bg-gradient-to-r from-inverse-surface via-inverse-surface/90 to-inverse-surface text-inverse-on-surface p-8 sm:p-12 border border-secondary/20 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
          <div class="space-y-2 text-center md:text-left">
            <span class="text-xs font-bold uppercase tracking-wider text-secondary">Para Músicos & Productores</span>
            <h3 class="text-2xl sm:text-3xl font-bold text-inverse-on-surface tracking-tight">
              ¿Organizas conciertos o festivales?
            </h3>
            <p class="text-xs sm:text-sm text-inverse-on-surface/70 max-w-xl">
              Crea tu perfil de artista, publica tus fechas, gestiona aforos y vende boletos con comisiones transparentes.
            </p>
          </div>

          <a href="https://ticketflow-admin.vercel.app/" target="_blank" rel="noopener noreferrer" class="flex-shrink-0">
            <button
              type="button"
              class="px-6 py-3.5 rounded-xl bg-secondary hover:bg-secondary/90 text-on-secondary font-bold text-xs sm:text-sm transition-all shadow-lg shadow-secondary/25 flex items-center gap-2"
            >
              <span>Comenzar a Vender Boletos</span>
              <i class="fa-solid fa-arrow-right"></i>
            </button>
          </a>
        </div>
      </section>
    </div>
  `,
})
export class HomeComponent implements OnInit {
  private readonly homeService = inject(HomeService);
  private readonly router = inject(Router);

  readonly isLoading = signal(true);
  readonly events = signal<StoreEventItem[]>([]);
  readonly eventTypes = signal<EventType[]>([]);

  searchQuery = '';

  async ngOnInit(): Promise<void> {
    await this.loadHomeData();
  }

  private async loadHomeData(): Promise<void> {
    this.isLoading.set(true);
    try {
      const [eventsData, typesData] = await Promise.all([
        this.homeService.getFeaturedEvents(),
        this.homeService.getEventTypes(),
      ]);

      this.events.set(eventsData);
      this.eventTypes.set(typesData);
    } catch (err) {
      console.error('Error loading home data:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  onSearchSubmit(): void {
    const q = this.searchQuery.trim();
    if (q) {
      this.router.navigate(['/search'], { queryParams: { q } });
    } else {
      this.router.navigate(['/search']);
    }
  }
}
