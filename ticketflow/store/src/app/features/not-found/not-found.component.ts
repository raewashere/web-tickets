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
          <div class="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-slate-900 border-2 border-slate-800 shadow-2xl flex items-center justify-center mx-auto relative overflow-hidden group">
            <div class="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 via-transparent to-rose-500/20 opacity-80"></div>
            <i class="fa-solid fa-ticket text-5xl sm:text-6xl text-cyan-400"></i>
            <div class="absolute -bottom-2 -right-2 bg-rose-500 text-white text-xs font-black px-2 py-0.5 rounded-full shadow">
              404
            </div>
          </div>
        </div>

        <!-- Text Content -->
        <div class="space-y-3">
          <span class="text-xs font-extrabold uppercase tracking-widest text-cyan-600 bg-cyan-50 border border-cyan-200/60 px-3.5 py-1.5 rounded-full inline-block">
            Error 404 · Fuera de cartelera
          </span>
          <h1 class="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            ¡Ups! No encontramos esta página
          </h1>
          <p class="text-sm sm:text-base text-slate-600 max-w-md mx-auto leading-relaxed">
            Parece que el evento que buscas cambió de fecha, la entrada ya no existe o la dirección URL es incorrecta.
          </p>
        </div>

        <!-- Action CTAs -->
        <div class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <a routerLink="/" class="w-full sm:w-auto">
            <button
              type="button"
              class="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <i class="fa-solid fa-house"></i>
              <span>Ir al Inicio</span>
            </button>
          </a>

          <a routerLink="/search" class="w-full sm:w-auto">
            <button
              type="button"
              class="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-bold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <i class="fa-solid fa-magnifying-glass"></i>
              <span>Explorar Cartelera</span>
            </button>
          </a>
        </div>

        <!-- Help box -->
        <div class="pt-8 border-t border-slate-200/80">
          <p class="text-xs text-slate-500">
            ¿Crees que se trata de un error?
            <a routerLink="/my-tickets" class="text-cyan-600 font-bold hover:underline">
              Revisa tus boletos adquiridos
            </a>
            o consulta nuestro soporte.
          </p>
        </div>
      </div>
    </main>
  `,
})
export class NotFoundComponent {}
