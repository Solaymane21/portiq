import { Component, inject } from '@angular/core';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { Router, RouterOutlet } from '@angular/router';
import { TopbarComponent } from '../topbar/topbar.component';
import { FooterComponent } from '../footer/footer.component';
import { NavbarMobileComponent } from '../navbar-mobile/navbar-mobile.component';
import { ToastComponent } from '../../components/toast/toast.component';
import { CookiesBannerComponent } from "../../components/cookies-banner/cookies-banner.component";
import { CookiesService } from '../../services/cookies.service';
import { AuthService } from '../../services/auth.service';
import { FavoritesService } from '../../services/favorites.service';

@Component({
  selector: 'app-main-layout',
  imports: [SidebarComponent, RouterOutlet, TopbarComponent, FooterComponent, NavbarMobileComponent, ToastComponent, CookiesBannerComponent, CookiesBannerComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent {
  cookiesService = inject(CookiesService)
  authService = inject(AuthService)
  private favoritesService = inject(FavoritesService)
  private router = inject(Router)

  // sale de la demo y lleva al registro
  leaveDemo() {
    this.authService.removeUserData();
    this.favoritesService.clearCache();
    this.authService.currentStep.set(1);
    this.router.navigate(['/auth/register']);
  }
}
