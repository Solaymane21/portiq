import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, MatProgressSpinnerModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent {

  authService = inject(AuthService)
  router = inject(Router)

  passwordVisible: boolean = false;
  confirmPasswordVisible: boolean = false;

  registerForm = new FormGroup({
    password: new FormControl('', [
      Validators.required,
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#._-]).*$/),
      Validators.minLength(8)
    ]),
    confirm_password: new FormControl('', [
      Validators.required,
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#._-]).*$/),
      Validators.minLength(8)
    ])
  })

  showHidePassword(id: string) {
    const password = document.getElementById(id) as HTMLInputElement;

    password.type = (password.type === 'password') ? 'text' : 'password'

     if (id === 'password') {
      this.passwordVisible = !this.passwordVisible;
    } else {
      this.confirmPasswordVisible = !this.confirmPasswordVisible;
    }
  }

  isSamePassword() {
    if(this.registerForm.invalid) return false
    return this.registerForm.value.password === this.registerForm.value.confirm_password
  }

  next() {
    this.authService.password.set(this.registerForm.value.password!)

    this.authService.onResetPassword(this.registerForm.value.password!)
  }

}
