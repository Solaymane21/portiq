import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const token  = localStorage.getItem('token');

  if (token) {
    return true
  }

  authService.redirectMsg.set({
    msg: 'Debes iniciar sesión o registrarte primero para acceder.',
    type: 'warning'
  })

  router.navigate(['/auth/login'])
  return false
};
