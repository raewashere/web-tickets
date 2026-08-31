import { Route } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/home/home.component').then(
        (m) => m.HomeComponent
      ),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent
      ),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(
        (m) => m.RegisterComponent
      ),
  },
  {
    path: 'search',
    loadComponent: () =>
      import('./features/search/search-results.component').then(
        (m) => m.SearchResultsComponent
      ),
  },
  {
    path: 'events/:id',
    loadComponent: () =>
      import('./features/event-detail/event-detail.component').then(
        (m) => m.EventDetailComponent
      ),
  },
  {
    path: 'checkout',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/checkout/cart-summary.component').then(
            (m) => m.CartSummaryComponent
          ),
      },
      {
        path: 'payment',
        loadComponent: () =>
          import('./features/checkout/payment.component').then(
            (m) => m.PaymentComponent
          ),
      },
      {
        path: 'confirmation/:orderId',
        loadComponent: () =>
          import('./features/checkout/order-confirmation.component').then(
            (m) => m.OrderConfirmationComponent
          ),
      },
    ],
  },
  {
    path: 'my-tickets',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/my-tickets/my-tickets.component').then(
        (m) => m.MyTicketsComponent
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
