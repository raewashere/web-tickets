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
  selector: 'app-backoffice-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- Mobile Backdrop -->
    <div
      *ngIf="isOpen"
      class="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
      (click)="closeSidebar.emit()"
    ></div>

    <!-- Sidebar Container -->
    <aside
      class="fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-[#0d1117] text-surface transition-transform duration-300 ease-in-out lg:translate-x-0 border-r border-white/10"
      [class.translate-x-0]="isOpen"
      [class.-translate-x-full]="!isOpen"
    >
      <!-- Brand Header -->
      <div class="flex items-center justify-between h-16 px-6 border-b border-white/10 bg-black/40">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-accent text-dark font-black text-xl flex items-center justify-center shadow-md">
            ⚡
          </div>
          <div>
            <h1 class="font-black text-lg tracking-tight text-white leading-none">TicketFlow</h1>
            <span class="text-[10px] uppercase font-black tracking-widest text-accent">GLOBAL BACKOFFICE</span>
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
          *ngFor="let item of navItems"
          [routerLink]="item.route"
          [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
          routerLinkActive="bg-accent/20 text-accent border-r-4 border-accent font-bold"
          class="flex items-center gap-3 px-4 py-3 rounded-xl text-surface/70 hover:text-white hover:bg-white/5 transition-all text-sm group"
          (click)="closeSidebar.emit()"
        >
          <span class="text-lg group-hover:scale-110 transition-transform">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </a>
      </nav>

      <!-- User Footer -->
      <div class="p-4 border-t border-white/10 bg-black/40">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-9 h-9 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center border border-accent/30 text-sm overflow-hidden flex-shrink-0">
            <img
              *ngIf="auth.avatarUrl()"
              [src]="auth.avatarUrl()!"
              [alt]="auth.user()?.email || 'Avatar'"
              class="w-full h-full object-cover"
            />
            <span *ngIf="!auth.avatarUrl()">{{ userInitial }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-bold text-white truncate">Super Admin</p>
            <p class="text-[11px] text-surface/50 truncate">{{ auth.user()?.email }}</p>
          </div>
        </div>

        <button
          type="button"
          (click)="logout()"
          class="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-colors border border-rose-500/20"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar Sesión Backoffice
        </button>
      </div>
    </aside>
  `,
})
export class BackofficeSidebarComponent {
  readonly auth = inject(AuthService);

  @Input() isOpen = false;
  @Output() closeSidebar = new EventEmitter<void>();

  readonly navItems: NavItem[] = [
    { label: 'Métricas Globales', route: '/dashboard', icon: '📊', exact: true },
    { label: 'Eventos Globales', route: '/events', icon: '🎪' },
    { label: 'Artistas & Finanzas', route: '/artists', icon: '🎤' },
    { label: 'Liquidaciones / Payouts', route: '/payouts', icon: '💳' },
    { label: 'Gestión de Reembolsos', route: '/refunds', icon: '💸' },
    { label: 'Moderar Recintos', route: '/venues', icon: '📍' },
    { label: 'Usuarios y Roles', route: '/users', icon: '👥' },
  ];

  get userInitial(): string {
    const email = this.auth.user()?.email || 'S';
    return email.charAt(0).toUpperCase();
  }

  async logout(): Promise<void> {
    await this.auth.logout();
  }
}
