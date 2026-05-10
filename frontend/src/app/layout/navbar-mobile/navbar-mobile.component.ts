import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
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

  onConfirmLogout() {
    this.showLogoutModal.set(false);
    this.authService.onLogout();
  }
}
