import { Component, computed, inject, input } from '@angular/core';
import { SubscriptionService } from '../../services/subscription.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-plan-limit-banner',
  imports: [RouterLink],
  templateUrl: './plan-limit-banner.component.html',
  styleUrl: './plan-limit-banner.component.css'
})
export class PlanLimitBannerComponent {
  // Inputs
  resource = input.required<'portfolios' | 'favorites' | 'alerts'>();
  limitText = input.required<string>();

  subscriptionService = inject(SubscriptionService);

  isAtLimit = computed(() => {
    const remaining = this.subscriptionService.remainingSlots(this.resource());
    return remaining !== null && remaining <= 0;
  });

  showBanner = computed(() =>
    !this.subscriptionService.isPremium() && this.isAtLimit()
  );
}
