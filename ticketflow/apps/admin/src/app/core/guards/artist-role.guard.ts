// apps/admin/src/app/core/guards/artist-role.guard.ts
// Protects Admin routes that require the user to have the 'artist' role.
// Redirects to /artist/profile (create profile page) if the user is
// authenticated but hasn't set up an artist profile/role yet.

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@ticketflow/data-access';

export const artistRoleGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Wait for auth initialisation before checking roles
  const authState = await auth.waitForAuthReady();

  if (!authState.user) {
    return router.createUrlTree(['/login']);
  }

  // Admins have full access
  if (auth.isAdmin()) {
    return true;
  }

  // Artists can proceed
  if (auth.isArtist()) {
    return true;
  }

  // Doormen: redirect directly to access-control
  const roles = auth.roles();
  if (roles.includes('doorman')) {
    return router.createUrlTree(['/access-control']);
  }

  // Authenticated user in the admin portal: auto-assign artist role
  try {
    await auth.assignRole(authState.user.id, 'artist');
  } catch (err) {
    console.warn('Could not auto-assign artist role:', err);
  }

  // If already on /artist/profile, allow them to view and complete the form
  if (state.url.includes('/artist/profile')) {
    return true;
  }

  // Otherwise, guide them to complete their artist profile
  return router.createUrlTree(['/artist/profile']);
};
