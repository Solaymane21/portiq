import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [ReactiveFormsModule, MatProgressSpinnerModule],
  templateUrl: './settings.component.html',
})
export class SettingsComponent {
  authService = inject(AuthService);
  settingsService = inject(SettingsService);

  user = this.authService.currentUser;

  activeSection = signal<string>('perfil');

  submittedProfile  = signal<boolean>(false);
  submittedPassword = signal<boolean>(false);

  passwordVisible        = false;
  newPasswordVisible     = false;
  confirmPasswordVisible = false;

  currency        = signal<'EUR' | 'USD'>('EUR');
  renewalDate     = signal<string>('01/06/2026');
  showDeleteModal = signal<boolean>(false);
  showCancelModal = signal<boolean>(false);

  profileForm = new FormGroup({
    name: new FormControl(this.user()?.name ?? '', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(20),
    ]),
  });

  passwordForm = new FormGroup({
    currentPassword: new FormControl('', [Validators.required]),
    newPassword: new FormControl('', [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#._-]).*$/)
    ]),
    confirmPassword: new FormControl('', [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#._-]).*$/)
    ]),
  });

  isSamePassword(): boolean {
    if (this.passwordForm.invalid) return false;
    return this.passwordForm.value.newPassword === this.passwordForm.value.confirmPassword;
  }

  showHidePassword(id: string) {
    const input = document.getElementById(id) as HTMLInputElement;
    input.type = input.type === 'password' ? 'text' : 'password';
    if (id === 'currentPassword') this.passwordVisible        = !this.passwordVisible;
    if (id === 'newPassword')     this.newPasswordVisible     = !this.newPasswordVisible;
    if (id === 'confirmPassword') this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  saveName() {
    this.submittedProfile.set(true);
    if (this.profileForm.invalid) return;

    this.settingsService.username.set(this.profileForm.value.name!)
    this.settingsService.onChangeName()
  }

  changePassword() {
    if (this.passwordForm.invalid || !this.isSamePassword()) return;

    this.settingsService.currentPassword.set(this.passwordForm.value.currentPassword!);
    this.settingsService.newPassword.set(this.passwordForm.value.newPassword!);
    this.settingsService.confirmPassword.set(this.passwordForm.value.confirmPassword!);

    this.settingsService.onChangePassword();
  }

  savePreferences()    { /* TODO */ }
  upgradePremium()     { /* TODO: Stripe checkout */ }
  cancelSubscription() { this.showCancelModal.set(false); }
  deleteAccount()      { this.showDeleteModal.set(false); }
}
