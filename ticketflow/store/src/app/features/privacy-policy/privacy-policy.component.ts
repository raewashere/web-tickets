import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'store-privacy-policy',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-10">
      <!-- Header -->
      <div class="space-y-3 border-b border-outline-variant/30 pb-8">
        <span class="text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-3.5 py-1.5 rounded-full inline-block">
          Legal, Privacidad & Garantía
        </span>
        <h1 class="text-3xl sm:text-4xl font-bold text-on-surface tracking-tight">
          Política de Privacidad y Garantía del Comprador
        </h1>
        <p class="text-sm text-on-surface-variant">
          Última actualización: Octubre de 2026
        </p>
      </div>

      <!-- Content Sections -->
      <div class="bg-surface rounded-3xl border border-outline-variant/30 p-6 sm:p-10 shadow-sm space-y-8 text-sm sm:text-base text-on-surface/85 leading-relaxed">
        <!-- 1. Responsable -->
        <section class="space-y-3">
          <h2 class="text-lg sm:text-xl font-bold text-on-surface flex items-center gap-2">
            <i class="fa-solid fa-building text-primary"></i> 1. Responsable del Tratamiento de Datos
          </h2>
          <p>
            <strong>BoletoCoqueto</strong> (en adelante "nosotros" o "la plataforma"), con portal oficial de venta directa de boletos para espectáculos en vivo, es responsable del tratamiento y protección de tus datos personales en estricto apego a la legislación aplicable de protección de datos.
          </p>
        </section>

        <!-- 2. Datos que recopilamos -->
        <section class="space-y-3">
          <h2 class="text-lg sm:text-xl font-bold text-on-surface flex items-center gap-2">
            <i class="fa-solid fa-clipboard-list text-primary"></i> 2. Información que Recopilamos
          </h2>
          <p>Para brindarte acceso a la compra de entradas, ya sea como invitado o con cuenta registrada, recopilamos únicamente los datos indispensables:</p>
          <ul class="list-disc pl-6 space-y-1.5 text-on-surface-variant text-sm">
            <li><strong>Datos de identificación y entrega:</strong> Nombre completo, correo electrónico para el envío de tus boletos digitales y, opcionalmente, foto de perfil al iniciar sesión con Google OAuth.</li>
            <li><strong>Datos de transacciones y órdenes:</strong> Historial de boletos reservados, tipos de entradas adquiridas, identificador único de orden y montos pagados.</li>
            <li><strong>Datos técnicos y antifraude:</strong> Registros de validación en puertas de acceso y tokens criptográficos asociados a tus códigos QR.</li>
          </ul>
          <p class="text-xs text-on-surface-variant bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/30">
            <i class="fa-solid fa-lock text-primary mr-1"></i> <em>Nota sobre pagos:</em> BoletoCoqueto nunca almacena ni procesa números de tarjetas de crédito o débito en sus propios servidores. Todas las transacciones se procesan de forma cifrada mediante <strong>PayPal</strong>.
          </p>
        </section>

        <!-- 3. Finalidad del tratamiento -->
        <section class="space-y-3">
          <h2 class="text-lg sm:text-xl font-bold text-on-surface flex items-center gap-2">
            <i class="fa-solid fa-bullseye text-primary"></i> 3. Finalidades del Tratamiento
          </h2>
          <p>Tus datos personales se utilizan exclusivamente para:</p>
          <ul class="list-disc pl-6 space-y-1.5 text-on-surface-variant text-sm">
            <li>Generar, emitir y validar tus códigos QR oficiales de acceso a conciertos, festivales y recintos.</li>
            <li>Enviarte tus pases digitales, confirmaciones de orden, alertas de listas de espera y avisos importantes sobre el evento.</li>
            <li>Prevenir la clonación de entradas, reventa ilegal y fraudes transaccionales.</li>
            <li>Procesar solicitudes de reembolso y brindarte soporte directo.</li>
          </ul>
        </section>

        <!-- 4. Seguridad de los datos -->
        <section class="space-y-3">
          <h2 class="text-lg sm:text-xl font-bold text-on-surface flex items-center gap-2">
            <i class="fa-solid fa-shield-halved text-secondary"></i> 4. Seguridad y Almacenamiento
          </h2>
          <p>
            Implementamos políticas de seguridad a nivel de fila (Row Level Security en Supabase), cifrado SSL/TLS de 256 bits, bloqueos atómicos de inventario durante tu compra y tokens únicos de acceso para compradores invitados.
          </p>
        </section>

        <!-- 5. Garantía del Comprador y Reembolsos -->
        <section id="garantia" class="space-y-3 p-5 rounded-2xl bg-surface-container-low border border-secondary/30">
          <h2 class="text-lg sm:text-xl font-bold text-on-surface flex items-center gap-2">
            <i class="fa-solid fa-award text-secondary"></i> 5. Garantía Oficial del Comprador y Reembolsos
          </h2>
          <p>
            Todas las entradas adquiridas en <strong>BoletoCoqueto</strong> están respaldadas por nuestra Garantía del Comprador:
          </p>
          <ul class="list-disc pl-6 space-y-1.5 text-on-surface-variant text-sm">
            <li><strong>Autenticidad 100% garantizada:</strong> Tus boletos se generan directamente desde el inventario oficial del artista o productor del espectáculo.</li>
            <li><strong>Cancelación o reprogramación:</strong> En caso de cancelación definitiva del espectáculo, tienes derecho al reembolso íntegro (100%) del valor de tus boletos.</li>
            <li><strong>Solicitud desde tu pase digital:</strong> Puedes iniciar una solicitud de reembolso directamente desde la sección <a routerLink="/my-tickets" class="text-primary font-bold hover:underline">Mis Boletos</a> o desde el enlace de tu pase digital recibido por correo.</li>
          </ul>
        </section>

        <!-- 6. Derechos ARCO -->
        <section class="space-y-3">
          <h2 class="text-lg sm:text-xl font-bold text-on-surface flex items-center gap-2">
            <i class="fa-solid fa-scale-balanced text-primary"></i> 6. Ejercicio de Derechos ARCO
          </h2>
          <p>
            Tienes derecho a conocer qué datos personales conservamos y cómo los utilizamos (Acceso), solicitar su corrección (Rectificación), pedir su eliminación (Cancelación) u oponerte a su uso para fines específicos (Oposición).
          </p>
          <p class="text-sm">
            Para ejercer tus derechos ARCO o resolver dudas sobre tu compra, escríbenos a:
            <a href="mailto:privacidad@boletocoqueto.com" class="font-bold text-primary hover:underline">privacidad&#64;boletocoqueto.com</a>.
          </p>
        </section>

        <!-- 7. Cookies y Almacenamiento Local -->
        <section class="space-y-3">
          <h2 class="text-lg sm:text-xl font-bold text-on-surface flex items-center gap-2">
            <i class="fa-solid fa-cookie-bite text-primary"></i> 7. Uso de Cookies y Almacenamiento Local
          </h2>
          <p>
            Utilizamos almacenamiento local en el navegador (<code>sessionStorage</code> y <code>localStorage</code>) para mantener tu sesión activa, recordar tu preferencia de tema visual (claro/oscuro) y resguardar temporalmente tu selección de boletos durante los 15 minutos de reserva en el checkout.
          </p>
        </section>
      </div>

      <!-- Return Button -->
      <div class="text-center pt-4">
        <a routerLink="/">
          <button
            type="button"
            class="px-6 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5 mx-auto"
          >
            <i class="fa-solid fa-arrow-left"></i>
            <span>Volver al Inicio</span>
          </button>
        </a>
      </div>
    </main>
  `,
})
export class PrivacyPolicyComponent {}
