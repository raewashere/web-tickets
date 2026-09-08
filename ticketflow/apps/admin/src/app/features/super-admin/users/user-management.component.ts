import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuperAdminService } from '../super-admin.service';
import type { SuperAdminUserItem, RoleType } from '@ticketflow/models';
import { SpinnerComponent, BadgeComponent } from '@ticketflow/shared-ui';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, SpinnerComponent, BadgeComponent],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span class="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full inline-block mb-2">
            Administración de Usuarios
          </span>
          <h1 class="text-2xl sm:text-3xl font-black text-dark tracking-tight">
            Gestión Global de Usuarios y Roles
          </h1>
          <p class="text-xs sm:text-sm text-dark/60 mt-1">
            Asigna o revoca manualmente permisos de Super-Admin, Artista, Doorman o Comprador.
          </p>
        </div>

        <button
          type="button"
          (click)="loadUsers()"
          class="px-4 py-2 rounded-xl bg-white border border-dark/10 hover:bg-dark/5 text-dark font-bold text-xs shadow-sm transition flex items-center gap-2 self-start sm:self-auto"
        >
          <span>🔄</span>
          <span>Actualizar Cuentas</span>
        </button>
      </div>

      <!-- Filters & Search Bar -->
      <div class="p-4 rounded-2xl bg-white border border-dark/10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <!-- Search Input -->
        <div class="w-full md:max-w-md relative">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="Buscar por correo o nombre de usuario..."
            class="w-full pl-10 pr-4 py-2 rounded-xl border border-dark/20 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <span class="absolute left-3.5 top-2.5 text-dark/40 text-sm">🔍</span>
        </div>

        <!-- Role Filter Tabs -->
        <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            (click)="selectedRoleFilter.set('all')"
            [class.bg-dark]="selectedRoleFilter() === 'all'"
            [class.text-white]="selectedRoleFilter() === 'all'"
            [class.bg-dark/5]="selectedRoleFilter() !== 'all'"
            [class.text-dark]="selectedRoleFilter() !== 'all'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
          >
            Todos ({{ users().length }})
          </button>
          <button
            type="button"
            (click)="selectedRoleFilter.set('admin')"
            [class.bg-contrast]="selectedRoleFilter() === 'admin'"
            [class.text-white]="selectedRoleFilter() === 'admin'"
            [class.bg-contrast/10]="selectedRoleFilter() !== 'admin'"
            [class.text-contrast]="selectedRoleFilter() !== 'admin'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
          >
            Admins
          </button>
          <button
            type="button"
            (click)="selectedRoleFilter.set('artist')"
            [class.bg-accent]="selectedRoleFilter() === 'artist'"
            [class.text-dark]="selectedRoleFilter() === 'artist'"
            [class.bg-accent/20]="selectedRoleFilter() !== 'artist'"
            [class.text-dark]="selectedRoleFilter() !== 'artist'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
          >
            Artistas
          </button>
          <button
            type="button"
            (click)="selectedRoleFilter.set('doorman')"
            [class.bg-primary]="selectedRoleFilter() === 'doorman'"
            [class.text-dark]="selectedRoleFilter() === 'doorman'"
            [class.bg-primary/20]="selectedRoleFilter() !== 'doorman'"
            [class.text-dark]="selectedRoleFilter() !== 'doorman'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
          >
            Doormen
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="py-24 flex flex-col items-center justify-center gap-3">
        <tf-spinner size="lg"></tf-spinner>
        <p class="text-xs text-dark/50">Cargando directorio de usuarios...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMessage()" class="p-4 rounded-2xl bg-contrast/10 border border-contrast/20 text-contrast text-xs">
        {{ errorMessage() }}
      </div>

      <!-- Users Table Card -->
      <div *ngIf="!isLoading() && filteredUsers().length > 0" class="bg-white rounded-2xl border border-dark/10 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs sm:text-sm">
            <thead class="bg-dark/5 border-b border-dark/10 text-dark/60 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th class="py-3.5 px-4 sm:px-6">Usuario</th>
                <th class="py-3.5 px-4">Correo Electrónico</th>
                <th class="py-3.5 px-4">Roles Activos</th>
                <th class="py-3.5 px-4">Fecha de Registro</th>
                <th class="py-3.5 px-4 sm:px-6 text-right">Acciones de Rol</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-dark/10">
              <tr *ngFor="let u of filteredUsers()" class="hover:bg-dark/[0.02] transition">
                <!-- User Profile & Avatar -->
                <td class="py-4 px-4 sm:px-6">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-dark text-white flex items-center justify-center font-bold text-sm overflow-hidden shrink-0 border border-dark/10">
                      <img
                        *ngIf="u.avatar_url"
                        [src]="u.avatar_url"
                        [alt]="u.display_name || u.email"
                        class="w-full h-full object-cover"
                      />
                      <span *ngIf="!u.avatar_url">{{ getInitial(u) }}</span>
                    </div>
                    <div>
                      <p class="font-extrabold text-dark leading-tight">
                        {{ u.display_name || 'Sin nombre registrado' }}
                      </p>
                      <span class="text-[11px] text-dark/40 font-mono">ID: {{ u.id.substring(0, 8) }}</span>
                    </div>
                  </div>
                </td>

                <!-- Email -->
                <td class="py-4 px-4">
                  <span class="font-medium text-dark">{{ u.email }}</span>
                </td>

                <!-- Roles Badges -->
                <td class="py-4 px-4">
                  <div class="flex flex-wrap gap-1.5">
                    <span
                      *ngFor="let r of u.roles"
                      [class.bg-contrast/15]="r === 'admin'"
                      [class.text-contrast]="r === 'admin'"
                      [class.border-contrast/30]="r === 'admin'"
                      [class.bg-accent/20]="r === 'artist'"
                      [class.text-dark]="r === 'artist'"
                      [class.border-accent/40]="r === 'artist'"
                      [class.bg-primary/20]="r === 'doorman'"
                      [class.text-dark]="r === 'doorman'"
                      [class.border-primary/40]="r === 'doorman'"
                      [class.bg-dark/5]="r === 'customer'"
                      [class.text-dark/70]="r === 'customer'"
                      [class.border-dark/10]="r === 'customer'"
                      class="px-2 py-0.5 rounded-md text-[11px] font-bold border uppercase tracking-wider"
                    >
                      {{ r }}
                    </span>
                    <span *ngIf="u.roles.length === 0" class="text-xs text-dark/40">
                      customer (default)
                    </span>
                  </div>
                </td>

                <!-- Registration Date -->
                <td class="py-4 px-4">
                  <span class="text-xs text-dark/60">
                    {{ u.created_at | date:'mediumDate' }}
                  </span>
                </td>

                <!-- Manage Roles Button -->
                <td class="py-4 px-4 sm:px-6 text-right">
                  <button
                    type="button"
                    (click)="openRoleModal(u)"
                    class="px-3 py-1.5 rounded-lg bg-dark/5 hover:bg-dark/10 text-dark font-bold text-xs transition border border-dark/10"
                  >
                    ⚙️ Gestionar Roles
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading() && filteredUsers().length === 0" class="p-12 text-center bg-white rounded-2xl border border-dashed border-dark/20 space-y-2">
        <span class="text-3xl">👥</span>
        <h3 class="font-bold text-dark text-base">No se encontraron usuarios</h3>
        <p class="text-xs text-dark/50">Prueba cambiando los términos del buscador o el filtro de rol.</p>
      </div>

      <!-- Role Management Modal -->
      <div
        *ngIf="selectedUserForRole()"
        class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        (click)="closeRoleModal()"
      >
        <div
          class="bg-white rounded-3xl max-w-lg w-full shadow-2xl p-6 sm:p-8 space-y-6 relative"
          (click)="$event.stopPropagation()"
        >
          <button
            type="button"
            (click)="closeRoleModal()"
            class="absolute top-4 right-4 w-8 h-8 rounded-full bg-dark/5 hover:bg-dark/10 text-dark flex items-center justify-center text-sm font-bold transition"
          >
            ✕
          </button>

          <!-- Modal Header -->
          <div class="space-y-1">
            <span class="text-[10px] font-bold text-primary uppercase tracking-wider block">Permisos de Acceso</span>
            <h2 class="text-xl font-black text-dark">
              Roles de {{ selectedUserForRole()!.display_name || selectedUserForRole()!.email }}
            </h2>
            <p class="text-xs text-dark/50 font-mono">{{ selectedUserForRole()!.email }}</p>
          </div>

          <!-- Roles Checkbox List -->
          <div class="space-y-3 border-y border-dark/10 py-4">
            <!-- Admin -->
            <label class="flex items-center justify-between p-3.5 rounded-2xl border border-dark/10 hover:border-contrast/40 transition cursor-pointer bg-dark/[0.01]">
              <div class="space-y-0.5">
                <span class="font-bold text-dark text-sm flex items-center gap-1.5">
                  <span class="text-contrast">⚡</span> Super-Administrador (admin)
                </span>
                <p class="text-xs text-dark/50">Acceso total a métricas, moderación de recintos y gestión de usuarios.</p>
              </div>
              <input
                type="checkbox"
                [checked]="hasRole(selectedUserForRole()!, 'admin')"
                (change)="toggleRole(selectedUserForRole()!, 'admin', $event)"
                class="w-5 h-5 rounded text-contrast focus:ring-contrast/40"
              />
            </label>

            <!-- Artist -->
            <label class="flex items-center justify-between p-3.5 rounded-2xl border border-dark/10 hover:border-accent/40 transition cursor-pointer bg-dark/[0.01]">
              <div class="space-y-0.5">
                <span class="font-bold text-dark text-sm flex items-center gap-1.5">
                  <span class="text-accent">🎤</span> Artista / Creador (artist)
                </span>
                <p class="text-xs text-dark/50">Creación de eventos, tipos de boletos, cupones y recintos.</p>
              </div>
              <input
                type="checkbox"
                [checked]="hasRole(selectedUserForRole()!, 'artist')"
                (change)="toggleRole(selectedUserForRole()!, 'artist', $event)"
                class="w-5 h-5 rounded text-accent focus:ring-accent/40"
              />
            </label>

            <!-- Doorman -->
            <label class="flex items-center justify-between p-3.5 rounded-2xl border border-dark/10 hover:border-primary/40 transition cursor-pointer bg-dark/[0.01]">
              <div class="space-y-0.5">
                <span class="font-bold text-dark text-sm flex items-center gap-1.5">
                  <span class="text-primary">🛡️</span> Control de Acceso (doorman)
                </span>
                <p class="text-xs text-dark/50">Validación y escaneo de códigos QR en puertas de eventos asignados.</p>
              </div>
              <input
                type="checkbox"
                [checked]="hasRole(selectedUserForRole()!, 'doorman')"
                (change)="toggleRole(selectedUserForRole()!, 'doorman', $event)"
                class="w-5 h-5 rounded text-primary focus:ring-primary/40"
              />
            </label>

            <!-- Customer -->
            <label class="flex items-center justify-between p-3.5 rounded-2xl border border-dark/10 hover:border-dark/30 transition cursor-pointer bg-dark/[0.01]">
              <div class="space-y-0.5">
                <span class="font-bold text-dark text-sm flex items-center gap-1.5">
                  <span>🎫</span> Comprador (customer)
                </span>
                <p class="text-xs text-dark/50">Rol base para compra de boletos en la tienda.</p>
              </div>
              <input
                type="checkbox"
                [checked]="hasRole(selectedUserForRole()!, 'customer')"
                (change)="toggleRole(selectedUserForRole()!, 'customer', $event)"
                class="w-5 h-5 rounded text-dark focus:ring-dark/40"
              />
            </label>
          </div>

          <!-- Modal Footer -->
          <div class="flex justify-end">
            <button
              type="button"
              (click)="closeRoleModal()"
              class="px-5 py-2.5 rounded-xl bg-dark text-white font-bold text-xs hover:bg-dark/90 transition shadow-sm"
            >
              Listo / Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class UserManagementComponent implements OnInit {
  private readonly superAdminService = inject(SuperAdminService);

  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly users = signal<SuperAdminUserItem[]>([]);
  readonly selectedUserForRole = signal<SuperAdminUserItem | null>(null);

  searchQuery = '';
  readonly selectedRoleFilter = signal<string>('all');

  readonly filteredUsers = computed(() => {
    let list = this.users();
    const roleFilter = this.selectedRoleFilter();

    if (roleFilter !== 'all') {
      list = list.filter((u) => u.roles.includes(roleFilter));
    }

    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.display_name && u.display_name.toLowerCase().includes(q))
      );
    }

    return list;
  });

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const data = await this.superAdminService.getAllUsers();
      this.users.set(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar usuarios.';
      this.errorMessage.set(msg);
    } finally {
      this.isLoading.set(false);
    }
  }

  getInitial(u: SuperAdminUserItem): string {
    const text = u.display_name || u.email || 'U';
    return text.charAt(0).toUpperCase();
  }

  hasRole(u: SuperAdminUserItem, role: RoleType): boolean {
    return u.roles.includes(role);
  }

  openRoleModal(u: SuperAdminUserItem): void {
    this.selectedUserForRole.set(u);
  }

  closeRoleModal(): void {
    this.selectedUserForRole.set(null);
  }

  async toggleRole(user: SuperAdminUserItem, role: RoleType, event: Event): Promise<void> {
    const shouldHave = (event.target as HTMLInputElement).checked;

    try {
      await this.superAdminService.setUserRole(user.id, role, shouldHave);

      // Optimistic update in state
      const updatedRoles = shouldHave
        ? [...user.roles, role]
        : user.roles.filter((r) => r !== role);

      this.users.update((list) =>
        list.map((item) =>
          item.id === user.id ? { ...item, roles: updatedRoles } : item
        )
      );

      if (this.selectedUserForRole()?.id === user.id) {
        this.selectedUserForRole.set({ ...user, roles: updatedRoles });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar rol.';
      alert(msg);
      // Revert checkbox state
      (event.target as HTMLInputElement).checked = !shouldHave;
    }
  }
}
