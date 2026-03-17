import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if we are logged in (using the signal or localStorage directly)
  const currentToken = authService.currentUser()?.token || localStorage.getItem('access_token');
  if (currentToken) {
    return true; // Valid token exists
  }

  // Not logged in? Go to login page.
  return router.parseUrl('/login');
};