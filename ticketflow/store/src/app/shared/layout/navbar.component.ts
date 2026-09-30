import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@ticketflow/data-access';
import { ThemeService } from '@ticketflow/shared-ui';

@Component({
  selector: 'store-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <header class="sticky top-0 z-50 bg-inverse-surface/95 backdrop-blur-md border-b border-outline-variant/20 text-inverse-on-surface shadow-md">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        <!-- Brand Logo -->
        <a routerLink="/" class="flex items-center gap-3 group flex-shrink-0">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary via-secondary to-tertiary flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
            <i class="fa-solid fa-ticket text-on-primary text-lg"></i>
          </div>
          <span class="text-xl sm:text-2xl font-bold tracking-tight text-inverse-on-surface flex items-center select-none">
            Boleto<span class="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-tertiary ml-0.5">Coqueto</span>
          </span>
        </a>

        <!-- Desktop Search Bar -->
        <div class="hidden md:flex items-center flex-1 max-w-md mx-6">
          <form (ngSubmit)="onSearchSubmit()" class="w-full relative">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-inverse-on-surface/50 text-sm">
              <i class="fa-solid fa-magnifying-glass"></i>
            </span>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              name="searchQuery"
              placeholder="Buscar conciertos, artistas o recintos..."
              class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-inverse-surface/80 border border-outline-variant/20 text-inverse-on-surface placeholder-inverse-on-surface/40 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/50 text-xs sm:text-sm transition-all shadow-inner"
            />
          </form>
        </div>

        <!-- Right Actions / User Navigation -->
        <div class="hidden sm:flex items-center gap-4">
          <a routerLink="/search" class="text-xs sm:text-sm font-semibold text-inverse-on-surface/80 hover:text-secondary transition-colors">
            Explorar Eventos
          </a>

          <!-- Theme Toggle Button -->
          <button
            type="button"
            (click)="themeService.toggleTheme()"
            class="p-2 rounded-xl bg-inverse-surface/60 hover:bg-inverse-surface/80 text-inverse-on-surface/80 border border-outline-variant/20 transition-colors shadow-sm flex items-center justify-center"
            [title]="themeService.isDark() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
            [attr.aria-label]="themeService.isDark() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
          >
            <i class="fa-solid text-sm" [ngClass]="themeService.isDark() ? 'fa-sun text-tertiary' : 'fa-moon text-inverse-on-surface/70'"></i>
          </button>


          <!-- Authenticated State -->
          <div *ngIf="auth.isAuthenticated()" class="flex items-center gap-3">
            <a routerLink="/my-tickets">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-inverse-surface/60 hover:bg-inverse-surface/80 text-inverse-on-surface/90 text-xs sm:text-sm font-bold border border-outline-variant/20 transition-colors shadow-sm"
              >
                <i class="fa-solid fa-ticket text-secondary"></i> Mis Boletos
              </button>
            </a>

            <!-- User Menu -->
            <div class="relative group">
              <button
                type="button"
                (click)="toggleUserMenu()"
                class="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-inverse-surface/60 hover:bg-inverse-surface/80 border border-outline-variant/20 transition-colors text-xs font-bold text-inverse-on-surface shadow-sm"
              >
                <div class="relative w-6 h-6 flex-shrink-0">
                  <img
                    *ngIf="auth.avatarUrl()"
                    [src]="auth.avatarUrl()!"
                    [alt]="'Foto de perfil de ' + userName"
                    class="w-6 h-6 rounded-full object-cover ring-1 ring-tertiary/50"
                  />
                  <div
                    *ngIf="!auth.avatarUrl()"
                    class="w-6 h-6 rounded-full bg-tertiary text-on-tertiary font-black flex items-center justify-center text-xs"
                  >
                    {{ userInitial }}
                  </div>
                </div>
                <span class="max-w-[110px] truncate text-inverse-on-surface/90">
                  {{ userName }}
                </span>
                <i class="fa-solid fa-chevron-down text-inverse-on-surface/50 text-[10px]"></i>
              </button>

              <!-- Dropdown -->
              <div
                *ngIf="showMenu()"
                class="absolute right-0 mt-2 w-52 rounded-2xl bg-inverse-surface text-inverse-on-surface shadow-2xl border border-outline-variant/20 py-2 z-50 animate-fade-in"
              >
                <div class="px-4 py-2.5 border-b border-outline-variant/20">
                  <p class="text-xs font-bold text-inverse-on-surface truncate">
                    {{ userName }}
                  </p>
                  <p class="text-[11px] text-inverse-on-surface/50 truncate mt-0.5">{{ auth.user()?.email }}</p>
                </div>

                <a
                  routerLink="/my-tickets"
                  (click)="showMenu.set(false)"
                  class="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-inverse-on-surface/80 hover:text-inverse-on-surface hover:bg-inverse-on-surface/5 transition-colors"
                >
                  <i class="fa-solid fa-ticket text-tertiary"></i>
                  <span>Mis Boletos Comprados</span>
                </a>

                <button
                  type="button"
                  (click)="onLogout()"
                  class="w-full text-left px-4 py-2.5 text-xs font-semibold text-error/80 hover:text-error hover:bg-error/10 transition-colors border-t border-outline-variant/20 flex items-center gap-2"
                >
                  <i class="fa-solid fa-right-from-bracket"></i>
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Guest State -->
          <div *ngIf="!auth.isAuthenticated()" class="flex items-center gap-3">
            <a routerLink="/login">
              <button
                type="button"
                class="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-inverse-on-surface/70 hover:text-inverse-on-surface hover:bg-inverse-on-surface/10 transition-colors"
              >
                Iniciar Sesión
              </button>
            </a>
            <a routerLink="/register">
              <button
                type="button"
                class="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-secondary hover:bg-secondary/90 text-on-secondary transition-all shadow-md shadow-secondary/20"
              >
                Crear Cuenta
              </button>
            </a>
          </div>
        </div>

        <!-- Mobile Menu Toggle Button -->
        <button
          type="button"
          (click)="toggleMobileMenu()"
          class="sm:hidden p-2 rounded-xl bg-inverse-surface/60 text-inverse-on-surface/70 hover:text-inverse-on-surface hover:bg-inverse-surface/80 transition-colors border border-outline-variant/20"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path *ngIf="!mobileMenuOpen()" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            <path *ngIf="mobileMenuOpen()" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Mobile Dropdown -->
      <div *ngIf="mobileMenuOpen()" class="sm:hidden bg-inverse-surface border-t border-outline-variant/20 px-4 py-5 space-y-4">
        <form (ngSubmit)="onSearchSubmit()" class="relative">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            name="mobileSearch"
            placeholder="Buscar conciertos, artistas..."
            class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-inverse-surface/60 border border-outline-variant/20 text-inverse-on-surface placeholder-inverse-on-surface/40 focus:outline-none focus:ring-2 focus:ring-primary/60 text-xs"
          />
          <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-inverse-on-surface/40 text-xs">
            <i class="fa-solid fa-magnifying-glass"></i>
          </span>
        </form>

        <div class="space-y-2 pt-2 border-t border-outline-variant/20">
          <a
            routerLink="/search"
            (click)="mobileMenuOpen.set(false)"
            class="block px-3 py-2 rounded-xl text-sm font-semibold text-inverse-on-surface/80 hover:bg-inverse-on-surface/10 hover:text-secondary"
          >
            Explorar Todos los Eventos
          </a>

          <ng-container *ngIf="auth.isAuthenticated()">
            <a
              routerLink="/my-tickets"
              (click)="mobileMenuOpen.set(false)"
              class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-secondary hover:bg-inverse-on-surface/10"
            >
              <i class="fa-solid fa-ticket text-secondary"></i>
              <span>Mis Boletos</span>
            </a>
            <button
              type="button"
              (click)="onLogout()"
              class="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-error/80 hover:bg-error/10 flex items-center gap-2"
            >
              <i class="fa-solid fa-right-from-bracket"></i>
              <span>Cerrar Sesión</span>
            </button>
          </ng-container>

          <ng-container *ngIf="!auth.isAuthenticated()">
            <div class="grid grid-cols-2 gap-3 pt-2">
              <a routerLink="/login" (click)="mobileMenuOpen.set(false)">
                <button
                  type="button"
                  class="w-full py-2.5 rounded-xl bg-inverse-surface/60 text-inverse-on-surface/80 text-xs font-bold border border-outline-variant/20 hover:bg-inverse-surface/80"
                >
                  Iniciar Sesión
                </button>
              </a>
              <a routerLink="/register" (click)="mobileMenuOpen.set(false)">
                <button
                  type="button"
                  class="w-full py-2.5 rounded-xl bg-secondary text-on-secondary text-xs font-bold hover:bg-secondary/90 shadow-md shadow-secondary/20"
                >
                  Registrarse
                </button>
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
  readonly themeService = inject(ThemeService);
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
