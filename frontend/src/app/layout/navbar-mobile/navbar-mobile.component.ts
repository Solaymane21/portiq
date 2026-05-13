import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar-mobile',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar-mobile.component.html',
  styleUrl: './navbar-mobile.component.css'
})
export class NavbarMobileComponent {

  showMoreMenu = signal(false);
  showLogoutModal = signal<boolean>(false);
  private authService = inject(AuthService);
  private router = inject(Router)

  onConfirmLogout() {
    this.showLogoutModal.set(false);
    this.authService.onLogout();
  }

  isMoreMenuActive(): boolean {
    const moreRoutes = ['/app/investor-profile', '/app/ranking', '/app/settings', '/privacy-policy'];
    return moreRoutes.some(route => this.router.url.includes(route));
  }
}
