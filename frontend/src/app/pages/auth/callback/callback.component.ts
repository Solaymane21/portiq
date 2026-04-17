import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-callback',
  imports: [],
  templateUrl: './callback.component.html',
  styleUrl: './callback.component.css'
})
export class CallbackComponent {
  router = inject(Router);

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
      localStorage.setItem('token', token);
      localStorage.setItem('portiqUser', atob(user));
      this.router.navigate(['/app/dashboard']);
    } catch {
      this.router.navigate(['/auth/login']);
    }
  }
}
