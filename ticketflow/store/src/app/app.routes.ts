import { Route } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    data: {
      title: 'Boletos para Conciertos y Festivales en Vivo',
      description: 'Descubre los mejores conciertos, festivales y espectáculos. Compra tus entradas oficiales con código QR 100% garantizado en TicketFlow.',
    },
    loadComponent: () =>
      import('./features/home/home.component').then(
        (m) => m.HomeComponent
      ),
  },
  {
    path: 'login',
    data: {
      title: 'Iniciar Sesión',
      description: 'Accede a tu cuenta de TicketFlow para consultar tus boletos adquiridos y gestionar tus compras.',
    },
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent
      ),
  },
  {
    path: 'register',
    data: {
      title: 'Crear Cuenta',
      description: 'Únete a TicketFlow y compra boletos para tus conciertos favoritos en segundos.',
    },
    loadComponent: () =>
      import('./features/auth/register/register.component').then(
        (m) => m.RegisterComponent
      ),
  },
  {
    path: 'search',
    data: {
      title: 'Cartelera de Conciertos y Eventos',
      description: 'Explora la cartelera completa de conciertos, festivales y shows en vivo. Filtra por artista, categoría y fecha.',
    },
    loadComponent: () =>
      import('./features/search/search-results.component').then(
        (m) => m.SearchResultsComponent
      ),
  },
  {
    path: 'events/:id',
    data: {
      title: 'Detalles del Evento y Boletos',
      description: 'Conoce fecha, recinto, artistas y compra tus boletos oficiales para este concierto en TicketFlow.',
    },
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
        data: {
          title: 'Carrito de Compra',
          description: 'Revisa tu selección de boletos y aplica cupones de descuento antes de continuar al pago.',
        },
        loadComponent: () =>
          import('./features/checkout/cart-summary.component').then(
            (m) => m.CartSummaryComponent
          ),
      },
      {
        path: 'payment',
        data: {
          title: 'Pago Seguro',
          description: 'Completa tu compra de boletos mediante pago seguro y cifrado con PayPal.',
        },
        loadComponent: () =>
          import('./features/checkout/payment.component').then(
            (m) => m.PaymentComponent
          ),
      },
      {
        path: 'confirmation/:orderId',
        data: {
          title: 'Confirmación de Orden',
          description: '¡Tu orden ha sido procesada! Revisa el resumen de tu compra y tus boletos asignados.',
        },
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
    children: [
      {
        path: '',
        pathMatch: 'full',
        data: {
          title: 'Mis Boletos Adquiridos',
          description: 'Consulta tus órdenes y entradas digitales con código QR para tus próximos eventos.',
        },
        loadComponent: () =>
          import('./features/my-tickets/my-tickets.component').then(
            (m) => m.MyTicketsComponent
          ),
      },
      {
        path: ':orderId',
        data: {
          title: 'Boleto Digital y Acceso QR',
          description: 'Muestra tu código QR digital desde tu dispositivo para acceder al recinto.',
        },
        loadComponent: () =>
          import('./features/my-tickets/ticket-detail.component').then(
            (m) => m.TicketDetailComponent
          ),
      },
    ],
  },
  {
    path: 'thank-you',
    data: {
      title: '¡Muchas Gracias por tu Compra!',
      description: 'Agradecemos tu preferencia. Tus entradas han sido generadas y están listas para usarse.',
    },
    loadComponent: () =>
      import('./features/thank-you/thank-you.component').then(
        (m) => m.ThankYouComponent
      ),
  },
  {
    path: 'gracias',
    redirectTo: 'thank-you',
  },
  {
    path: 'privacy',
    data: {
      title: 'Política de Privacidad',
      description: 'Conoce cómo protegemos tus datos personales y garantizamos la seguridad de tus transacciones en TicketFlow.',
    },
    loadComponent: () =>
      import('./features/privacy-policy/privacy-policy.component').then(
        (m) => m.PrivacyPolicyComponent
      ),
  },
  {
    path: 'privacidad',
    redirectTo: 'privacy',
  },
  {
    path: '**',
    data: {
      title: '404 — Página no encontrada',
      description: 'La página o concierto que buscas no existe o ha cambiado de ubicación.',
    },
    loadComponent: () =>
      import('./features/not-found/not-found.component').then(
        (m) => m.NotFoundComponent
      ),
  },
];

