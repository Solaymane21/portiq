import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { AuthService } from '../../../../../services/auth.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-register-verification',
  imports: [ReactiveFormsModule, MatProgressSpinnerModule],
  templateUrl: './register-verification.component.html',
  styleUrl: './register-verification.component.css'
})
export class RegisterVerificationComponent implements OnInit {
  authService = inject(AuthService)
  isResentCode = signal<boolean>(false)
  email: string = ''

  passwordVisible: boolean = false;
  confirmPasswordVisible: boolean = false;

  registerForm = new FormGroup({
    code: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[0-9]{6}$/)
    ])
  })

  ngOnInit(): void {
    this.email = this.authService.email();
  }

  onResendCode() {
    this.isResentCode.set(true)

    this.authService.onResendCode()
  }

  next() {
    if (this.registerForm.invalid) return;

    this.authService.code.set(this.registerForm.value.code!)

    this.authService.onStep2()
  }

}
