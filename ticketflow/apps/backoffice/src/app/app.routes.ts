import { Route } from '@angular/router';
import { superAdminGuard } from './core/guards/super-admin.guard';

export const appRoutes: Route[] = [
  // Public Login Route
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.BackofficeLoginComponent
      ),
  },

  // Protected Super Admin Backoffice Shell
  {
    path: '',
    canActivate: [superAdminGuard],
    loadComponent: () =>
      import('./shared/layout/backoffice-shell.component').then(
        (m) => m.BackofficeShellComponent
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.BackofficeDashboardComponent
          ),
      },
      {
        path: 'events',
        loadComponent: () =>
          import('./features/events/events-overview.component').then(
            (m) => m.EventsOverviewComponent
          ),
      },
      {
        path: 'artists',
        loadComponent: () =>
          import('./features/artists/artists-list.component').then(
            (m) => m.ArtistsListComponent
          ),
      },
      {
        path: 'payouts',
        loadComponent: () =>
          import('./features/payouts/admin-payouts.component').then(
            (m) => m.AdminPayoutsComponent
          ),
      },
      {
        path: 'refunds',
        loadComponent: () =>
          import('./features/refunds/admin-refunds.component').then(
            (m) => m.AdminRefundsComponent
          ),
      },
      {
        path: 'venues',
        loadComponent: () =>
          import('./features/venues/venue-moderation.component').then(
            (m) => m.VenueModerationComponent
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/users/user-management.component').then(
            (m) => m.UserManagementComponent
          ),
      },
    ],
  },

  // Wildcard fallback
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
