import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@ticketflow/data-access';

export const superAdminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const authState = await auth.waitForAuthReady();

  if (!authState.user) {
    return router.createUrlTree(['/login']);
  }

  if (auth.isAdmin()) {
    return true;
  }

  // Not an admin: redirect back to login
  alert('Acceso denegado. Se requieren permisos de Super-Admin para ingresar al Backoffice.');
  await auth.logout();
  return router.createUrlTree(['/login']);
};
