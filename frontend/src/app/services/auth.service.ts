import { inject, Injectable, signal } from '@angular/core';
import { User } from '../models/user.model';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { RedirectMsg } from '../models/redirectMsg.model';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentStep = signal<number>(1);
  isLoading = signal<boolean>(false)
  isForgotPassword = signal<boolean>(false)
  msgError = signal<string>('')
  redirectMsg = signal<RedirectMsg>({msg: '',type: 'info'})
  resetToken = signal<string>('');
  currentUser = signal<User | null>(
    JSON.parse(localStorage.getItem('portiqUser') ?? 'null')
  );

  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8000/api';

  private router = inject(Router)

  username = signal<User['name']>('')
  email = signal<User['email']>('')
  code = signal<string>('')
  password = signal<User['password']>('')
  suscription_type = signal<User['suscription_type']>('free')

  next() {
    this.currentStep.update(step => step + 1)
  }

  back() {
    this.currentStep.update(step => step - 1)
  }

  onStep1() {
    this.isLoading.set(true)
    this.msgError.set('');

    const type = this.isForgotPassword() ? 'reset' : 'register'

    this.http.post(`${this.apiUrl}/auth/${type}-code`, {email: this.email()})
    .subscribe({
      next: () => {
        this.next()
        this.isLoading.set(false)
      },
      error: (err) => {
        console.error(err.error.message)
        this.msgError.set(err.error.message)
        this.isLoading.set(false)
      }
    });
  }

  onStep2() {
    this.isLoading.set(true)
    this.msgError.set('')

    const type = this.isForgotPassword() ? 'reset' : 'register';

    this.http.post(`${this.apiUrl}/auth/verify-code`, {email: this.email(), code: this.code(), type: type})
    .subscribe({
      next: (res: any) => {
        this.isLoading.set(false)

        if (this.isForgotPassword()) {
          this.resetToken.set(res.reset_token)
          this.router.navigate(['/auth/reset-password'])
        } else {
          this.next()
        }
      },
      error: (err: any) => {
        console.error(err.error.message)
        this.msgError.set(err.error.message)
        this.isLoading.set(false)
      }
    });
  }

  onResendCode() {
    const type = this.isForgotPassword() ? 'reset' : 'register';

    return this.http.post(`${this.apiUrl}/auth/resend-code`, {email: this.email(), type: type})
  }

  onStep3() {
    this.msgError.set('');
    this.next()
  }

  onStep4() {
    this.isLoading.set(true);
    this.msgError.set('');

    this.http.post(`${this.apiUrl}/auth/register`, {
      name: this.username(),
      email: this.email(),
      password: this.password(),
      suscription_type: 'free'
    }).subscribe({
      next: (res: any) => {
        this.saveUserData(res)

        if (this.suscription_type() === 'premium') {
          this.http.post(`${this.apiUrl}/subscription/checkout`, {}).subscribe({
            next: (checkout: any) => {
              this.isLoading.set(false);
              window.location.href = checkout.url;
            },
            error: () => {
              this.isLoading.set(false);
              this.router.navigate(['/app/dashboard']);
            }
          });
        } else {
          this.router.navigate(['/app/dashboard']);
        }
      },
      error: (err) => {
        console.error(err.message);
        this.isLoading.set(false);
      }
    });
  }

  onLogin() {
    this.isLoading.set(true);
    this.msgError.set('');

    this.http.post(`${this.apiUrl}/auth/login`, {
      email: this.email(),
      password: this.password()
    }).subscribe({
      next: (res: any) => {
        this.saveUserData(res)
        this.isLoading.set(false);

        if (res.user.is_admin) {
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.router.navigate(['/app/dashboard']);
        }
      },
      error: (err) => {
        this.msgError.set('Credenciales incorrectas o no existe cuenta en PortIQ.');
        this.isLoading.set(false);
      }
    });
  }

  onLogout() {
    this.http.post(`${this.apiUrl}/auth/logout`, {}).subscribe({
      next: () => {
        this.removeUserData()
        this.router.navigate(['/public'])
      },
      error: () => {
        this.removeUserData()
        this.router.navigate(['/public'])
      }
    });
  }

  onLoginWithGoogle() {
    this.http.get(`${this.apiUrl}/auth/google/redirect`).subscribe({
      next: (res: any) => {
        window.location.href = res.redirect_url
      },
      error: (err: any) => {
        console.error(err)
      }
    })
  }

  onResetPassword(newPassword: string) {
    this.isLoading.set(true);
    this.msgError.set('');
    this.redirectMsg.set({msg: '', type: 'info'})

    this.http.post(`${this.apiUrl}/auth/reset-password`, {
      email:                 this.email(),
      reset_token:           this.resetToken(),
      password:              newPassword,
      password_confirmation: newPassword
    }).subscribe({
      next: (res: any) => {
        this.resetToken.set('');
        this.isLoading.set(false);
        this.redirectMsg.set({ msg: res.message, type: 'success' })
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        this.msgError.set(err.error.message);
        this.isLoading.set(false);
      }
    });
  }

  hasResetToken(): boolean {
    return !!this.resetToken();
  }

  saveUserData(res: any) {
    localStorage.setItem('token', res.token)
    localStorage.setItem('portiqUser', JSON.stringify(res.user))
    this.currentUser.set(res.user)
  }

  removeUserData() {
    localStorage.removeItem('token')
    localStorage.removeItem('portiqUser')
    this.currentUser.set(null)
  }

  getUserInfo() {
    return localStorage.getItem('portiqUser')
  }

  updateLocalUser(user: any) {
    localStorage.setItem('portiqUser', JSON.stringify(user));
    this.currentUser.set(user);
  }

  refreshUser() {
    return this.http.get<User>(`${this.apiUrl}/user`).pipe(
      tap(user => this.currentUser.set(user))
    );
  }

}
