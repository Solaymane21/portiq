import { Component, inject } from '@angular/core';
import { InvestorProfileService } from '../../services/investor-profile.service';
import { InvestorResultComponent } from '../../components/investor-result/investor-result.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SubscriptionService } from '../../services/subscription.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-investor-profile',
  imports: [InvestorResultComponent, MatProgressSpinnerModule, RouterLink],
  templateUrl: './investor-profile.component.html',
  styleUrl: './investor-profile.component.css'
})
export class InvestorProfileComponent {
  service = inject(InvestorProfileService)
  subscriptionService = inject(SubscriptionService);
}
