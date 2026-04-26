import { Component, inject } from '@angular/core';
import {CdkMenu, CdkMenuItem, CdkMenuTrigger} from '@angular/cdk/menu';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-topbar-admin',
  imports: [CdkMenu, CdkMenuItem, CdkMenuTrigger],
  templateUrl: './topbar-admin.component.html',
  styleUrl: './topbar-admin.component.css'
})
export class TopbarAdminComponent {
  authService = inject(AuthService)
}
