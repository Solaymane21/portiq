import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, MatProgressSpinnerModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  router = inject(Router)
  authService = inject(AuthService)

  passwordVisible: boolean = false;
  confirmPasswordVisible: boolean = false;

  submitted = signal<boolean>(false)


  loginForm = new FormGroup({
    email: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    ]),
    password: new FormControl('', [
      Validators.required
    ])
  });

  onSubmit() {
    this.submitted.set(true)
    if(this.loginForm.invalid) return

    this.authService.email.set(this.loginForm.value.email!)
    this.authService.password.set(this.loginForm.value.password!)

    this.authService.onLogin()
  }

  showHidePassword(id: string) {
    const password = document.getElementById(id) as HTMLInputElement;

    password.type = (password.type === 'password') ? 'text' : 'password'

     if (id === 'password') {
      this.passwordVisible = !this.passwordVisible;
    } else {
      this.confirmPasswordVisible = !this.confirmPasswordVisible;
    }
  }
}
