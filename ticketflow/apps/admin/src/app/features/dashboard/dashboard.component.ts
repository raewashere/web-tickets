import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardService, DailySalesRecord, WeeklyTrend } from './dashboard.service';
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

export interface ChartPoint {
  dayLabel: string;
  fullDate: string;
  revenue: number;
  tickets: number;
}

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
          <h1 class="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
            Hola, {{ artist()?.name || auth.user()?.user_metadata?.['full_name'] || 'Artista' }}
          </h1>
          <p class="text-sm text-on-surface/60 mt-1">
            Resumen de actividad y rendimiento de tus eventos en BoletoCoqueto.
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
        class="p-6 rounded-2xl bg-gradient-to-r from-inverse-surface to-inverse-surface/90 text-inverse-on-surface border border-primary/30 flex flex-col md:flex-row items-center justify-between gap-6"
      >
        <div class="space-y-1 text-center md:text-left">
          <h3 class="text-lg font-bold text-inverse-on-surface flex items-center justify-center md:justify-start gap-2">
            <i class="fa-solid fa-wand-magic-sparkles text-tertiary"></i> Completa tu Perfil de Artista
          </h3>
          <p class="text-inverse-on-surface/70 text-sm">
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

        <!-- Sales & Performance Interactive SVG Chart Card (UX-9) -->
        <tf-card>
          <div class="space-y-6">
            <!-- Header with Title, Controls, and Trend Badge -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-on-surface/10">
              <div>
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                    <i class="fa-solid fa-chart-column"></i>
                  </div>
                  <h3 class="text-lg font-bold text-on-surface tracking-tight">Rendimiento y Ventas</h3>
                </div>
                <p class="text-xs text-on-surface/60 mt-1">Comportamiento de ventas y recaudación de la última semana</p>
              </div>

              <div class="flex flex-wrap items-center gap-3">
                <!-- Trend indicator badge -->
                <span class="inline-flex items-center gap-1.5 text-xs font-bold text-on-tertiary-container bg-tertiary-container/20 px-3 py-1.5 rounded-xl border border-tertiary-container/30 shadow-xs">
                  <i [class]="weeklyTrend().isPositive ? 'fa-solid fa-arrow-trend-up text-on-tertiary-container' : 'fa-solid fa-arrow-trend-down text-error'"></i> {{ weeklyTrend().label }}
                </span>

                <!-- View Mode Toggle Buttons -->
                <div class="flex bg-on-surface/5 p-1 rounded-xl border border-on-surface/10">
                  <button
                    type="button"
                    (click)="chartView.set('revenue')"
                    [class]="chartView() === 'revenue' 
                      ? 'px-3 py-1.5 text-xs font-bold rounded-lg bg-surface text-primary shadow-xs transition-all' 
                      : 'px-3 py-1.5 text-xs font-semibold text-on-surface/70 hover:text-on-surface transition-all'"
                  >
                    <i class="fa-solid fa-dollar-sign mr-1"></i> Ingresos Totales ($ MXN)
                  </button>
                  <button
                    type="button"
                    (click)="chartView.set('tickets')"
                    [class]="chartView() === 'tickets' 
                      ? 'px-3 py-1.5 text-xs font-bold rounded-lg bg-surface text-primary shadow-xs transition-all' 
                      : 'px-3 py-1.5 text-xs font-semibold text-on-surface/70 hover:text-on-surface transition-all'"
                  >
                    <i class="fa-solid fa-ticket mr-1"></i> Boletos Vendidos (Unidades)
                  </button>
                </div>
              </div>
            </div>

            <!-- Active Hover Detail Summary -->
            <div class="flex items-center justify-between bg-on-surface/5 p-4 rounded-2xl border border-on-surface/5">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg font-bold">
                  <i class="fa-solid" [ngClass]="chartView() === 'revenue' ? 'fa-sack-dollar' : 'fa-ticket'"></i>
                </div>
                <div>
                  <span class="text-xs text-on-surface/60 block font-medium">
                    {{ activePoint() ? activePoint()!.fullDate : 'Total Acumulado (7 días)' }}
                  </span>
                  <span class="text-xl font-bold text-on-surface font-mono">
                    {{ activePoint() 
                        ? (chartView() === 'revenue' ? formatCurrency(activePoint()!.revenue) : (activePoint()!.tickets + ' boletos')) 
                        : (chartView() === 'revenue' ? formatCurrency(totalChartRevenue()) : (totalChartTickets() + ' boletos'))
                    }}
                  </span>
                </div>
              </div>

              <div class="text-right text-xs">
                <span class="text-on-surface/50 block">Promedio diario</span>
                <span class="font-bold text-on-surface font-mono">
                  {{ chartView() === 'revenue' ? formatCurrency(avgChartRevenue()) : (avgChartTickets() + ' boletos/día') }}
                </span>
              </div>
            </div>

            <!-- Native SVG Chart Container -->
            <div class="relative w-full overflow-hidden pt-2 pb-2">
              <svg
                viewBox="0 0 700 240"
                class="w-full h-auto overflow-visible select-none"
              >
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" class="text-primary" stop-color="currentColor" stop-opacity="1" />
                    <stop offset="100%" class="text-secondary" stop-color="currentColor" stop-opacity="0.85" />
                  </linearGradient>
                  <linearGradient id="barHoverGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" class="text-secondary" stop-color="currentColor" stop-opacity="1" />
                    <stop offset="100%" class="text-primary" stop-color="currentColor" stop-opacity="0.95" />
                  </linearGradient>
                </defs>

                <!-- Y-Axis Grid Lines -->
                <g stroke="currentColor" stroke-dasharray="4 4" class="text-on-surface/10">
                  <line x1="50" y1="30" x2="680" y2="30" stroke-width="1" />
                  <line x1="50" y1="80" x2="680" y2="80" stroke-width="1" />
                  <line x1="50" y1="130" x2="680" y2="130" stroke-width="1" />
                  <line x1="50" y1="180" x2="680" y2="180" stroke-width="1" />
                </g>

                <!-- Y-Axis Text Ticks -->
                <g class="text-[10px] font-mono fill-on-surface/50">
                  <text x="42" y="34" text-anchor="end">{{ chartView() === 'revenue' ? formatShortCurrency(maxChartVal()) : maxChartVal() }}</text>
                  <text x="42" y="84" text-anchor="end">{{ chartView() === 'revenue' ? formatShortCurrency(maxChartVal() * 0.66) : Math.round(maxChartVal() * 0.66) }}</text>
                  <text x="42" y="134" text-anchor="end">{{ chartView() === 'revenue' ? formatShortCurrency(maxChartVal() * 0.33) : Math.round(maxChartVal() * 0.33) }}</text>
                  <text x="42" y="184" text-anchor="end">0</text>
                </g>

                <!-- Bars and Hover Columns -->
                <g *ngFor="let pt of chartPoints(); let i = index">
                  <!-- Background Bar column highlight on hover -->
                  <rect
                    [attr.x]="65 + i * 86"
                    y="25"
                    width="56"
                    height="160"
                    rx="8"
                    class="transition-colors cursor-pointer"
                    [attr.fill]="hoveredIndex() === i ? 'rgb(var(--md-primary) / 0.08)' : 'transparent'"
                    (mouseenter)="hoveredIndex.set(i)"
                    (mouseleave)="hoveredIndex.set(null)"
                  />

                  <!-- Main Bar Rect -->
                  <rect
                    [attr.x]="77 + i * 86"
                    [attr.y]="getBarY(pt)"
                    width="32"
                    [attr.height]="getBarHeight(pt)"
                    rx="6"
                    [attr.fill]="hoveredIndex() === i ? 'url(#barHoverGradient)' : 'url(#barGradient)'"
                    class="transition-all duration-300 cursor-pointer shadow-md"
                    (mouseenter)="hoveredIndex.set(i)"
                    (mouseleave)="hoveredIndex.set(null)"
                  />

                  <!-- Hover Value Badge above bar -->
                  <g *ngIf="hoveredIndex() === i">
                    <rect
                      [attr.x]="53 + i * 86"
                      [attr.y]="getBarY(pt) - 26"
                      width="80"
                      height="20"
                      rx="6"
                      class="fill-on-surface shadow-lg"
                    />
                    <text
                      [attr.x]="93 + i * 86"
                      [attr.y]="getBarY(pt) - 12"
                      text-anchor="middle"
                      class="fill-surface text-[10px] font-bold font-mono"
                    >
                      {{ chartView() === 'revenue' ? formatCurrency(pt.revenue) : (pt.tickets + ' tix') }}
                    </text>
                  </g>

                  <!-- X-Axis Labels -->
                  <text
                    [attr.x]="93 + i * 86"
                    y="205"
                    text-anchor="middle"
                    class="text-[11px] font-bold fill-on-surface/70"
                  >
                    {{ pt.dayLabel }}
                  </text>
                  <text
                    [attr.x]="93 + i * 86"
                    y="219"
                    text-anchor="middle"
                    class="text-[9px] fill-on-surface/40 font-mono"
                  >
                    {{ pt.fullDate }}
                  </text>
                </g>

                <!-- X-Axis Baseline -->
                <line x1="50" y1="185" x2="680" y2="185" stroke="currentColor" stroke-width="1.5" class="text-on-surface/20" />
              </svg>
            </div>

            <!-- Chart Legend & Footer -->
            <div class="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-on-surface/10 text-xs">
              <div class="flex flex-wrap items-center gap-4">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full bg-primary inline-block shadow-xs"></span>
                  <span class="text-on-surface/70 font-medium">Ventas Confirmadas</span>
                </div>
                <span *ngIf="totalChartRevenue() === 0 && (stats()?.ticketsSold ?? 0) > 0" class="text-on-surface/50 italic text-[11px]">
                  (Sin ventas en los últimos 7 días; las ventas anteriores se reflejan en los totales)
                </span>
              </div>

              <div class="text-on-surface/60 flex items-center gap-1.5">
                <i class="fa-solid fa-clock-rotate-left text-primary"></i>
                <span>Actualizado en tiempo real</span>
              </div>
            </div>
          </div>
        </tf-card>

        <!-- Main Content Area: Upcoming Events & Quick Links -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Upcoming Events Column (2 cols) -->
          <div class="lg:col-span-2 space-y-4">
            <tf-card title="Próximos Eventos Publicados" subtitle="Eventos en curso con venta de boletos activa">
              <div *ngIf="upcomingEvents().length === 0" class="py-12 text-center text-on-surface/50">
                <div class="text-4xl mb-2 text-on-surface/30">
                  <i class="fa-solid fa-masks-theater"></i>
                </div>
                <p class="font-medium text-on-surface/70">No tienes eventos próximos publicados</p>
                <p class="text-xs mt-1">Crea tu primer evento para comenzar a vender entradas.</p>
                <div class="mt-4">
                  <a routerLink="/events">
                    <tf-button variant="primary" size="sm">
                      <i class="fa-solid fa-plus mr-1"></i> Crear Evento
                    </tf-button>
                  </a>
                </div>
              </div>

              <div *ngIf="upcomingEvents().length > 0" class="divide-y divide-on-surface/10">
                <div
                  *ngFor="let event of upcomingEvents()"
                  class="py-4 flex items-center justify-between gap-4 hover:bg-on-surface/5 px-2 rounded-lg transition-colors"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-12 h-12 rounded-lg bg-on-surface/10 flex-shrink-0 overflow-hidden">
                      <img
                        *ngIf="event.flyer_url"
                        [src]="event.flyer_url"
                        [alt]="event.name"
                        class="w-full h-full object-cover"
                      />
                      <div
                        *ngIf="!event.flyer_url"
                        class="w-full h-full flex items-center justify-center text-on-surface/40"
                      >
                        <i class="fa-solid fa-music"></i>
                      </div>
                    </div>

                    <div class="min-w-0">
                      <h4 class="font-bold text-on-surface text-sm truncate">{{ event.name }}</h4>
                      <p class="text-xs text-on-surface/60 mt-0.5">
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
                  class="flex items-center justify-between p-3 rounded-xl border border-on-surface/10 hover:border-primary/50 hover:bg-primary/5 transition-all text-sm group"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center">
                      <i class="fa-solid fa-microphone"></i>
                    </div>
                    <div>
                      <p class="font-bold text-on-surface group-hover:text-primary transition-colors">Perfil de Artista</p>
                      <p class="text-xs text-on-surface/50">Foto, biografía y datos de facturación</p>
                    </div>
                  </div>
                  <i class="fa-solid fa-chevron-right text-on-surface/40 text-xs group-hover:translate-x-1 transition-transform"></i>
                </a>

                <a
                  routerLink="/events"
                  class="flex items-center justify-between p-3 rounded-xl border border-on-surface/10 hover:border-primary/50 hover:bg-primary/5 transition-all text-sm group"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <i class="fa-solid fa-calendar-check"></i>
                    </div>
                    <div>
                      <p class="font-bold text-on-surface group-hover:text-primary transition-colors">Gestión de Eventos</p>
                      <p class="text-xs text-on-surface/50">Boletos, cortesías y sedes</p>
                    </div>
                  </div>
                  <i class="fa-solid fa-chevron-right text-on-surface/40 text-xs group-hover:translate-x-1 transition-transform"></i>
                </a>

                <a
                  routerLink="/venues"
                  class="flex items-center justify-between p-3 rounded-xl border border-on-surface/10 hover:border-primary/50 hover:bg-primary/5 transition-all text-sm group"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-tertiary-container/20 text-on-tertiary-container flex items-center justify-center">
                      <i class="fa-solid fa-location-dot"></i>
                    </div>
                    <div>
                      <p class="font-bold text-on-surface group-hover:text-primary transition-colors">Catálogo de Sedes</p>
                      <p class="text-xs text-on-surface/50">Ubicaciones y configuraciones de capacidad</p>
                    </div>
                  </div>
                  <i class="fa-solid fa-chevron-right text-on-surface/40 text-xs group-hover:translate-x-1 transition-transform"></i>
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

  // Sales Chart state (UX-9)
  readonly chartView = signal<'revenue' | 'tickets'>('revenue');
  readonly hoveredIndex = signal<number | null>(null);
  readonly chartPoints = signal<ChartPoint[]>([]);
  readonly weeklyTrend = signal<WeeklyTrend>({ percentage: 0, isPositive: true, label: '0% esta semana' });

  readonly Math = Math;

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
          this.weeklyTrend.set(res.weeklyTrend);
          this.generateChartPoints(res.dailySales);
        } else {
          const emptyStats: DashboardStats = {
            totalEvents: 0,
            draftEvents: 0,
            publishedEvents: 0,
            ticketsSold: 0,
            ticketsAvailable: 0,
            netRevenue: 0,
          };
          this.stats.set(emptyStats);
          this.weeklyTrend.set({ percentage: 0, isPositive: true, label: 'Sin ventas esta semana' });
          this.generateChartPoints([]);
        }
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  generateChartPoints(dailySales: DailySalesRecord[]): void {
    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const points: ChartPoint[] = [];

    const salesMap = new Map<string, { revenue: number; tickets: number }>();
    (dailySales || []).forEach((d) => {
      salesMap.set(d.date, { revenue: d.revenue, tickets: d.tickets });
    });

    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      const dayLabel = daysOfWeek[d.getDay()];
      const fullDate = `${d.getDate()} ${months[d.getMonth()]}`;

      const dayData = salesMap.get(dateKey) || { revenue: 0, tickets: 0 };

      points.push({
        dayLabel,
        fullDate,
        revenue: Math.round(dayData.revenue),
        tickets: dayData.tickets,
      });
    }

    this.chartPoints.set(points);
  }

  maxChartVal(): number {
    const pts = this.chartPoints();
    if (pts.length === 0) return 100;
    const vals = pts.map((p) => (this.chartView() === 'revenue' ? p.revenue : p.tickets));
    const max = Math.max(...vals);
    return max > 0 ? max : (this.chartView() === 'revenue' ? 10000 : 50);
  }

  totalChartRevenue(): number {
    return this.chartPoints().reduce((acc, p) => acc + p.revenue, 0);
  }

  totalChartTickets(): number {
    return this.chartPoints().reduce((acc, p) => acc + p.tickets, 0);
  }

  avgChartRevenue(): number {
    const pts = this.chartPoints();
    return pts.length > 0 ? Math.round(this.totalChartRevenue() / pts.length) : 0;
  }

  avgChartTickets(): number {
    const pts = this.chartPoints();
    return pts.length > 0 ? Math.round(this.totalChartTickets() / pts.length) : 0;
  }

  activePoint(): ChartPoint | null {
    const idx = this.hoveredIndex();
    if (idx !== null && idx >= 0 && idx < this.chartPoints().length) {
      return this.chartPoints()[idx];
    }
    return null;
  }

  getBarY(pt: ChartPoint): number {
    const max = this.maxChartVal();
    const val = this.chartView() === 'revenue' ? pt.revenue : pt.tickets;
    const h = val > 0 ? Math.max(12, (val / max) * 140) : 6;
    return 180 - h;
  }

  getBarHeight(pt: ChartPoint): number {
    const max = this.maxChartVal();
    const val = this.chartView() === 'revenue' ? pt.revenue : pt.tickets;
    return val > 0 ? Math.max(12, (val / max) * 140) : 6;
  }

  formatShortCurrency(amount: number): string {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}k`;
    }
    return `$${amount}`;
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
