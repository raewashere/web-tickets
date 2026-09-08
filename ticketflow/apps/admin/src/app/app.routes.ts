import { Route } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';
import { artistRoleGuard } from './core/guards/artist-role.guard';
import { doormanGuard } from './core/guards/doorman.guard';

export const appRoutes: Route[] = [
  // Public Auth Routes
  {
    path: 'login',
    canActivate: [noAuthGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent
      ),
  },
  {
    path: 'register',
    canActivate: [noAuthGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then(
        (m) => m.RegisterComponent
      ),
  },
  {
    path: 'staff-invite',
    loadComponent: () =>
      import('./features/auth/accept-invite/accept-invite.component').then(
        (m) => m.AcceptInviteComponent
      ),
  },

  // Protected Admin Portal (AdminShell wrapper)
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/layout/admin-shell.component').then(
        (m) => m.AdminShellComponent
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        canActivate: [artistRoleGuard],
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'artist/profile',
        canActivate: [artistRoleGuard],
        loadComponent: () =>
          import('./features/artists/artist-detail/artist-detail.component').then(
            (m) => m.ArtistDetailComponent
          ),
      },
      {
        path: 'artist/profile/edit',
        canActivate: [artistRoleGuard],
        loadComponent: () =>
          import('./features/artists/artist-form/artist-form.component').then(
            (m) => m.ArtistFormComponent
          ),
      },
      {
        path: 'events',
        canActivate: [artistRoleGuard],
        loadChildren: () =>
          import('./features/events/events.routes').then(
            (m) => m.eventRoutes
          ),
      },
      {
        path: 'access-control',
        canActivate: [doormanGuard],
        loadComponent: () =>
          import('./features/access-control/access-control.component').then(
            (m) => m.AccessControlComponent
          ),
      },
      {
        path: 'events/:id/access-control',
        canActivate: [doormanGuard],
        loadComponent: () =>
          import('./features/access-control/access-control.component').then(
            (m) => m.AccessControlComponent
          ),
      },
      {
        path: 'venues',
        canActivate: [artistRoleGuard],
        loadChildren: () =>
          import('./features/venues/venues.routes').then(
            (m) => m.venueRoutes
          ),
      },
      {
        path: 'refunds',
        canActivate: [artistRoleGuard],
        loadChildren: () =>
          import('./features/refunds/refunds.routes').then(
            (m) => m.refundRoutes
          ),
      },
      {
        path: 'finances',
        canActivate: [artistRoleGuard],
        loadChildren: () =>
          import('./features/finances/finances.routes').then(
            (m) => m.financeRoutes
          ),
      },
    ],
  },

  // Fallback wildcard
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
