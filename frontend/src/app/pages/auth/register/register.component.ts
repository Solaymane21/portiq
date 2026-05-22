import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { RegisterDataComponent } from './steps/register-data/register-data.component';
import { RegisterVerificationComponent } from './steps/register-verification/register-verification.component';
import { RegisterPasswordComponent } from "./steps/register-password/register-password.component";
import { RegisterPlanComponent } from './steps/register-plan/register-plan.component';

@Component({
  selector: 'app-register',
  imports: [RegisterDataComponent, RegisterVerificationComponent, RegisterPasswordComponent, RegisterPlanComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {
  authService = inject(AuthService)

  progressPercent = computed(() => (this.authService.currentStep() / 4) * 100);

  ngOnInit(): void {
      this.authService.msgError.set('')
  }
}
