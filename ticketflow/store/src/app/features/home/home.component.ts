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
      <section class="relative bg-slate-950 text-white overflow-hidden py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <!-- Glow accents in background -->
        <div class="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>

        <div class="max-w-5xl mx-auto text-center space-y-6 sm:space-y-8 relative z-10">
          <!-- Hero Badge -->
          <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-amber-400 text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-sm">
            <i class="fa-solid fa-wand-magic-sparkles"></i>
            <span>La nueva forma de vivir la música en vivo</span>
          </div>

          <!-- Hero Headline -->
          <h1 class="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.15]">
            Tus conciertos favoritos,
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 block sm:inline mt-1 sm:mt-0">
              sin intermediarios
            </span>
          </h1>

          <!-- Hero Subtitle -->
          <p class="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            Compra entradas oficiales directamente de los artistas y recintos. Acceso inmediato con código QR y pagos protegidos por PayPal.
          </p>

          <!-- Central Search Bar -->
          <form (ngSubmit)="onSearchSubmit()" class="max-w-2xl mx-auto relative group pt-2">
            <div class="flex items-center bg-white rounded-2xl shadow-2xl p-2 sm:p-2.5 border-2 border-slate-200 focus-within:border-cyan-500 focus-within:ring-4 focus-within:ring-cyan-500/20 transition-all">
              <span class="pl-3 pr-2 text-slate-400 text-sm">
                <i class="fa-solid fa-magnifying-glass"></i>
              </span>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                name="heroSearch"
                placeholder="Busca por artista, concierto, ciudad o recinto..."
                class="w-full bg-transparent text-slate-900 placeholder-slate-400 text-xs sm:text-sm font-medium focus:outline-none px-2"
              />
              <button
                type="submit"
                class="flex-shrink-0 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-md shadow-cyan-500/20"
              >
                Buscar
              </button>
            </div>
          </form>

          <!-- Category Chips -->
          <div class="pt-2 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
            <a
              routerLink="/search"
              class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <i class="fa-solid fa-fire text-amber-400"></i> Todos los Shows
            </a>
            <a
              *ngFor="let cat of eventTypes()"
              [routerLink]="['/search']"
              [queryParams]="{ type: cat.id }"
              class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
            >
              {{ cat.name }}
            </a>
          </div>
        </div>
      </section>

      <!-- 2. Featured Events Section -->
      <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div class="flex items-center gap-2 text-cyan-600 text-xs font-extrabold uppercase tracking-wider">
              <i class="fa-solid fa-ticket"></i>
              <span>Cartelera Oficial</span>
            </div>
            <h2 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              Próximos Espectáculos
            </h2>
          </div>

          <a routerLink="/search" class="text-xs sm:text-sm font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1">
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
          class="py-16 text-center rounded-3xl border border-dashed border-slate-300 p-8 bg-white shadow-sm"
        >
          <span class="text-5xl block mb-2 text-slate-300">
            <i class="fa-solid fa-masks-theater"></i>
          </span>
          <h3 class="text-lg font-bold text-slate-900">No hay eventos publicados por el momento</h3>
          <p class="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1">
            Muy pronto se publicarán nuevas fechas de conciertos y festivales. ¡Vuelve a consultar!
          </p>
        </div>
      </section>

      <!-- 3. Value Propositions -->
      <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="rounded-3xl bg-slate-900 text-white p-8 sm:p-14 border border-slate-800 shadow-xl">
          <div class="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <h2 class="text-2xl sm:text-3xl font-black tracking-tight text-white">
              ¿Por qué elegir TicketFlow?
            </h2>
            <p class="text-xs sm:text-sm text-slate-400">
              Diseñado para fanáticos de la música y creadores de espectáculos.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div class="p-6 sm:p-7 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
              <div class="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center text-xl">
                <i class="fa-solid fa-ticket"></i>
              </div>
              <h3 class="text-base sm:text-lg font-bold text-white">Boletos 100% Oficiales</h3>
              <p class="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Sin intermediarios ni riesgo de clonación. Cada boleto se genera directamente desde la cuenta oficial del artista.
              </p>
            </div>

            <div class="p-6 sm:p-7 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
              <div class="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xl">
                <i class="fa-solid fa-bolt"></i>
              </div>
              <h3 class="text-base sm:text-lg font-bold text-white">Acceso Rápido en tu Móvil</h3>
              <p class="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Tus boletos digitales con código QR único listos para escanear en el acceso del recinto desde tu celular.
              </p>
            </div>

            <div class="p-6 sm:p-7 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
              <div class="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center text-xl">
                <i class="fa-solid fa-shield-halved"></i>
              </div>
              <h3 class="text-base sm:text-lg font-bold text-white">Pagos Seguros vía PayPal</h3>
              <p class="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Paga de forma protegida con PayPal, tarjeta de crédito o débito con la garantía de protección al comprador.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- 4. CTA for Artists -->
      <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-8 sm:p-12 border border-cyan-500/30 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
          <div class="space-y-2 text-center md:text-left">
            <span class="text-xs font-extrabold uppercase tracking-wider text-amber-400">Para Músicos & Productores</span>
            <h3 class="text-2xl sm:text-3xl font-black text-white tracking-tight">
              ¿Organizas conciertos o festivales?
            </h3>
            <p class="text-xs sm:text-sm text-slate-300 max-w-xl">
              Crea tu perfil de artista, publica tus fechas, gestiona aforos y vende boletos con comisiones transparentes.
            </p>
          </div>

          <a href="https://ticketflow-admin.vercel.app/" target="_blank" rel="noopener noreferrer" class="flex-shrink-0">
            <button
              type="button"
              class="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
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
