import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { NotificationsService } from '../services/notifications.service';

export const planLimitInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationsService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 403 && error.error?.code === 'PLAN_LIMIT_EXCEEDED') {
        notifications.warning(
          `${error.error.message} Mejora al Plan Premium para continuar.`
        );
      }

      if (error.status === 403 && error.error?.code === 'DEMO_READ_ONLY') {
        notifications.warning(error.error.message, 4000);
      }

      if (error.status === 403 && error.error?.code === 'PREMIUM_REQUIRED') {
        notifications.warning('Esta función requiere el Plan Premium.');
        router.navigate(['/app/subscription']);
      }

      return throwError(() => error);
    })
  );
};