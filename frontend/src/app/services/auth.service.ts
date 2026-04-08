import { inject, Injectable, signal } from '@angular/core';
import { User } from '../models/user.model';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentStep = signal<number>(1);
  isLoading = signal<boolean>(false)
  msgError = signal<string>('')

  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8000/api';

  username = signal<User['name']>('')
  email = signal<User['email']>('')
  code = signal<string>('')

  next() {
    this.currentStep.update(step => step + 1)
  }

  back() {
    this.currentStep.update(step => step - 1)
  }

  login() {
    console.log('login')
  }

  logout() {
    console.log('logout')
  }

  onStep1() {
    this.isLoading.set(true)

    this.http.post(`${this.apiUrl}/auth/send-code`, {email: this.email()})
    .subscribe({
      next: () => {
        this.next()
        this.isLoading.set(false)
      },
      error: (err) => {
        console.error(err.error.message)
        this.isLoading.set(false)
      }
    });
  }

  onStep2() {
    this.isLoading.set(true)

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

}
