import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-callback',
  imports: [],
  templateUrl: './callback.component.html',
  styleUrl: './callback.component.css'
})
export class CallbackComponent {
  router = inject(Router);
  authService = inject(AuthService);

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
      this.authService.saveUserData({ token, user: parsedUser });

      if (parsedUser.is_admin) {
        this.router.navigate(['/admin/dashboard']);
        return 
      } else {
        this.router.navigate(['/app/dashboard']);
        return
      }
    } catch {
      this.router.navigate(['/auth/login']);
    }
  }
}
