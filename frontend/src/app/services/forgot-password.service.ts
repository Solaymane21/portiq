import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class ForgotPasswordService {

  currentStep = signal<'email' | 'code'>('email')
  router = inject(Router)

  onBack() {
    if(this.currentStep() === 'email') {
      this.router.navigate(['/auth/login'])
    } else {
      this.currentStep.set('email')
    }
    
  }

  onSendEmail() {
    this.currentStep.set('code')
  }

  onResendCode() {
    console.log('reenviar codigo')
  }

  onSendCode() {
    this.router.navigate(['/auth/reset-password'])
  }

  onSendResetPassword() {
    this.router.navigate(['/auth/login'])
  }
}
