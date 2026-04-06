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
      Validators.minLength(6)
    ]),
    confirm_password: new FormControl('', [
      Validators.required,
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#._-]).*$/),
      Validators.minLength(6)
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
}
