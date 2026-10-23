import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'store-not-found',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <main class="min-h-[75vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16">
      <div class="max-w-xl w-full text-center space-y-8">
        <!-- Visual Icon / Badge -->
        <div class="relative inline-block">
          <div class="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-inverse-surface border-2 border-outline-variant/20 shadow-2xl flex items-center justify-center mx-auto relative overflow-hidden group">
            <div class="absolute inset-0 bg-gradient-to-tr from-primary/30 via-transparent to-tertiary/20 opacity-80"></div>
            <i class="fa-solid fa-ticket text-5xl sm:text-6xl text-tertiary"></i>
            <div class="absolute -bottom-2 -right-2 bg-error text-on-error text-xs font-bold px-2 py-0.5 rounded-full shadow">
              404
            </div>
          </div>
        </div>

        <!-- Text Content -->
        <div class="space-y-3">
          <span class="text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-3.5 py-1.5 rounded-full inline-block">
            Error 404 · Fuera de cartelera
          </span>
          <h1 class="text-3xl sm:text-5xl font-bold text-on-surface tracking-tight">
            ¡Ups! No encontramos este escenario
          </h1>
          <p class="text-sm sm:text-base text-on-surface-variant max-w-md mx-auto leading-relaxed">
            Parece que el concierto que buscas ya terminó, cambió de fecha o la dirección URL no es correcta.
          </p>
        </div>

        <!-- Action CTAs -->
        <div class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <a routerLink="/" class="w-full sm:w-auto">
            <button
              type="button"
              class="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-inverse-surface hover:bg-inverse-surface/90 text-inverse-on-surface font-bold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <i class="fa-solid fa-house"></i>
              <span>Ir al Inicio</span>
            </button>
          </a>

          <a routerLink="/search" class="w-full sm:w-auto">
            <button
              type="button"
              class="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <i class="fa-solid fa-magnifying-glass"></i>
              <span>Explorar Cartelera</span>
            </button>
          </a>
        </div>

        <!-- Help box -->
        <div class="pt-8 border-t border-outline-variant/30">
          <p class="text-xs text-on-surface-variant">
            ¿Buscas tus entradas compradas?
            <a routerLink="/my-tickets" class="text-primary font-bold hover:underline">
              Consulta tus boletos aquí
            </a>
            o revisa el correo de confirmación de tu compra.
          </p>
        </div>
      </div>
    </main>
  `,
})
export class NotFoundComponent {}
