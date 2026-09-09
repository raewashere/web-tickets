import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'store-thank-you',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-8">
      <!-- Success Header Card -->
      <div class="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm text-center space-y-6 relative overflow-hidden">
        <div class="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-cyan-400 via-sky-500 to-emerald-400"></div>

        <!-- Animated Check Badge -->
        <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-emerald-50 border-2 border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto text-4xl sm:text-5xl shadow-inner">
          <i class="fa-solid fa-circle-check"></i>
        </div>

        <div class="space-y-3">
          <span class="text-xs font-black uppercase tracking-widest text-emerald-700 bg-emerald-100/80 px-3.5 py-1.5 rounded-full inline-block">
            ¡Compra Confirmada Exitosamente!
          </span>
          <h1 class="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            ¡Muchas gracias por tu compra!
          </h1>
          <p class="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
            Tus entradas ya han sido generadas y asignadas a tu cuenta. Recibirás todos los detalles y códigos de acceso seguros para disfrutar de tu espectáculo.
          </p>
        </div>

        <!-- Quick actions buttons -->
        <div class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <a routerLink="/my-tickets" class="w-full sm:w-auto">
            <button
              type="button"
              class="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <i class="fa-solid fa-ticket"></i>
              <span>Ver Mis Boletos y QR</span>
            </button>
          </a>

          <a routerLink="/search" class="w-full sm:w-auto">
            <button
              type="button"
              class="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <i class="fa-solid fa-magnifying-glass"></i>
              <span>Seguir Explorando Eventos</span>
            </button>
          </a>
        </div>
      </div>

      <!-- Instructions & Benefits Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Item 1 -->
        <div class="p-6 rounded-3xl border border-slate-200 bg-white space-y-3 shadow-sm">
          <div class="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-lg">
            <i class="fa-solid fa-mobile-screen"></i>
          </div>
          <h2 class="font-extrabold text-base text-slate-900">Boleto Digital QR</h2>
          <p class="text-xs text-slate-600 leading-relaxed">
            No necesitas imprimir nada. Muestra el código QR desde tu teléfono directamente en la puerta del recinto.
          </p>
        </div>

        <!-- Item 2 -->
        <div class="p-6 rounded-3xl border border-slate-200 bg-white space-y-3 shadow-sm">
          <div class="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center text-lg">
            <i class="fa-regular fa-envelope"></i>
          </div>
          <h2 class="font-extrabold text-base text-slate-900">Respaldo por Correo</h2>
          <p class="text-xs text-slate-600 leading-relaxed">
            Te enviamos el resumen de compra y comprobante a tu correo electrónico registrado.
          </p>
        </div>

        <!-- Item 3 -->
        <div class="p-6 rounded-3xl border border-slate-200 bg-white space-y-3 shadow-sm">
          <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
            <i class="fa-solid fa-shield-halved"></i>
          </div>
          <h2 class="font-extrabold text-base text-slate-900">Garantía 100%</h2>
          <p class="text-xs text-slate-600 leading-relaxed">
            Entradas oficiales verificadas con trazabilidad antifraude y reembolso ante cancelaciones imprevistas.
          </p>
        </div>
      </div>
    </main>
  `,
})
export class ThankYouComponent {}
