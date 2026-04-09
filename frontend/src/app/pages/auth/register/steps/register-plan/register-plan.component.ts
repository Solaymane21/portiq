import { Component, inject } from '@angular/core';
import { AuthService } from '../../../../../services/auth.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-register-plan',
  imports: [MatProgressSpinnerModule],
  templateUrl: './register-plan.component.html',
  styleUrl: './register-plan.component.css'
})
export class RegisterPlanComponent {
  authService = inject(AuthService)

  onFreePlan() {
    this.authService.subscription_type.set('free')
    this.authService.onStep4()
  }

  onPremiumPlan() {
    this.authService.subscription_type.set('premium')
    this.authService.onStep4()
  }

}
