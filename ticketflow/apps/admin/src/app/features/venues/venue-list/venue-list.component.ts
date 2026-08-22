import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CardComponent, ButtonComponent } from '@ticketflow/shared-ui';

@Component({
  selector: 'app-venue-list',
  standalone: true,
  imports: [CommonModule, RouterModule, CardComponent],

  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-dark tracking-tight">Sedes & Lugares</h1>
          <p class="text-sm text-dark/60 mt-1">Explora sedes y registra configuraciones de capacidad para tus eventos.</p>
        </div>
      </div>

      <tf-card>
        <div class="py-12 text-center text-dark/60">
          <div class="text-5xl mb-3">📍</div>
          <h3 class="text-lg font-bold text-dark">Módulo de Sedes (Fase 3)</h3>
          <p class="text-sm text-dark/60 max-w-md mx-auto mt-1">
            Aquí podrás seleccionar y registrar sedes en Google Maps, subir croquis/mapas y definir configuraciones de aforo.
          </p>
        </div>
      </tf-card>
    </div>
  `,
})
export class VenueListComponent {}
