import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../../services/auth.service';

@Component({
  selector: 'app-register-data',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register-data.component.html',
  styleUrl: './register-data.component.css'
})
export class RegisterDataComponent {
  authService = inject(AuthService)

  passwordVisible: boolean = false;
  confirmPasswordVisible: boolean = false;

  registerForm = new FormGroup({
    username: new FormControl('', [
      Validators.required,
      Validators.minLength(3)
    ]),
    email: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    ])
  })
  
}
