import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { InitialDataService } from '../../../services/initial-data.service';
import { CookiesService } from '../../../services/cookies.service';

@Component({
  selector: 'app-callback',
  imports: [],
  templateUrl: './callback.component.html',
  styleUrl: './callback.component.css'
})
export class CallbackComponent {
  router = inject(Router);
  authService = inject(AuthService);
  initialDataService = inject(InitialDataService)
  cookiesService = inject(CookiesService)

  ngOnInit(): void {
    const fragment = window.location.hash.substring(1);
    const params   = new URLSearchParams(fragment);

    const token = params.get('token');
    const user  = params.get('user');

    if (!token || !user) {
      this.router.navigate(['/auth/login']);
      return;
    }

    try {
      const parsedUser = JSON.parse(atob(user));

      // guarda el token siempre
      this.authService.saveUserData({ token, user: parsedUser });

      if (parsedUser.is_new_user) {
        this.cookiesService.isNewUser.set(true); // ← antes de run()
      }

      // si es admin redirigir automaticamente
      if (parsedUser.is_admin) {
        this.router.navigate(['/admin/dashboard']);
        return;
      }

      // cargar datos del usuario (favoriots, portfolios etc)
      this.initialDataService.run().subscribe({
        next: () => {
          this.router.navigate(['/app/dashboard']);
        },
        error: (err) => {
          this.router.navigate(['/app/dashboard']);
        }
      });

    } catch {
      this.router.navigate(['/auth/login']);
    }
  }
}
