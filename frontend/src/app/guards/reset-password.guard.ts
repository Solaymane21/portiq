import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const resetPasswordGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.hasResetToken()) return true;

  authService.redirectMsg.set({
    msg: 'Debes completar el proceso de recuperación de contraseña primero.',
    type: 'error'
  })

  router.navigate(['/auth/login']);
  return false;
};
