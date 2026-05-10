import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { BreakpointObserver } from '@angular/cdk/layout';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, NgClass],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {

  authService = inject(AuthService);
  showLogoutModal = signal<boolean>(false);
  collapsed = signal(false);

  private bp = inject(BreakpointObserver);

  isTablet = signal(false);

  constructor() {
    this.bp
      .observe('(min-width: 768px) and (max-width: 1200px)')
      .pipe(takeUntilDestroyed())
      .subscribe(result => {
        this.isTablet.set(result.matches);
        // Si entra en tablet, fuerza collapsed
        if (result.matches) this.collapsed.set(true);
        // Si sale de tablet a desktop, expande
        else this.collapsed.set(false);
      });
  }

  sidebarWidth = computed(() => {
    if (this.isTablet()) return 'w-24';
    return this.collapsed() ? 'w-24' : 'w-60';
  });

  showToggleButton = computed(() => !this.isTablet());

  toggle() {
    if (!this.isTablet()) {
      this.collapsed.update(v => !v);
    }
  }

  onConfirmLogout() {
    this.showLogoutModal.set(false);
    this.authService.onLogout();
  }
}
