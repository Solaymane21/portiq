import { Component, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-topbar-admin',
  imports: [],
  templateUrl: './topbar-admin.component.html',
  styleUrl: './topbar-admin.component.css'
})
export class TopbarAdminComponent {
  authService = inject(AuthService)
}
