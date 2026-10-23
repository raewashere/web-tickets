import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'store-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <footer class="bg-inverse-surface text-inverse-on-surface/70 border-t border-outline-variant/20 pt-16 pb-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          <!-- Col 1: Brand -->
          <div class="space-y-4 md:col-span-2">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary via-secondary to-tertiary flex items-center justify-center shadow-md shadow-primary/30">
                <i class="fa-solid fa-ticket text-on-primary text-sm"></i>
              </div>
              <span class="text-xl sm:text-2xl font-bold tracking-tight text-inverse-on-surface flex items-center">
                Boleto<span class="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-tertiary ml-0.5">Coqueto</span>
              </span>
            </div>
            <p class="text-xs sm:text-sm text-inverse-on-surface/50 max-w-sm leading-relaxed">
              Boletos 100% oficiales directo de tus artistas favoritos, sin intermediarios ni cargos sorpresa. Compra en 1 minuto sin crear cuenta y recibe tu acceso QR al instante.
            </p>
            <div class="flex flex-wrap items-center gap-3 pt-2 text-xs text-inverse-on-surface/40">
              <span class="flex items-center gap-1.5"><i class="fa-solid fa-lock text-secondary"></i> Cifrado SSL 256-bit</span>
              <span>·</span>
              <span class="flex items-center gap-1.5"><i class="fa-solid fa-credit-card text-secondary"></i> Protección PayPal</span>
              <span>·</span>
              <span class="flex items-center gap-1.5"><i class="fa-solid fa-qrcode text-secondary"></i> QR Antifraude</span>
            </div>
          </div>

          <!-- Col 2: Explorar -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-secondary">Explorar Cartelera</h4>
            <ul class="space-y-2 text-xs sm:text-sm text-inverse-on-surface/50">
              <li><a routerLink="/search" class="hover:text-inverse-on-surface transition-colors">Todos los Conciertos</a></li>
              <li><a routerLink="/search" [queryParams]="{ type: 'festival' }" class="hover:text-inverse-on-surface transition-colors">Festivales en Vivo</a></li>
              <li><a routerLink="/search" [queryParams]="{ type: 'teatro' }" class="hover:text-inverse-on-surface transition-colors">Teatro & Comedia</a></li>
              <li><a routerLink="/search" [queryParams]="{ type: 'rock' }" class="hover:text-inverse-on-surface transition-colors">Rock & Alternativo</a></li>
            </ul>
          </div>

          <!-- Col 3: Para Artistas & Soporte -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-secondary">Creadores & Soporte</h4>
            <ul class="space-y-2 text-xs sm:text-sm text-inverse-on-surface/50">
              <li><a href="https://ticketflow-admin.vercel.app/" target="_blank" rel="noopener noreferrer" class="hover:text-inverse-on-surface transition-colors">Portal para Artistas</a></li>
              <li><a routerLink="/my-tickets" class="hover:text-inverse-on-surface transition-colors">Consultar Mis Boletos</a></li>
              <li><a href="mailto:soporte@boletocoqueto.app" class="hover:text-inverse-on-surface transition-colors text-inverse-on-surface/40">soporte&#64;boletocoqueto.app</a></li>
            </ul>
          </div>
        </div>

        <!-- Bottom Copyright -->
        <div class="pt-8 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-inverse-on-surface/30">
          <p>© 2026 BoletoCoqueto. Todos los derechos reservados. Hecho para la música en vivo.</p>
          <div class="flex items-center gap-4">
            <a routerLink="/privacy" class="hover:text-inverse-on-surface/60 transition-colors">Aviso de Privacidad</a>
            <a routerLink="/privacy" fragment="garantia" class="hover:text-inverse-on-surface/60 transition-colors">Garantía del Comprador</a>
          </div>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {}
