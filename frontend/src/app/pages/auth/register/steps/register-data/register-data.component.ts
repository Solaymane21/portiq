import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../../services/auth.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-register-data',
  imports: [ReactiveFormsModule, RouterLink, MatProgressSpinnerModule],
  templateUrl: './register-data.component.html',
  styleUrl: './register-data.component.css'
})
export class RegisterDataComponent {
  authService = inject(AuthService)
  submitted = signal<boolean>(false)

  registerForm = new FormGroup({
    username: new FormControl(
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(20)
      ]
    ),
    email: new FormControl(
      '',
      [
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
      ]
    ),
    termsAccepted: new FormControl(false, [Validators.requiredTrue])
  })

  next() {
    this.submitted.set(true)

    if (this.registerForm.invalid) return;

    this.authService.username.set(this.registerForm.value.username!)
    this.authService.email.set(this.registerForm.value.email!.toLowerCase())

    this.authService.onStep1()
  }

  continueWithGoogle() {
    const termsControl = this.registerForm.get('termsAccepted');

    if (termsControl?.invalid) {
      termsControl.markAsTouched();
      return;
    }

    this.authService.onLoginWithGoogle();
  }

}
