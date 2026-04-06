import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentStep = signal<number>(1);

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
}
