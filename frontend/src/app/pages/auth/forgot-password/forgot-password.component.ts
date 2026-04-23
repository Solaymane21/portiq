import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { EmailValidationComponent } from './steps/email-validation/email-validation.component';
import { RegisterVerificationComponent } from '../register/steps/register-verification/register-verification.component';

@Component({
  selector: 'app-forgot-password',
  imports: [EmailValidationComponent, RegisterVerificationComponent],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent implements OnInit ,OnDestroy {

  authService = inject(AuthService)

  ngOnInit(): void {
    this.authService.isForgotPassword.set(true)
  }

  ngOnDestroy(): void {
    this.authService.isForgotPassword.set(false)
  }
}
