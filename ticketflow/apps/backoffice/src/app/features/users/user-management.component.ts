import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackofficeService } from '../../services/backoffice.service';
import type { SuperAdminUserItem, RoleType } from '@ticketflow/models';
import { SpinnerComponent } from '@ticketflow/shared-ui';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, SpinnerComponent],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span class="text-[10px] font-black uppercase tracking-widest text-purple-700 bg-purple-100 border border-purple-300 px-3 py-1 rounded-full inline-block mb-2">
            Gestión de Permisos Globales
          </span>
          <h1 class="text-2xl sm:text-3xl font-black text-dark tracking-tight">
            Usuarios y Asignación de Roles
          </h1>
          <p class="text-xs sm:text-sm text-dark/60 mt-1">
            Asigna o revoca manualmente permisos de Super Admin, Artista, Control de Admisión (Doorman) o Cliente.
          </p>
        </div>

        <button
          type="button"
          (click)="loadUsers()"
          class="px-4 py-2 rounded-xl bg-white border border-dark/10 hover:bg-dark/5 text-dark font-bold text-xs shadow-sm transition flex items-center gap-2 self-start sm:self-auto"
        >
          <i class="fa-solid fa-arrows-rotate"></i>
          <span>Actualizar Usuarios</span>
        </button>
      </div>

      <!-- Search Bar & Filters -->
      <div class="p-4 rounded-2xl bg-white border border-dark/10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="w-full md:max-w-md relative">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="Buscar por correo electrónico o ID de usuario..."
            class="w-full pl-10 pr-4 py-2 rounded-xl border border-dark/20 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-dark/40 text-xs"></i>
        </div>

        <div class="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <button
            type="button"
            (click)="selectedRoleFilter.set('all')"
            [class.bg-dark]="selectedRoleFilter() === 'all'"
            [class.text-white]="selectedRoleFilter() === 'all'"
            [class.bg-dark/5]="selectedRoleFilter() !== 'all'"
            [class.text-dark]="selectedRoleFilter() !== 'all'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap"
          >
            Todos ({{ users().length }})
          </button>
          <button
            type="button"
            (click)="selectedRoleFilter.set('admin')"
            [class.bg-purple-700]="selectedRoleFilter() === 'admin'"
            [class.text-white]="selectedRoleFilter() === 'admin'"
            [class.bg-purple-50]="selectedRoleFilter() !== 'admin'"
            [class.text-purple-800]="selectedRoleFilter() !== 'admin'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap"
          >
            Admins
          </button>
          <button
            type="button"
            (click)="selectedRoleFilter.set('artist')"
            [class.bg-amber-600]="selectedRoleFilter() === 'artist'"
            [class.text-white]="selectedRoleFilter() === 'artist'"
            [class.bg-amber-50]="selectedRoleFilter() !== 'artist'"
            [class.text-amber-800]="selectedRoleFilter() !== 'artist'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap"
          >
            Artistas
          </button>
          <button
            type="button"
            (click)="selectedRoleFilter.set('doorman')"
            [class.bg-cyan-600]="selectedRoleFilter() === 'doorman'"
            [class.text-white]="selectedRoleFilter() === 'doorman'"
            [class.bg-cyan-50]="selectedRoleFilter() !== 'doorman'"
            [class.text-cyan-800]="selectedRoleFilter() !== 'doorman'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap"
          >
            Doormen
          </button>
        </div>
      </div>

      <!-- Loading state -->
      <div *ngIf="isLoading()" class="py-24 flex flex-col items-center justify-center gap-3">
        <tf-spinner size="lg"></tf-spinner>
        <p class="text-xs text-dark/50">Cargando directorio de usuarios...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMessage()" class="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
        {{ errorMessage() }}
      </div>

      <!-- Users Table -->
      <div *ngIf="!isLoading() && filteredUsers().length > 0" class="bg-white rounded-2xl border border-dark/10 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs sm:text-sm">
            <thead class="bg-dark/5 border-b border-dark/10 text-dark/60 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th class="py-3.5 px-4 sm:px-6">Usuario / Cuenta</th>
                <th class="py-3.5 px-4">Fecha Registro</th>
                <th class="py-3.5 px-4 text-center">Rol Admin</th>
                <th class="py-3.5 px-4 text-center">Rol Artista</th>
                <th class="py-3.5 px-4 text-center">Rol Doorman</th>
                <th class="py-3.5 px-4 text-center">Rol Customer</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-dark/10">
              <tr *ngFor="let user of filteredUsers()" class="hover:bg-dark/[0.02] transition">
                <td class="py-4 px-4 sm:px-6">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full bg-dark/10 text-dark font-bold flex items-center justify-center text-xs shrink-0">
                      <i class="fa-solid fa-user"></i>
                    </div>
                    <div>
                      <span class="font-extrabold text-dark block">{{ user.email }}</span>
                      <span class="text-[10px] text-dark/40 font-mono">ID: {{ user.id }}</span>
                    </div>
                  </div>
                </td>
                <td class="py-4 px-4 text-dark/60 font-mono text-xs">
                  {{ user.created_at | date:'dd/MM/yyyy' }}
                </td>

                <!-- Admin Toggle -->
                <td class="py-4 px-4 text-center">
                  <button
                    type="button"
                    (click)="toggleRole(user, 'admin')"
                    [disabled]="updatingKey() === user.id + '_admin'"
                    [class.bg-purple-700]="user.roles.includes('admin')"
                    [class.text-white]="user.roles.includes('admin')"
                    [class.bg-dark/5]="!user.roles.includes('admin')"
                    [class.text-dark/40]="!user.roles.includes('admin')"
                    class="px-3 py-1 rounded-full text-xs font-bold transition disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <i [class]="user.roles.includes('admin') ? 'fa-solid fa-check' : 'fa-solid fa-plus'" class="text-[10px]"></i>
                    <span>Admin</span>
                  </button>
                </td>

                <!-- Artist Toggle -->
                <td class="py-4 px-4 text-center">
                  <button
                    type="button"
                    (click)="toggleRole(user, 'artist')"
                    [disabled]="updatingKey() === user.id + '_artist'"
                    [class.bg-amber-600]="user.roles.includes('artist')"
                    [class.text-white]="user.roles.includes('artist')"
                    [class.bg-dark/5]="!user.roles.includes('artist')"
                    [class.text-dark/40]="!user.roles.includes('artist')"
                    class="px-3 py-1 rounded-full text-xs font-bold transition disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <i [class]="user.roles.includes('artist') ? 'fa-solid fa-check' : 'fa-solid fa-plus'" class="text-[10px]"></i>
                    <span>Artista</span>
                  </button>
                </td>

                <!-- Doorman Toggle -->
                <td class="py-4 px-4 text-center">
                  <button
                    type="button"
                    (click)="toggleRole(user, 'doorman')"
                    [disabled]="updatingKey() === user.id + '_doorman'"
                    [class.bg-cyan-600]="user.roles.includes('doorman')"
                    [class.text-white]="user.roles.includes('doorman')"
                    [class.bg-dark/5]="!user.roles.includes('doorman')"
                    [class.text-dark/40]="!user.roles.includes('doorman')"
                    class="px-3 py-1 rounded-full text-xs font-bold transition disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <i [class]="user.roles.includes('doorman') ? 'fa-solid fa-check' : 'fa-solid fa-plus'" class="text-[10px]"></i>
                    <span>Doorman</span>
                  </button>
                </td>

                <!-- Customer Toggle -->
                <td class="py-4 px-4 text-center">
                  <button
                    type="button"
                    (click)="toggleRole(user, 'customer')"
                    [disabled]="updatingKey() === user.id + '_customer'"
                    [class.bg-emerald-600]="user.roles.includes('customer')"
                    [class.text-white]="user.roles.includes('customer')"
                    [class.bg-dark/5]="!user.roles.includes('customer')"
                    [class.text-dark/40]="!user.roles.includes('customer')"
                    class="px-3 py-1 rounded-full text-xs font-bold transition disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <i [class]="user.roles.includes('customer') ? 'fa-solid fa-check' : 'fa-solid fa-plus'" class="text-[10px]"></i>
                    <span>Cliente</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading() && filteredUsers().length === 0" class="p-12 text-center bg-white rounded-2xl border border-dashed border-dark/20 space-y-2">
        <span class="text-3xl block text-dark/30">
          <i class="fa-solid fa-users"></i>
        </span>
        <h3 class="font-bold text-dark text-base">No se encontraron usuarios</h3>
        <p class="text-xs text-dark/50">Ajusta los términos de búsqueda o filtros.</p>
      </div>
    </div>
  `,
})
export class UserManagementComponent implements OnInit {
  private readonly backofficeService = inject(BackofficeService);

  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly users = signal<SuperAdminUserItem[]>([]);
  readonly updatingKey = signal<string | null>(null);

  searchQuery = '';
  readonly selectedRoleFilter = signal<string>('all');

  readonly filteredUsers = computed(() => {
    let list = this.users();
    const roleFilter = this.selectedRoleFilter();

    if (roleFilter !== 'all') {
      list = list.filter((u) => u.roles.includes(roleFilter as RoleType));
    }

    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q)
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
      const data = await this.backofficeService.getAllUsers();
      this.users.set(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar usuarios.';
      this.errorMessage.set(msg);
    } finally {
      this.isLoading.set(false);
    }
  }

  async toggleRole(user: SuperAdminUserItem, role: RoleType): Promise<void> {
    const hasRole = user.roles.includes(role);
    const shouldHave = !hasRole;
    const key = `${user.id}_${role}`;
    this.updatingKey.set(key);

    try {
      await this.backofficeService.setUserRole(user.id, role, shouldHave);
      this.users.update((items) =>
        items.map((u) => {
          if (u.id !== user.id) return u;
          const updatedRoles = shouldHave
            ? [...u.roles, role]
            : u.roles.filter((r) => r !== role);
          return { ...u, roles: updatedRoles };
        })
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar el rol.';
      alert(msg);
    } finally {
      this.updatingKey.set(null);
    }
  }
}
