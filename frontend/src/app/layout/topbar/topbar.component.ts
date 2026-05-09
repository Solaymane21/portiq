import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { RouterLink } from "@angular/router";
import { SubscriptionService } from '../../services/subscription.service';

@Component({
  selector: 'app-topbar',
  imports: [RouterLink],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css'
})
export class TopbarComponent implements OnInit {
  private authService = inject(AuthService);

  user = this.authService.currentUser;
  isPremium = signal<boolean>(false);

  // computed se recalcula automáticamente cuando currentUser cambia
  avatar = computed(() =>
    this.user()?.avatar ?? 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=q'
  );

  ngOnInit(): void {
    this.authService.isPremium().subscribe(value => {
      this.isPremium.set(value);
    });
  }

}
