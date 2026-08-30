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
import {
  ButtonComponent,
  SpinnerComponent,
} from '@ticketflow/shared-ui';

@Component({
  selector: 'store-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    EventCardComponent,
    ButtonComponent,
    SpinnerComponent,
  ],
  template: `
    <div class="space-y-16 sm:space-y-24">
      <!-- 1. Hero Section -->
      <section class="relative bg-dark text-surface overflow-hidden py-20 sm:py-32 px-4 sm:px-6 lg:px-8">
        <!-- Glow accents in background -->
        <div class="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute bottom-0 right-1/4 w-96 h-96 bg-contrast/20 rounded-full blur-3xl pointer-events-none"></div>

        <div class="max-w-5xl mx-auto text-center space-y-8 relative z-10">
          <!-- Hero Badge -->
          <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface/10 border border-surface/20 text-accent text-xs font-bold uppercase tracking-wider backdrop-blur-md">
            <span>✨</span>
            <span>La nueva forma de vivir la música en vivo</span>
          </div>

          <!-- Hero Headline -->
          <h1 class="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-surface leading-[1.1]">
            Tus conciertos favoritos,
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-contrast">
              sin intermediarios
            </span>
          </h1>

          <!-- Hero Subtitle -->
          <p class="text-base sm:text-xl text-surface/70 max-w-2xl mx-auto font-normal">
            Compra entradas oficiales directamente de los artistas y recintos. Acceso inmediato con código QR y pagos protegidos por PayPal.
          </p>

          <!-- Central Search Bar -->
          <form (ngSubmit)="onSearchSubmit()" class="max-w-2xl mx-auto relative group">
            <div class="flex items-center bg-surface rounded-2xl shadow-2xl p-2 border-2 border-surface/30 focus-within:border-primary transition-all">
              <span class="pl-3 pr-2 text-dark/40 text-lg">🔍</span>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                name="heroSearch"
                placeholder="Busca por artista, concierto, ciudad o recinto..."
                class="w-full bg-transparent text-dark placeholder-dark/40 text-sm sm:text-base font-medium focus:outline-none px-2"
              />
              <tf-button type="submit" variant="primary" size="md" class="flex-shrink-0 !rounded-xl">
                Buscar
              </tf-button>
            </div>
          </form>

          <!-- Category Chips -->
          <div class="pt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <a
              routerLink="/search"
              class="px-4 py-2 rounded-xl text-xs font-bold bg-surface/10 hover:bg-surface/20 text-surface border border-surface/15 transition-colors"
            >
              🔥 Todos los Shows
            </a>
            <a
              *ngFor="let cat of eventTypes()"
              [routerLink]="['/search']"
              [queryParams]="{ type: cat.id }"
              class="px-4 py-2 rounded-xl text-xs font-bold bg-surface/5 hover:bg-surface/15 text-surface/80 hover:text-surface border border-surface/10 transition-colors"
            >
              {{ cat.name }}
            </a>
          </div>
        </div>
      </section>

      <!-- 2. Featured Events Section -->
      <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 text-contrast text-xs font-extrabold uppercase tracking-wider">
              <span>🎟️</span>
              <span>Cartelera Oficial</span>
            </div>
            <h2 class="text-2xl sm:text-4xl font-black text-dark tracking-tight mt-1">
              Próximos Espectáculos
            </h2>
          </div>

          <a routerLink="/search" class="text-sm font-bold text-primary hover:underline flex items-center gap-1">
            <span>Ver toda la cartelera</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading()" class="py-24 flex flex-col items-center justify-center gap-3">
          <tf-spinner size="lg" color="primary"></tf-spinner>
          <p class="text-sm text-dark/60">Cargando eventos de la cartelera...</p>
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
          class="py-16 text-center rounded-3xl border border-dashed border-dark/20 p-8 bg-dark/5"
        >
          <span class="text-5xl block mb-2">🎪</span>
          <h3 class="text-lg font-bold text-dark">No hay eventos publicados por el momento</h3>
          <p class="text-sm text-dark/60 max-w-md mx-auto mt-1">
            Muy pronto se publicarán nuevas fechas de conciertos y festivales. ¡Vuelve a consultar!
          </p>
        </div>
      </section>

      <!-- 3. Value Propositions -->
      <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="rounded-3xl bg-dark text-surface p-8 sm:p-16 border border-surface/10">
          <div class="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <h2 class="text-2xl sm:text-3xl font-black tracking-tight text-surface">
              ¿Por qué elegir TicketFlow?
            </h2>
            <p class="text-sm text-surface/70">
              Diseñado para fanáticos de la música y creadores de espectáculos.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="p-6 rounded-2xl bg-surface/5 border border-surface/10 space-y-3">
              <div class="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center text-2xl font-bold">
                🎫
              </div>
              <h3 class="text-lg font-bold text-surface">Boletos 100% Oficiales</h3>
              <p class="text-xs text-surface/70 leading-relaxed">
                Sin intermediarios ni riesgo de clonación. Cada boleto se genera directamente desde la cuenta oficial del artista.
              </p>
            </div>

            <div class="p-6 rounded-2xl bg-surface/5 border border-surface/10 space-y-3">
              <div class="w-12 h-12 rounded-xl bg-accent/20 text-accent flex items-center justify-center text-2xl font-bold">
                ⚡
              </div>
              <h3 class="text-lg font-bold text-surface">Acceso Rápido en tu Móvil</h3>
              <p class="text-xs text-surface/70 leading-relaxed">
                Tus boletos digitales con código QR único listos para escanear en el acceso del recinto desde tu celular.
              </p>
            </div>

            <div class="p-6 rounded-2xl bg-surface/5 border border-surface/10 space-y-3">
              <div class="w-12 h-12 rounded-xl bg-contrast/20 text-contrast flex items-center justify-center text-2xl font-bold">
                🔒
              </div>
              <h3 class="text-lg font-bold text-surface">Pagos Seguros vía PayPal</h3>
              <p class="text-xs text-surface/70 leading-relaxed">
                Paga de forma protegida con PayPal, tarjeta de crédito o débito con la garantía de protección al comprador.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- 4. CTA for Artists -->
      <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div class="rounded-3xl bg-gradient-to-r from-dark via-dark/95 to-dark text-surface p-8 sm:p-12 border border-primary/30 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
          <div class="space-y-2 text-center md:text-left">
            <span class="text-xs font-extrabold uppercase tracking-wider text-accent">Para Músicos & Productores</span>
            <h3 class="text-2xl sm:text-3xl font-black text-surface tracking-tight">
              ¿Organizas conciertos o festivales?
            </h3>
            <p class="text-xs sm:text-sm text-surface/70 max-w-xl">
              Crea tu perfil de artista, publica tus fechas, gestiona aforos y vende boletos con comisiones transparentes.
            </p>
          </div>

          <a routerLink="/login" class="flex-shrink-0">
            <tf-button variant="accent" size="lg">
              Comenzar a Vender Boletos →
            </tf-button>
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
