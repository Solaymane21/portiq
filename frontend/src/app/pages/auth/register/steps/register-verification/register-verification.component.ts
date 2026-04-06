import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { AuthService } from '../../../../../services/auth.service';

@Component({
  selector: 'app-register-verification',
  imports: [ReactiveFormsModule],
  templateUrl: './register-verification.component.html',
  styleUrl: './register-verification.component.css'
})
export class RegisterVerificationComponent {
  authService = inject(AuthService)

  passwordVisible: boolean = false;
  confirmPasswordVisible: boolean = false;

  registerForm = new FormGroup({
    code: new FormControl('', [
      Validators.required,
      Validators.minLength(6)
    ])
  })
  
}