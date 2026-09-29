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
    <header class="sticky top-0 z-50 bg-dark/95 backdrop-blur-md border-b border-dark/80 text-surface shadow-md">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        <!-- Brand Logo -->
        <a routerLink="/" class="flex items-center gap-3 group flex-shrink-0">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary via-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
            <i class="fa-solid fa-ticket text-surface text-lg"></i>
          </div>
          <span class="text-xl sm:text-2xl font-black tracking-tight text-surface flex items-center select-none">
            Ticket<span class="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent/70 ml-0.5">Flow</span>
          </span>
        </a>

        <!-- Desktop Search Bar -->
        <div class="hidden md:flex items-center flex-1 max-w-md mx-6">
          <form (ngSubmit)="onSearchSubmit()" class="w-full relative">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface/50 text-sm">
              <i class="fa-solid fa-magnifying-glass"></i>
            </span>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              name="searchQuery"
              placeholder="Buscar conciertos, artistas o recintos..."
              class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark/80 border border-surface/20 text-surface placeholder-surface/40 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-transparent text-xs sm:text-sm transition-all shadow-inner"
            />
          </form>
        </div>

        <!-- Right Actions / User Navigation -->
        <div class="hidden sm:flex items-center gap-4">
          <a routerLink="/search" class="text-xs sm:text-sm font-semibold text-surface/80 hover:text-accent transition-colors">
            Explorar Eventos
          </a>

          <!-- Theme Toggle Button -->
          <button
            type="button"
            (click)="themeService.toggleTheme()"
            class="p-2 rounded-xl bg-dark/60 hover:bg-dark/80 text-surface/80 border border-surface/20 transition-colors shadow-sm flex items-center justify-center"
            [title]="themeService.isDark() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
            [attr.aria-label]="themeService.isDark() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
          >
            <i class="fa-solid text-sm" [ngClass]="themeService.isDark() ? 'fa-sun text-accent' : 'fa-moon text-surface/70'"></i>
          </button>


          <!-- Authenticated State -->
          <div *ngIf="auth.isAuthenticated()" class="flex items-center gap-3">
            <a routerLink="/my-tickets">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-dark/60 hover:bg-dark/80 text-surface/90 text-xs sm:text-sm font-bold border border-surface/20 transition-colors shadow-sm"
              >
                <i class="fa-solid fa-ticket text-accent"></i> Mis Boletos
              </button>
            </a>

            <!-- User Menu -->
            <div class="relative group">
              <button
                type="button"
                (click)="toggleUserMenu()"
                class="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-dark/60 hover:bg-dark/80 border border-surface/20 transition-colors text-xs font-bold text-surface shadow-sm"
              >
                <div class="relative w-6 h-6 flex-shrink-0">
                  <img
                    *ngIf="auth.avatarUrl()"
                    [src]="auth.avatarUrl()!"
                    [alt]="'Foto de perfil de ' + userName"
                    class="w-6 h-6 rounded-full object-cover ring-1 ring-accent/50"
                  />
                  <div
                    *ngIf="!auth.avatarUrl()"
                    class="w-6 h-6 rounded-full bg-accent text-dark font-black flex items-center justify-center text-xs"
                  >
                    {{ userInitial }}
                  </div>
                </div>
                <span class="max-w-[110px] truncate text-surface/90">
                  {{ userName }}
                </span>
                <i class="fa-solid fa-chevron-down text-surface/50 text-[10px]"></i>
              </button>

              <!-- Dropdown -->
              <div
                *ngIf="showMenu()"
                class="absolute right-0 mt-2 w-52 rounded-2xl bg-dark text-surface shadow-2xl border border-surface/10 py-2 z-50 animate-fade-in"
              >
                <div class="px-4 py-2.5 border-b border-surface/10">
                  <p class="text-xs font-bold text-surface truncate">
                    {{ userName }}
                  </p>
                  <p class="text-[11px] text-surface/50 truncate mt-0.5">{{ auth.user()?.email }}</p>
                </div>

                <a
                  routerLink="/my-tickets"
                  (click)="showMenu.set(false)"
                  class="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-surface/80 hover:text-surface hover:bg-surface/5 transition-colors"
                >
                  <i class="fa-solid fa-ticket text-accent"></i>
                  <span>Mis Boletos Comprados</span>
                </a>

                <button
                  type="button"
                  (click)="onLogout()"
                  class="w-full text-left px-4 py-2.5 text-xs font-semibold text-accent/80 hover:text-accent hover:bg-accent/10 transition-colors border-t border-surface/10 flex items-center gap-2"
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
                class="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-surface/70 hover:text-surface hover:bg-surface/10 transition-colors"
              >
                Iniciar Sesión
              </button>
            </a>
            <a routerLink="/register">
              <button
                type="button"
                class="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-accent hover:bg-accent/90 text-dark transition-all shadow-md shadow-accent/20"
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
          class="sm:hidden p-2 rounded-xl bg-dark/60 text-surface/70 hover:text-surface hover:bg-dark/80 transition-colors border border-surface/20"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path *ngIf="!mobileMenuOpen()" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            <path *ngIf="mobileMenuOpen()" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Mobile Dropdown -->
      <div *ngIf="mobileMenuOpen()" class="sm:hidden bg-dark border-t border-surface/10 px-4 py-5 space-y-4">
        <form (ngSubmit)="onSearchSubmit()" class="relative">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            name="mobileSearch"
            placeholder="Buscar conciertos, artistas..."
            class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark/60 border border-surface/20 text-surface placeholder-surface/40 text-xs"
          />
          <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface/40 text-xs">
            <i class="fa-solid fa-magnifying-glass"></i>
          </span>
        </form>

        <div class="space-y-2 pt-2 border-t border-surface/10">
          <a
            routerLink="/search"
            (click)="mobileMenuOpen.set(false)"
            class="block px-3 py-2 rounded-xl text-sm font-semibold text-surface/80 hover:bg-surface/10"
          >
            Explorar Todos los Eventos
          </a>

          <ng-container *ngIf="auth.isAuthenticated()">
            <a
              routerLink="/my-tickets"
              (click)="mobileMenuOpen.set(false)"
              class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-accent hover:bg-surface/10"
            >
              <i class="fa-solid fa-ticket"></i>
              <span>Mis Boletos</span>
            </a>
            <button
              type="button"
              (click)="onLogout()"
              class="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-accent/80 hover:bg-accent/10 flex items-center gap-2"
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
                  class="w-full py-2.5 rounded-xl bg-dark/60 text-surface/80 text-xs font-bold border border-surface/20 hover:bg-dark/80"
                >
                  Iniciar Sesión
                </button>
              </a>
              <a routerLink="/register" (click)="mobileMenuOpen.set(false)">
                <button
                  type="button"
                  class="w-full py-2.5 rounded-xl bg-accent text-dark text-xs font-bold hover:bg-accent/90"
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
