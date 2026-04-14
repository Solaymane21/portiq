import { inject, Injectable, signal } from '@angular/core';
import { User } from '../models/user.model';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentStep = signal<number>(1);
  isLoading = signal<boolean>(false)
  msgError = signal<string>('')

  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8000/api';

  private router = inject(Router)

  username = signal<User['name']>('')
  email = signal<User['email']>('')
  code = signal<string>('')
  password = signal<User['password']>('')
  subscription_type = signal<User['subscription_type']>('free')

  next() {
    this.currentStep.update(step => step + 1)
  }

  back() {
    this.currentStep.update(step => step - 1)
  }

  onStep1() {
    this.isLoading.set(true)
    this.msgError.set('');

    this.http.post(`${this.apiUrl}/auth/send-code`, {email: this.email()})
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
    this.msgError.set('');

    this.http.post(`${this.apiUrl}/auth/verify-code`, {email: this.email(), code: this.code()})
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

  onResendCode() {
    return this.http.post(`${this.apiUrl}/auth/resend-code`, {email: this.email()})
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
      suscription_type: this.subscription_type()
    }).subscribe({
      next: (res: any) => {
        localStorage.setItem('token', res.token);
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error(err.error.message);
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
        localStorage.setItem('token', res.token);
        this.isLoading.set(false);
        this.router.navigate(['/app/dashboard']);
      },
      error: (err) => {
        this.msgError.set('Email o contraseña incorrectos.');
        this.isLoading.set(false);
      }
    });
  }

  onLogout() {
    console.log("Logout");
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

}
