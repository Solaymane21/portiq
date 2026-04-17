import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {

  authService = inject(AuthService)
  router = inject(Router)
  showLogoutModal = signal<boolean>(false);

  collapsed = signal(false)

  toggle() {
    this.collapsed.update(v => !v)
  }

  onConfirmLogout() {
    this.showLogoutModal.set(false);
    this.authService.onLogout();
  }
}
