import { Route } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';
import { artistRoleGuard } from './core/guards/artist-role.guard';

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

  // Protected Admin Portal (AdminShell wrapper)
  {
    path: '',
    canActivate: [authGuard, artistRoleGuard],
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
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'artist/profile',
        loadComponent: () =>
          import('./features/artists/artist-detail/artist-detail.component').then(
            (m) => m.ArtistDetailComponent
          ),
      },
      {
        path: 'artist/profile/edit',
        loadComponent: () =>
          import('./features/artists/artist-form/artist-form.component').then(
            (m) => m.ArtistFormComponent
          ),
      },
      {
        path: 'events',
        loadChildren: () =>
          import('./features/events/events.routes').then(
            (m) => m.eventRoutes
          ),
      },
      {
        path: 'venues',
        loadChildren: () =>
          import('./features/venues/venues.routes').then(
            (m) => m.venueRoutes
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
