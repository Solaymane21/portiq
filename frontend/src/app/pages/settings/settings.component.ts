import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './settings.component.html',
})
export class SettingsComponent {
  authService = inject(AuthService);
  user = this.authService.currentUser;

  activeSection = signal<string>('perfil');

  name = this.user()?.name ?? '';
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  passwordError = signal<string>('');
  currency = signal<'EUR' | 'USD'>('EUR');
  renewalDate = signal<string>('01/06/2026');
  showDeleteModal = signal<boolean>(false);
  showCancelModal = signal<boolean>(false);

  saveName() {
    // TODO: llamada al backend
  }

  changePassword() {
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError.set('Las contraseñas no coinciden.');
      return;
    }
    this.passwordError.set('');
    // TODO: llamada al backend
  }

  savePreferences() {
    // TODO: guardar moneda
  }

  upgradePremium() {
    // TODO: Stripe checkout
  }

  cancelSubscription() {
    this.showCancelModal.set(false);
    // TODO: llamada al backend
  }

  deleteAccount() {
    this.showDeleteModal.set(false);
    // TODO: llamada al backend + logout
  }
}