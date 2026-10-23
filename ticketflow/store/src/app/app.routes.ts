import { Route } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    data: {
      title: 'Boletos Oficiales para Conciertos y Festivales Sin Intermediarios',
      description:
        'Descubre los mejores conciertos, festivales y espectáculos en vivo. Compra tus entradas directo del artista en menos de 1 minuto, sin crear cuenta y con código QR garantizado.',
      keywords:
        'boletos para conciertos, festivales en vivo, entradas oficiales QR, BoletoCoqueto, música en vivo sin intermediarios',
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
      description:
        'Accede a tu cuenta de BoletoCoqueto para consultar tus boletos digitales con código QR, listas de espera y gestionar tus compras.',
    },
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent
      ),
  },
  {
    path: 'register',
    data: {
      title: 'Crear Cuenta Gratis',
      description:
        'Únete a BoletoCoqueto para llevar el control de tus entradas digitales, alertas de listas de espera y próximos conciertos en un solo lugar.',
    },
    loadComponent: () =>
      import('./features/auth/register/register.component').then(
        (m) => m.RegisterComponent
      ),
  },
  {
    path: 'search',
    data: {
      title: 'Cartelera de Conciertos, Festivales y Shows en Vivo',
      description:
        'Explora la cartelera oficial de conciertos, festivales y eventos en vivo. Filtra por artista, género musical o fecha y asegura tus entradas con código QR.',
      keywords:
        'cartelera de conciertos, próximos eventos, festivales de música, boletos de rock, teatro y comedia, agenda de conciertos',
    },
    loadComponent: () =>
      import('./features/search/search-results.component').then(
        (m) => m.SearchResultsComponent
      ),
  },
  {
    path: 'events/:id',
    data: {
      title: 'Boletos Oficiales y Detalles del Concierto',
      description:
        'Consulta fecha, horarios, mapa del recinto, perfil del artista y adquiere tus entradas oficiales con código QR en BoletoCoqueto.',
    },
    loadComponent: () =>
      import('./features/event-detail/event-detail.component').then(
        (m) => m.EventDetailComponent
      ),
  },
  {
    path: 'checkout',
    children: [
      {
        path: '',
        pathMatch: 'full',
        data: {
          title: 'Resumen de Reserva y Carrito',
          description:
            'Revisa tus boletos reservados, aplica cupones de descuento y completa tus datos de entrega rápida sin necesidad de registro.',
          noindex: true,
        },
        loadComponent: () =>
          import('./features/checkout/cart-summary.component').then(
            (m) => m.CartSummaryComponent
          ),
      },
      {
        path: 'payment',
        data: {
          title: 'Pago Seguro con PayPal',
          description:
            'Finaliza la compra de tus entradas con protección al comprador y cifrado bancario SSL vía PayPal.',
          noindex: true,
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
          description:
            '¡Tu compra está lista! Consulta el resumen de tu orden y descarga tus boletos digitales con código QR.',
          noindex: true,
        },
        loadComponent: () =>
          import('./features/checkout/order-confirmation.component').then(
            (m) => m.OrderConfirmationComponent
          ),
      },
    ],
  },
  {
    path: 'ticket/:orderId',
    data: {
      title: 'Pase Digital y Código QR de Acceso',
      description:
        'Consulta y descarga tu pase digital oficial con código QR de alta seguridad para el acceso al recinto.',
      noindex: true,
    },
    loadComponent: () =>
      import('./features/public-ticket/public-ticket.component').then(
        (m) => m.PublicTicketComponent
      ),
  },
  {
    path: 'my-tickets',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        data: {
          title: 'Mis Boletos y Listas de Espera',
          description:
            'Administra tus órdenes, descarga tus códigos QR de acceso y consulta el estado de tus listas de espera.',
          noindex: true,
        },
        loadComponent: () =>
          import('./features/my-tickets/my-tickets.component').then(
            (m) => m.MyTicketsComponent
          ),
      },
      {
        path: ':orderId',
        data: {
          title: 'Detalle de Boleto Digital y Acceso QR',
          description:
            'Muestra tu código QR digital desde tu celular en la entrada del recinto.',
          noindex: true,
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
      title: '¡Gracias por tu Compra!',
      description:
        'Tus entradas oficiales han sido emitidas con éxito. Prepara tu código QR y disfruta del espectáculo.',
      noindex: true,
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
      title: 'Política de Privacidad y Garantía del Comprador',
      description:
        'Conoce cómo protegemos tus datos personales, el ejercicio de derechos ARCO y nuestra Garantía de Reembolso del 100% en BoletoCoqueto.',
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
      title: '404 — Página fuera de cartelera',
      description:
        'La página o concierto que buscas no está disponible o ha cambiado de dirección.',
      noindex: true,
    },
    loadComponent: () =>
      import('./features/not-found/not-found.component').then(
        (m) => m.NotFoundComponent
      ),
  },
];

