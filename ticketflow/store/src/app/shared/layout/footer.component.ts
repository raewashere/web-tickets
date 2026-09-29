import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'store-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <footer class="bg-dark text-surface/70 border-t border-surface/10 pt-16 pb-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          <!-- Col 1: Brand -->
          <div class="space-y-4 md:col-span-2">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary via-primary to-accent flex items-center justify-center shadow-md shadow-primary/30">
                <i class="fa-solid fa-ticket text-surface text-sm"></i>
              </div>
              <span class="text-xl sm:text-2xl font-bold tracking-tight text-surface flex items-center">
                Boleto<span class="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent/70 ml-0.5">Coqueto</span>
              </span>
            </div>
            <p class="text-xs sm:text-sm text-surface/50 max-w-sm leading-relaxed">
              La plataforma moderna y segura para compra directa de entradas a conciertos, festivales y espectáculos. Boletos 100% garantizados.
            </p>
            <div class="flex items-center gap-3 pt-2 text-xs text-surface/40">
              <span class="flex items-center gap-1.5"><i class="fa-solid fa-lock text-contrast"></i> Pagos cifrados SSL</span>
              <span>·</span>
              <span class="flex items-center gap-1.5"><i class="fa-solid fa-credit-card text-accent"></i> PayPal Verified</span>
            </div>
          </div>

          <!-- Col 2: Explorar -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-accent">Explorar</h4>
            <ul class="space-y-2 text-xs sm:text-sm text-surface/50">
              <li><a routerLink="/search" class="hover:text-surface transition-colors">Todos los Conciertos</a></li>
              <li><a routerLink="/search" [queryParams]="{ type: 'festivales' }" class="hover:text-surface transition-colors">Festivales</a></li>
              <li><a routerLink="/search" [queryParams]="{ type: 'teatro' }" class="hover:text-surface transition-colors">Teatro & Comedia</a></li>
              <li><a routerLink="/search" [queryParams]="{ type: 'rock' }" class="hover:text-surface transition-colors">Rock & Alternativo</a></li>
            </ul>
          </div>

          <!-- Col 3: Para Artistas & Soporte -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-primary/80">Creadores & Soporte</h4>
            <ul class="space-y-2 text-xs sm:text-sm text-surface/50">
              <li><a href="https://ticketflow-admin.vercel.app/" target="_blank" rel="noopener noreferrer" class="hover:text-surface transition-colors">Portal de Artistas</a></li>
              <li><a routerLink="/my-tickets" class="hover:text-surface transition-colors">Consultar Mis Boletos</a></li>
              <li><span class="text-surface/30">soporte&#64;boletocoqueto.app</span></li>
            </ul>
          </div>
        </div>

        <!-- Bottom Copyright -->
        <div class="pt-8 border-t border-surface/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-surface/30">
          <p>© 2026 BoletoCoqueto Technologies Inc. Todos los derechos reservados.</p>
          <div class="flex items-center gap-4">
            <a routerLink="/privacy" class="hover:text-surface/60 transition-colors">Política de Privacidad</a>
            <a routerLink="/thank-you" class="hover:text-surface/60 transition-colors">Garantía del Comprador</a>
          </div>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {}
