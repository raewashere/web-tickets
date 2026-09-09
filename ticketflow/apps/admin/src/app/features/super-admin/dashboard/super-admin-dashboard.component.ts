import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SuperAdminService } from '../super-admin.service';
import type { PlatformGlobalMetrics } from '@ticketflow/models';
import { SpinnerComponent } from '@ticketflow/shared-ui';

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, SpinnerComponent],
  template: `
    <div class="space-y-8">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span class="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full inline-block mb-2">
            Panel de Control Central
          </span>
          <h1 class="text-2xl sm:text-3xl font-black text-dark tracking-tight">
            Métricas Globales de la Plataforma
          </h1>
          <p class="text-xs sm:text-sm text-dark/60 mt-1">
            Resumen consolidado de ventas, comisiones, ocupación y usuarios en TicketFlow.
          </p>
        </div>

        <button
          type="button"
          (click)="loadMetrics()"
          class="px-4 py-2 rounded-xl bg-white border border-dark/10 hover:bg-dark/5 text-dark font-bold text-xs shadow-sm transition flex items-center gap-2 self-start sm:self-auto"
        >
          <i class="fa-solid fa-rotate-right"></i>
          <span>Actualizar Datos</span>
        </button>
      </div>

      <!-- Loading state -->
      <div *ngIf="isLoading()" class="py-24 flex flex-col items-center justify-center gap-3">
        <tf-spinner size="lg"></tf-spinner>
        <p class="text-xs text-dark/50">Cargando métricas globales...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMessage()" class="p-4 rounded-2xl bg-contrast/10 border border-contrast/20 text-contrast text-xs">
        {{ errorMessage() }}
      </div>

      <!-- Metrics Content -->
      <div *ngIf="!isLoading() && metrics()" class="space-y-8">
        <!-- Main Financial KPI Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- GMV -->
          <div class="p-6 rounded-2xl bg-white border border-dark/10 shadow-sm space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-dark/50 uppercase tracking-wider">Volumen Total (GMV)</span>
              <i class="fa-solid fa-coins text-amber-500 text-lg"></i>
            </div>
            <p class="text-2xl sm:text-3xl font-black text-dark font-mono">
              \${{ metrics()!.total_gmv | number:'1.2-2' }} <span class="text-xs font-normal text-dark/50">MXN</span>
            </p>
            <p class="text-[11px] text-dark/50">
              En <strong class="text-dark font-semibold">{{ metrics()!.total_orders_count }}</strong> órdenes confirmadas
            </p>
          </div>

          <!-- Platform Commissions -->
          <div class="p-6 rounded-2xl bg-white border border-dark/10 shadow-sm space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-dark/50 uppercase tracking-wider">Comisiones TicketFlow</span>
              <i class="fa-solid fa-chart-line text-emerald-600 text-lg"></i>
            </div>
            <p class="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
              \${{ metrics()!.total_platform_commission | number:'1.2-2' }} <span class="text-xs font-normal text-dark/50">MXN</span>
            </p>
            <p class="text-[11px] text-emerald-700/70 font-medium">
              Ingresos netos por comisión de servicio
            </p>
          </div>

          <!-- Tickets Sold -->
          <div class="p-6 rounded-2xl bg-white border border-dark/10 shadow-sm space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-dark/50 uppercase tracking-wider">Boletos Emitidos</span>
              <i class="fa-solid fa-ticket text-cyan-600 text-lg"></i>
            </div>
            <p class="text-2xl sm:text-3xl font-black text-dark font-mono">
              {{ metrics()!.total_tickets_sold | number }}
            </p>
            <p class="text-[11px] text-dark/50">
              Entradas con código QR único
            </p>
          </div>

          <!-- Active Events -->
          <div class="p-6 rounded-2xl bg-white border border-dark/10 shadow-sm space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-dark/50 uppercase tracking-wider">Eventos Activos</span>
              <i class="fa-solid fa-masks-theater text-indigo-600 text-lg"></i>
            </div>
            <p class="text-2xl sm:text-3xl font-black text-dark font-mono">
              {{ metrics()!.active_events_count }}
            </p>
            <p class="text-[11px] text-dark/50">
              De <strong class="text-dark font-semibold">{{ metrics()!.total_events_count }}</strong> eventos registrados en total
            </p>
          </div>
        </div>

        <!-- Ecosystem Stats: Users, Artists, Venues -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Venues Box -->
          <div class="p-6 rounded-3xl bg-white border border-dark/10 shadow-sm space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-lg font-bold">
                  <i class="fa-solid fa-location-dot"></i>
                </div>
                <div>
                  <h2 class="font-black text-base text-dark">Recintos / Venues</h2>
                  <p class="text-xs text-dark/50">Sedes registradas en la plataforma</p>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-2">
              <div class="p-3.5 rounded-2xl bg-dark/5 border border-dark/10">
                <span class="text-[10px] uppercase font-bold text-dark/40 block">Totales</span>
                <span class="text-xl font-black text-dark font-mono">{{ metrics()!.total_venues_count }}</span>
              </div>
              <div class="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                <span class="text-[10px] uppercase font-bold text-emerald-700 block">Verificados</span>
                <span class="text-xl font-black text-emerald-800 font-mono">{{ metrics()!.verified_venues_count }}</span>
              </div>
            </div>

            <a routerLink="/super-admin/venues">
              <button
                type="button"
                class="w-full mt-2 py-2.5 rounded-xl bg-dark hover:bg-dark/90 text-white text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <span>Auditar y Verificar Recintos</span>
                <i class="fa-solid fa-arrow-right"></i>
              </button>
            </a>
          </div>

          <!-- Artists Box -->
          <div class="p-6 rounded-3xl bg-white border border-dark/10 shadow-sm space-y-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-accent/20 text-accent flex items-center justify-center text-lg font-bold">
                <i class="fa-solid fa-microphone"></i>
              </div>
              <div>
                <h2 class="font-black text-base text-dark">Artistas & Creadores</h2>
                <p class="text-xs text-dark/50">Perfiles públicos de agrupación</p>
              </div>
            </div>

            <div class="p-4 rounded-2xl bg-dark/5 border border-dark/10 flex items-center justify-between">
              <span class="text-xs font-bold text-dark/60">Perfiles Creados</span>
              <span class="text-2xl font-black text-dark font-mono">{{ metrics()!.total_artists_count }}</span>
            </div>

            <a routerLink="/super-admin/users">
              <button
                type="button"
                class="w-full mt-2 py-2.5 rounded-xl bg-dark hover:bg-dark/90 text-white text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <span>Gestionar Creadores y Roles</span>
                <i class="fa-solid fa-arrow-right"></i>
              </button>
            </a>
          </div>

          <!-- Users Box -->
          <div class="p-6 rounded-3xl bg-white border border-dark/10 shadow-sm space-y-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center text-lg font-bold">
                <i class="fa-solid fa-users"></i>
              </div>
              <div>
                <h2 class="font-black text-base text-dark">Usuarios Registrados</h2>
                <p class="text-xs text-dark/50">Cuentas totales de compradores y staff</p>
              </div>
            </div>

            <div class="p-4 rounded-2xl bg-dark/5 border border-dark/10 flex items-center justify-between">
              <span class="text-xs font-bold text-dark/60">Cuentas Registradas</span>
              <span class="text-2xl font-black text-dark font-mono">{{ metrics()!.total_users_count }}</span>
            </div>

            <a routerLink="/super-admin/users">
              <button
                type="button"
                class="w-full mt-2 py-2.5 rounded-xl bg-dark hover:bg-dark/90 text-white text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <span>Ver Todos los Usuarios</span>
                <i class="fa-solid fa-arrow-right"></i>
              </button>
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class SuperAdminDashboardComponent implements OnInit {
  private readonly superAdminService = inject(SuperAdminService);

  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly metrics = signal<PlatformGlobalMetrics | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadMetrics();
  }

  async loadMetrics(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const data = await this.superAdminService.getGlobalMetrics();
      this.metrics.set(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar las métricas globales.';
      this.errorMessage.set(msg);
    } finally {
      this.isLoading.set(false);
    }
  }
}
