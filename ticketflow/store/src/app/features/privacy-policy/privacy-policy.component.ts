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
      <div class="space-y-3 border-b border-slate-200 pb-8">
        <span class="text-xs font-black uppercase tracking-widest text-cyan-600 bg-cyan-50 border border-cyan-200/60 px-3.5 py-1.5 rounded-full inline-block">
          Legal & Transparencia
        </span>
        <h1 class="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Política de Privacidad
        </h1>
        <p class="text-sm text-slate-500">
          Última actualización: 08 de septiembre de 2026
        </p>
      </div>

      <!-- Content Sections -->
      <div class="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm space-y-8 text-sm sm:text-base text-slate-700 leading-relaxed">
        <!-- 1. Responsable -->
        <section class="space-y-3">
          <h2 class="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <i class="fa-solid fa-building text-cyan-600"></i> 1. Responsable del Tratamiento de Datos
          </h2>
          <p>
            <strong>TicketFlow Technologies Inc.</strong> (en adelante "TicketFlow", "nosotros" o "la plataforma"), con domicilio de operaciones digitales y portal web accesible en nuestra plataforma, es responsable del uso y protección de sus datos personales, en estricto apego a las normativas aplicables de protección de datos.
          </p>
        </section>

        <!-- 2. Datos que recopilamos -->
        <section class="space-y-3">
          <h2 class="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <i class="fa-solid fa-clipboard-list text-cyan-600"></i> 2. Información que Recopilamos
          </h2>
          <p>Para brindarle acceso a la compra de entradas y emisión de boletos digitales, podemos recopilar:</p>
          <ul class="list-disc pl-6 space-y-1.5 text-slate-600 text-sm">
            <li><strong>Datos de identificación y contacto:</strong> Nombre completo, correo electrónico y foto de perfil asociada mediante inicio de sesión seguro (Google OAuth).</li>
            <li><strong>Datos de transacciones y compras:</strong> Historial de boletos reservados, tipos de entradas adquiridas, identificador único de orden y montos pagados.</li>
            <li><strong>Datos técnicos y de seguridad:</strong> Dirección IP, registros de validación en puertas de acceso y códigos QR antifraude generados.</li>
          </ul>
          <p class="text-xs text-slate-500 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <i class="fa-solid fa-lock text-cyan-600 mr-1"></i> <em>Nota sobre pagos:</em> TicketFlow no almacena ni procesa números de tarjetas de crédito o débito en sus propios servidores. Todas las transacciones son gestionadas de forma cifrada a través de pasarelas de pago certificadas internacionalmente como <strong>PayPal</strong>.
          </p>
        </section>

        <!-- 3. Finalidad del tratamiento -->
        <section class="space-y-3">
          <h2 class="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <i class="fa-solid fa-bullseye text-cyan-600"></i> 3. Finalidades del Tratamiento
          </h2>
          <p>Los datos personales que recopilamos se utilizan para:</p>
          <ul class="list-disc pl-6 space-y-1.5 text-slate-600 text-sm">
            <li>Generar, emitir y validar los códigos QR de acceso a recintos y espectáculos en vivo.</li>
            <li>Enviar comprobantes de compra, notificaciones de eventos y avisos importantes sobre cambios de cartelera o recinto.</li>
            <li>Prevenir la duplicación no autorizada de entradas, reventa ilegal y fraudes transaccionales.</li>
            <li>Atender solicitudes de soporte técnico y aclaraciones sobre boletos.</li>
          </ul>
        </section>

        <!-- 4. Seguridad de los datos -->
        <section class="space-y-3">
          <h2 class="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <i class="fa-solid fa-shield-halved text-cyan-600"></i> 4. Seguridad y Almacenamiento
          </h2>
          <p>
            Implementamos medidas de seguridad administrativas, técnicas y físicas avanzadas, incluyendo políticas de Row Level Security (RLS) en bases de datos gestionadas en Supabase, certificados de cifrado SSL/TLS de 256 bits y tokens de acceso temporizados para el bloqueo y reserva de boletos.
          </p>
        </section>

        <!-- 5. Derechos ARCO -->
        <section class="space-y-3">
          <h2 class="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <i class="fa-solid fa-scale-balanced text-cyan-600"></i> 5. Ejercicio de Derechos ARCO
          </h2>
          <p>
            Usted tiene derecho a conocer qué datos personales tenemos de usted, para qué los utilizamos y las condiciones del uso que les damos (Acceso). Asimismo, es su derecho solicitar la corrección de su información personal en caso de que esté desactualizada o sea inexacta (Rectificación); que la eliminemos de nuestros registros cuando considere que no está siendo utilizada adecuadamente (Cancelación); así como oponerse al uso de sus datos para fines específicos (Oposición).
          </p>
          <p class="text-sm">
            Para ejercer cualquiera de sus derechos ARCO, puede ponerse en contacto con nuestro equipo a través del correo:
            <a href="mailto:privacidad@ticketflow.app" class="font-bold text-cyan-600 hover:underline">privacidad&#64;ticketflow.app</a>.
          </p>
        </section>

        <!-- 6. Cookies y Almacenamiento Local -->
        <section class="space-y-3">
          <h2 class="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <i class="fa-solid fa-cookie-bite text-cyan-600"></i> 6. Uso de Cookies y Almacenamiento Local
          </h2>
          <p>
            Utilizamos tecnologías de almacenamiento local en el navegador (SessionStorage y LocalStorage) estrictamente necesarias para conservar su sesión activa y recordar temporalmente los boletos seleccionados en el carrito de compra durante el proceso de reserva.
          </p>
        </section>

        <!-- 7. Modificaciones -->
        <section class="space-y-3">
          <h2 class="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <i class="fa-solid fa-file-pen text-cyan-600"></i> 7. Modificaciones al Aviso de Privacidad
          </h2>
          <p>
            TicketFlow se reserva el derecho de actualizar o modificar el presente aviso de privacidad en cualquier momento para reflejar cambios legales o mejoras en nuestros servicios. Cualquier actualización estará disponible públicamente en este mismo apartado.
          </p>
        </section>
      </div>

      <!-- Return Button -->
      <div class="text-center pt-4">
        <a routerLink="/">
          <button
            type="button"
            class="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5 mx-auto"
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
