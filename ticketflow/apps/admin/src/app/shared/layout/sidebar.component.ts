import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '@ticketflow/data-access';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  exact?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- Mobile Backdrop -->
    <div
      *ngIf="isOpen"
      class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
      (click)="closeSidebar.emit()"
    ></div>

    <!-- Sidebar Container -->
    <aside
      class="fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-dark text-surface transition-transform duration-300 ease-in-out lg:translate-x-0 border-r border-white/10"
      [class.translate-x-0]="isOpen"
      [class.-translate-x-full]="!isOpen"
    >
      <!-- Brand Header -->
      <div class="flex items-center justify-between h-16 px-6 border-b border-white/10">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-black text-xl shadow-sm border border-primary/30">
            TF
          </div>
          <div>
            <h1 class="font-bold text-lg tracking-tight text-white leading-none">TicketFlow</h1>
            <span class="text-[10px] uppercase font-bold tracking-widest text-primary">Artist Portal</span>
          </div>
        </div>

        <button
          type="button"
          class="p-1.5 rounded-lg text-surface/60 hover:text-white hover:bg-white/10 lg:hidden"
          (click)="closeSidebar.emit()"
          aria-label="Cerrar menú"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Navigation Links -->
      <nav class="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        <a
          *ngFor="let item of visibleNavItems"
          [routerLink]="item.route"
          [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
          routerLinkActive="bg-primary/15 text-primary border-r-4 border-primary font-semibold"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-surface/70 hover:text-white hover:bg-white/5 transition-all text-sm group"
          (click)="closeSidebar.emit()"
        >
          <span class="text-lg group-hover:scale-110 transition-transform">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </a>
      </nav>

      <!-- User footer -->
      <div class="p-4 border-t border-white/10 bg-black/20">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-9 h-9 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center border border-primary/30 text-sm overflow-hidden flex-shrink-0">
            <img
              *ngIf="auth.avatarUrl()"
              [src]="auth.avatarUrl()!"
              [alt]="auth.user()?.email || 'Avatar'"
              class="w-full h-full object-cover"
            />
            <span *ngIf="!auth.avatarUrl()">{{ userInitial }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white truncate">
              {{ auth.user()?.user_metadata?.['full_name'] || auth.user()?.email || 'Validador' }}
            </p>
            <p class="text-xs text-surface/50 truncate">{{ auth.user()?.email }}</p>
          </div>
        </div>

        <button
          type="button"
          (click)="logout()"
          class="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-contrast/90 bg-contrast/10 hover:bg-contrast/20 rounded-lg transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  `,
})
export class SidebarComponent {
  readonly auth = inject(AuthService);

  @Input() isOpen = false;
  @Output() closeSidebar = new EventEmitter<void>();

  private readonly artistNavItems: NavItem[] = [
    { label: 'Panel Principal', route: '/dashboard', icon: '📊', exact: true },
    { label: 'Perfil de Artista', route: '/artist/profile', icon: '🎤' },
    { label: 'Mis Eventos', route: '/events', icon: '🎪' },
    { label: 'Control de Acceso', route: '/access-control', icon: '🛡️' },
    { label: 'Sedes & Lugares', route: '/venues', icon: '📍' },
  ];

  private readonly superAdminNavItems: NavItem[] = [
    { label: 'Métricas Globales', route: '/super-admin', icon: '⚡', exact: true },
    { label: 'Moderar Recintos', route: '/super-admin/venues', icon: '📍' },
    { label: 'Usuarios y Roles', route: '/super-admin/users', icon: '👥' },
  ];

  get visibleNavItems(): NavItem[] {
    const roles = this.auth.roles();
    const isDoormanOnly = roles.includes('doorman') && !roles.includes('admin') && !roles.includes('artist');
    if (isDoormanOnly) {
      return this.artistNavItems.filter((item) => item.route === '/access-control');
    }

    if (this.auth.isAdmin()) {
      return [...this.superAdminNavItems, ...this.artistNavItems];
    }

    return this.artistNavItems;
  }

  get userInitial(): string {
    const name =
      this.auth.user()?.user_metadata?.['full_name'] ||
      this.auth.user()?.email ||
      'A';
    return name.charAt(0).toUpperCase();
  }

  async logout(): Promise<void> {
    await this.auth.logout();
  }
}
