import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { AuthService } from '../../../../../services/auth.service';

@Component({
  selector: 'app-register-plan',
  imports: [ReactiveFormsModule],
  templateUrl: './register-plan.component.html',
  styleUrl: './register-plan.component.css'
})
export class RegisterPlanComponent {
  authService = inject(AuthService)

  passwordVisible: boolean = false;
  confirmPasswordVisible: boolean = false;
  
}
