import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CardComponent, ButtonComponent } from '@ticketflow/shared-ui';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [CommonModule, RouterModule, CardComponent],

  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-dark tracking-tight">Mis Eventos</h1>
          <p class="text-sm text-dark/60 mt-1">Administra tus conciertos, festivales y venta de boletos.</p>
        </div>
      </div>

      <tf-card>
        <div class="py-12 text-center text-dark/60">
          <div class="text-5xl mb-3">🎪</div>
          <h3 class="text-lg font-bold text-dark">Módulo de Eventos (Fase 4)</h3>
          <p class="text-sm text-dark/60 max-w-md mx-auto mt-1">
            Aquí podrás crear eventos, configurar tipos de boletos, códigos de descuento/cortesías y publicar tus fechas.
          </p>
        </div>
      </tf-card>
    </div>
  `,
})
export class EventListComponent {}
