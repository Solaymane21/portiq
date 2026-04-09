import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { AuthService } from '../../../../../services/auth.service';

@Component({
  selector: 'app-register-password',
  imports: [ReactiveFormsModule],
  templateUrl: './register-password.component.html',
  styleUrl: './register-password.component.css'
})
export class RegisterPasswordComponent {
  authService = inject(AuthService)

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
    if (this.registerForm.invalid) return;
    this.authService.password.set(this.registerForm.value.password!)
    this.authService.onStep3()
  }
}
