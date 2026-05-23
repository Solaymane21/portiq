import { Component, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { PreferencesService } from '../../services/preferences.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-topbar-admin',
  imports: [],
  templateUrl: './topbar-admin.component.html',
  styleUrl: './topbar-admin.component.css'
})
export class TopbarAdminComponent {
  authService = inject(AuthService)
  preferencesService = inject(PreferencesService);
  private router = inject(Router);
  
  goToPublic(): void {
    this.router.navigate(['/public/home']);
  }

  updateMode() {
    const next = this.preferencesService.theme() === 'dark' ? 'light' : 'dark';
    this.preferencesService.applyTheme(next);
  }

}
