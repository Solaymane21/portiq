import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SettingsService } from '../../services/settings.service';
import { SubscriptionService } from '../../services/subscription.service';
import { A11yModule } from "@angular/cdk/a11y";
import { PreferencesService } from '../../services/preferences.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [ReactiveFormsModule, MatProgressSpinnerModule, A11yModule],
  templateUrl: './settings.component.html',
})
export class SettingsComponent {
  authService = inject(AuthService);
  settingsService = inject(SettingsService);
  subscriptionService = inject(SubscriptionService);
  preferencesService = inject(PreferencesService);
  router = inject(Router)

  user = this.authService.currentUser;

  activeSection = signal<string>('perfil');

  submittedProfile = signal<boolean>(false);
  submittedPassword = signal<boolean>(false);

  passwordVisible        = false;
  newPasswordVisible     = false;
  confirmPasswordVisible = false;

  currency = this.preferencesService.currency
  theme = this.preferencesService.theme

  showDeleteModal = signal<boolean>(false);
  showCancelModal = signal<boolean>(false);
  showResumeModal = signal(false);

  isSameName = signal<boolean>(false)

  renewalDate(): string {
    const status = this.subscriptionService.status();

    localStorage.setItem('abc', JSON.stringify(status))

    if (!status) return '—';

    if (status.on_grace && status.ends_at) {
      return new Date(status.ends_at).toLocaleDateString('es-ES');
    }

    if (status.next_billing_date) {
      return new Date(status.next_billing_date * 1000).toLocaleDateString('es-ES');
    }

    return '—';
  }

  ngOnInit() {
    this.subscriptionService.getStatus()
    this.preferencesService.load()
  }

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

  isSamePasswordValidator() {
    if (this.passwordForm.invalid) return false;
    return this.passwordForm.value.newPassword === this.passwordForm.value.confirmPassword;
  }

  showHidePassword(id: string) {
    const input = document.getElementById(id) as HTMLInputElement;
    input.type = input.type === 'password' ? 'text' : 'password';
    if (id === 'currentPassword') this.passwordVisible = !this.passwordVisible;
    if (id === 'newPassword') this.newPasswordVisible = !this.newPasswordVisible;
    if (id === 'confirmPassword') this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  saveName() {
    this.submittedProfile.set(true);
    this.isSameName.set(false)

    if (this.profileForm.invalid) return;

    if(this.isCurrentNameValidator()) {
      this.isSameName.set(true)
      return
    }

    this.settingsService.username.set(this.profileForm.value.name!)
    this.settingsService.onChangeName()
  }

  isCurrentNameValidator() {
    const currentName = this.user()?.name
    const newName = this.profileForm.value.name
    return currentName === newName
  }

  changePassword() {
    this.submittedPassword.set(true);

    if (this.passwordForm.invalid || !this.isSamePasswordValidator()) return;

    this.settingsService.currentPassword.set(this.passwordForm.value.currentPassword!);
    this.settingsService.newPassword.set(this.passwordForm.value.newPassword!);
    this.settingsService.confirmPassword.set(this.passwordForm.value.confirmPassword!);

    this.settingsService.onChangePassword();
  }

  cancelSubscription() {
    this.showCancelModal.set(true)
  }

  onConfirmCancelSubscription() {
    this.subscriptionService.cancel(() => {
      this.showCancelModal.set(false)
    });
  }

  resumeSubscription() {
    this.showResumeModal.set(true)
  }

  onConfirmResumeSubscription() {
    this.subscriptionService.resume(() => {
      this.showResumeModal.set(false);
    })
  }

  savePreferences() {
    this.preferencesService.save();
  }

  deleteAccount() {
    this.showDeleteModal.set(true)
  }

  onConfirmDeleteAccount() {
    this.settingsService.onDeleteAccount(() => {
      this.showDeleteModal.set(false)
      this.router.navigate(['/auth/login'])
    });
  }

  upgradePremium() {
    this.subscriptionService.checkout();
  }
  
}
