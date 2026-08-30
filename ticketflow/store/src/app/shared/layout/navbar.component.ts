import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@ticketflow/data-access';
import { ButtonComponent } from '@ticketflow/shared-ui';

@Component({
  selector: 'store-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ButtonComponent],
  template: `
    <header class="sticky top-0 z-40 bg-dark/95 backdrop-blur-md border-b border-surface/10 text-surface">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        <!-- Brand Logo -->
        <a routerLink="/" class="flex items-center gap-2.5 group flex-shrink-0">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary via-accent to-contrast flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <span class="text-dark font-black text-lg leading-none">🎫</span>
          </div>
          <span class="text-xl font-black tracking-tight text-surface">
            Ticket<span class="text-primary">Flow</span>
          </span>
        </a>

        <!-- Desktop Search Bar -->
        <div class="hidden md:flex items-center flex-1 max-w-md mx-4">
          <form (ngSubmit)="onSearchSubmit()" class="w-full relative">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface/40 text-sm">
              🔍
            </span>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              name="searchQuery"
              placeholder="Buscar conciertos, artistas o recintos..."
              class="w-full pl-10 pr-4 py-2 rounded-2xl bg-surface/10 border border-surface/15 text-surface placeholder-surface/40 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface/15 text-xs transition-all"
            />
          </form>
        </div>

        <!-- Right Actions / User Navigation -->
        <div class="hidden sm:flex items-center gap-4">
          <a routerLink="/search" class="text-xs font-semibold text-surface/80 hover:text-primary transition-colors">
            Explorar Eventos
          </a>

          <!-- Authenticated State -->
          <div *ngIf="auth.isAuthenticated()" class="flex items-center gap-3">
            <a routerLink="/my-tickets">
              <tf-button variant="secondary" size="sm">
                🎟️ Mis Boletos
              </tf-button>
            </a>

            <!-- User Menu -->
            <div class="relative group">
              <button
                type="button"
                (click)="toggleUserMenu()"
                class="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-surface/10 hover:bg-surface/20 transition-colors text-xs font-bold text-surface"
              >
                <div class="w-6 h-6 rounded-full bg-primary text-dark font-black flex items-center justify-center text-xs">
                  {{ userInitial }}
                </div>
                <span class="max-w-[100px] truncate">
                  {{ userName }}
                </span>
                <svg class="w-3.5 h-3.5 text-surface/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7-7 7-7" />
                </svg>
              </button>

              <!-- Dropdown -->
              <div
                *ngIf="showMenu()"
                class="absolute right-0 mt-2 w-48 rounded-2xl bg-surface text-dark shadow-2xl border border-dark/10 py-2 z-50 animate-fade-in"
              >
                <div class="px-4 py-2 border-b border-dark/10">
                  <p class="text-xs font-bold text-dark truncate">
                    {{ userName }}
                  </p>
                  <p class="text-[10px] text-dark/50 truncate">{{ auth.user()?.email }}</p>
                </div>

                <a
                  routerLink="/my-tickets"
                  (click)="showMenu.set(false)"
                  class="block px-4 py-2 text-xs font-semibold text-dark hover:bg-dark/5 transition-colors"
                >
                  🎟️ Mis Boletos Comprados
                </a>

                <button
                  type="button"
                  (click)="onLogout()"
                  class="w-full text-left px-4 py-2 text-xs font-semibold text-contrast hover:bg-contrast/10 transition-colors border-t border-dark/10"
                >
                  🚪 Cerrar Sesión
                </button>
              </div>
            </div>
          </div>

          <!-- Guest State -->
          <div *ngIf="!auth.isAuthenticated()" class="flex items-center gap-2.5">
            <a routerLink="/login">
              <tf-button variant="ghost" size="sm" class="!text-surface hover:!bg-surface/10">
                Iniciar Sesión
              </tf-button>
            </a>
            <a routerLink="/register">
              <tf-button variant="primary" size="sm">
                Crear Cuenta
              </tf-button>
            </a>
          </div>
        </div>

        <!-- Mobile Menu Toggle Button -->
        <button
          type="button"
          (click)="toggleMobileMenu()"
          class="sm:hidden p-2 rounded-xl bg-surface/10 text-surface hover:bg-surface/20 transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path *ngIf="!mobileMenuOpen()" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            <path *ngIf="mobileMenuOpen()" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Mobile Dropdown -->
      <div *ngIf="mobileMenuOpen()" class="sm:hidden bg-dark/98 border-t border-surface/10 px-4 py-5 space-y-4">
        <form (ngSubmit)="onSearchSubmit()" class="relative">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            name="mobileSearch"
            placeholder="Buscar conciertos, artistas..."
            class="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface/10 border border-surface/15 text-surface placeholder-surface/40 text-xs"
          />
          <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface/40 text-xs">
            🔍
          </span>
        </form>

        <div class="space-y-2 pt-2 border-t border-surface/10">
          <a
            routerLink="/search"
            (click)="mobileMenuOpen.set(false)"
            class="block px-3 py-2 rounded-lg text-sm font-semibold text-surface/90 hover:bg-surface/10"
          >
            Explorar Todos los Eventos
          </a>

          <ng-container *ngIf="auth.isAuthenticated()">
            <a
              routerLink="/my-tickets"
              (click)="mobileMenuOpen.set(false)"
              class="block px-3 py-2 rounded-lg text-sm font-semibold text-primary hover:bg-surface/10"
            >
              🎟️ Mis Boletos
            </a>
            <button
              type="button"
              (click)="onLogout()"
              class="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-contrast hover:bg-contrast/10"
            >
              🚪 Cerrar Sesión
            </button>
          </ng-container>

          <ng-container *ngIf="!auth.isAuthenticated()">
            <div class="grid grid-cols-2 gap-3 pt-2">
              <a routerLink="/login" (click)="mobileMenuOpen.set(false)">
                <tf-button variant="secondary" size="sm" class="w-full">
                  Iniciar Sesión
                </tf-button>
              </a>
              <a routerLink="/register" (click)="mobileMenuOpen.set(false)">
                <tf-button variant="primary" size="sm" class="w-full">
                  Registrarse
                </tf-button>
              </a>
            </div>
          </ng-container>
        </div>
      </div>
    </header>
  `,
})
export class NavbarComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  searchQuery = '';
  readonly showMenu = signal(false);
  readonly mobileMenuOpen = signal(false);

  get userName(): string {
    const u = this.auth.user();
    if (!u) return 'Usuario';
    return (u.user_metadata?.['full_name'] as string) || (u.email ? u.email.split('@')[0] : 'Usuario');
  }

  get userInitial(): string {
    return (this.userName[0] || 'U').toUpperCase();
  }

  toggleUserMenu(): void {
    this.showMenu.update((v) => !v);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  onSearchSubmit(): void {
    const q = this.searchQuery.trim();
    this.mobileMenuOpen.set(false);
    if (q) {
      this.router.navigate(['/search'], { queryParams: { q } });
    } else {
      this.router.navigate(['/search']);
    }
  }

  async onLogout(): Promise<void> {
    this.showMenu.set(false);
    this.mobileMenuOpen.set(false);
    await this.auth.logout();
    this.router.navigate(['/']);
  }
}
