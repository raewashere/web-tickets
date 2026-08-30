import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'store-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <footer class="bg-dark text-surface border-t border-surface/10 pt-16 pb-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          <!-- Col 1: Brand -->
          <div class="space-y-4 md:col-span-2">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary via-accent to-contrast flex items-center justify-center">
                <span class="text-dark font-black text-sm">🎫</span>
              </div>
              <span class="text-xl font-black tracking-tight text-surface">
                Ticket<span class="text-primary">Flow</span>
              </span>
            </div>
            <p class="text-xs text-surface/60 max-w-sm leading-relaxed">
              La plataforma moderna y segura para compra directa de entradas a conciertos, festivales y espectáculos. Boletos 100% garantizados.
            </p>
            <div class="flex items-center gap-3 pt-2 text-xs text-surface/50">
              <span>🔒 Pagos cifrados SSL</span>
              <span>·</span>
              <span>💳 PayPal Verified</span>
            </div>
          </div>

          <!-- Col 2: Explorar -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-primary">Explorar</h4>
            <ul class="space-y-2 text-xs text-surface/70">
              <li><a routerLink="/search" class="hover:text-surface transition-colors">Todos los Conciertos</a></li>
              <li><a routerLink="/search" [queryParams]="{ type: 'festivales' }" class="hover:text-surface transition-colors">Festivales</a></li>
              <li><a routerLink="/search" [queryParams]="{ type: 'teatro' }" class="hover:text-surface transition-colors">Teatro & Comedia</a></li>
              <li><a routerLink="/search" [queryParams]="{ type: 'rock' }" class="hover:text-surface transition-colors">Rock & Alternativo</a></li>
            </ul>
          </div>

          <!-- Col 3: Para Artistas & Soporte -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-accent">Creadores & Soporte</h4>
            <ul class="space-y-2 text-xs text-surface/70">
              <li><a routerLink="/login" class="hover:text-surface transition-colors">Portal de Artistas</a></li>
              <li><a routerLink="/my-tickets" class="hover:text-surface transition-colors">Consultar Mis Boletos</a></li>
              <li><span class="text-surface/40">soporte&#64;ticketflow.app</span></li>
            </ul>
          </div>
        </div>

        <!-- Bottom Copyright -->
        <div class="pt-8 border-t border-surface/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-surface/40">
          <p>© 2026 TicketFlow Technologies Inc. Todos los derechos reservados.</p>
          <div class="flex items-center gap-4">
            <span class="hover:text-surface cursor-pointer">Términos del Servicio</span>
            <span class="hover:text-surface cursor-pointer">Política de Privacidad</span>
            <span class="hover:text-surface cursor-pointer">Garantía del Comprador</span>
          </div>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {}
