import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { catchError, map, of } from 'rxjs';
import { NotificationsService } from '../services/notifications.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService)
  const router = inject(Router);
  const notifiacitonService = inject(NotificationsService)

  return authService.isAdmin().pipe(
    map((isAdmin: boolean) => {
      if(isAdmin) return true
      else {
        notifiacitonService.warning('No tienes permisos para acceder a esta sección.')
        return router.parseUrl('/app/dashboard')
      }
    }),
    catchError(() => of(false))
  )
};
