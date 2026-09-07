import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'store-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <footer class="bg-slate-950 text-slate-300 border-t border-slate-800/80 pt-16 pb-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          <!-- Col 1: Brand -->
          <div class="space-y-4 md:col-span-2">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-indigo-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
                <span class="text-slate-950 font-black text-sm">🎫</span>
              </div>
              <span class="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center">
                Ticket<span class="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-300 ml-0.5">Flow</span>
              </span>
            </div>
            <p class="text-xs sm:text-sm text-slate-400 max-w-sm leading-relaxed">
              La plataforma moderna y segura para compra directa de entradas a conciertos, festivales y espectáculos. Boletos 100% garantizados.
            </p>
            <div class="flex items-center gap-3 pt-2 text-xs text-slate-400">
              <span class="flex items-center gap-1.5"><span class="text-cyan-400">🔒</span> Pagos cifrados SSL</span>
              <span>·</span>
              <span class="flex items-center gap-1.5"><span class="text-amber-400">💳</span> PayPal Verified</span>
            </div>
          </div>

          <!-- Col 2: Explorar -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-cyan-400">Explorar</h4>
            <ul class="space-y-2 text-xs sm:text-sm text-slate-400">
              <li><a routerLink="/search" class="hover:text-white transition-colors">Todos los Conciertos</a></li>
              <li><a routerLink="/search" [queryParams]="{ type: 'festivales' }" class="hover:text-white transition-colors">Festivales</a></li>
              <li><a routerLink="/search" [queryParams]="{ type: 'teatro' }" class="hover:text-white transition-colors">Teatro & Comedia</a></li>
              <li><a routerLink="/search" [queryParams]="{ type: 'rock' }" class="hover:text-white transition-colors">Rock & Alternativo</a></li>
            </ul>
          </div>

          <!-- Col 3: Para Artistas & Soporte -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-amber-400">Creadores & Soporte</h4>
            <ul class="space-y-2 text-xs sm:text-sm text-slate-400">
              <li><a href="https://ticketflow-admin.vercel.app/" target="_blank" rel="noopener noreferrer" class="hover:text-white transition-colors">Portal de Artistas</a></li>
              <li><a routerLink="/my-tickets" class="hover:text-white transition-colors">Consultar Mis Boletos</a></li>
              <li><span class="text-slate-500">soporte&#64;ticketflow.app</span></li>
            </ul>
          </div>
        </div>

        <!-- Bottom Copyright -->
        <div class="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 TicketFlow Technologies Inc. Todos los derechos reservados.</p>
          <div class="flex items-center gap-4">
            <span class="hover:text-slate-300 cursor-pointer transition-colors">Términos del Servicio</span>
            <span class="hover:text-slate-300 cursor-pointer transition-colors">Política de Privacidad</span>
            <span class="hover:text-slate-300 cursor-pointer transition-colors">Garantía del Comprador</span>
          </div>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {}
