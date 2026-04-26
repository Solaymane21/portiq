import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { catchError, map, of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const http = inject(HttpClient);
  const router = inject(Router);
  const authService = inject(AuthService);
  const token  = localStorage.getItem('token');

  if (!token) {
    authService.redirectMsg.set({
      msg: 'Debes iniciar sesión o registrarte primero para acceder.',
      type: 'warning'
    })

    router.navigate(['/auth/login'])
    return false
  }

  return http.get('http://localhost:8000/api/auth/validate-token').pipe(
    map(() => {
      if (authService.currentUser()?.is_admin) {
        router.navigate(['/admin/dashboard'])
        return false
      } 
      
      return true
    }),
    catchError(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('portiqUser');

      authService.redirectMsg.set({
        msg: 'Debes iniciar sesión o registrarte primero para acceder.',
        type: 'warning'
      })
      router.navigate(['/auth/login']);
      return of(false);
    })
  );
};
