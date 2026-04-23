import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../../../../services/auth.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { User } from '../../../../../models/user.model';

@Component({
  selector: 'app-register-plan',
  imports: [MatProgressSpinnerModule],
  templateUrl: './register-plan.component.html',
  styleUrl: './register-plan.component.css'
})
export class RegisterPlanComponent {
  authService = inject(AuthService)
  planSelected = signal<User['suscription_type']>('free')

  onFreePlan() {
    this.authService.suscription_type.set('free')
    this.planSelected.set('free')
    this.authService.onStep4()
  }

  onPremiumPlan() {
    this.authService.suscription_type.set('premium')
    this.planSelected.set('premium')
    this.authService.onStep4()
  }

}
