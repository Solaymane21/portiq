import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { User } from '../models/user.model';
import { AuthService } from './auth.service';
import { NotificationsService } from './notifications.service';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  http = inject(HttpClient);
  authService = inject(AuthService);
  notificationService = inject(NotificationsService)

  apiUrl = environment.apiUrl;

  isLoading = signal<boolean>(false)
  username = signal<User['name']>('')
  currentPassword = signal<User['password']>('')
  newPassword = signal<User['password']>('')
  confirmPassword = signal<User['password']>('')

  // actualiza el nombre del usuario y actualiza los datos locales
  onChangeName() {
    this.isLoading.set(true)

    this.http.post(`${this.apiUrl}/change-name`, {name: this.username()})
    .subscribe({
      next: (res: any) => {
        this.authService.updateLocalUser(res.user)
        this.notificationService.success('Nombre actualizado correctamente.')
        this.isLoading.set(false)
      },
      error: (err) => {
        console.error(err.error.message)
        this.isLoading.set(false)
      }
    });
  }

  // envia la contraseña actual y la nueva para actualizarla
  onChangePassword() {
    this.isLoading.set(true)

    this.http.post(`${this.apiUrl}/change-password`, {
      current_password: this.currentPassword(),
      new_password: this.newPassword(),
      confirm_password: this.confirmPassword()
    }).subscribe({
      next: () => {
        this.notificationService.success('Contraseña actualizada correctamente.')
        this.isLoading.set(false)
      },
      error: (err) => {
        this.notificationService.error(err.error.message)
        this.isLoading.set(false)
      }
    });
  }

  // elimina la cuenta, limpia los datos locales y ejecuta el callback de exito
  onDeleteAccount(onSuccess: () => void) {
    this.isLoading.set(true)

    this.http.delete<{ message: string }>(`${this.apiUrl}/account`).subscribe({
      next: () => {
        this.authService.removeUserData()
        this.isLoading.set(false)
        this.authService.redirectMsg.set({msg: 'Tú cuenta ha sido eliminada de PortIQ.', type: 'info'})
        onSuccess()
      },
      error: () => {
        this.notificationService.error('Error al eliminar la cuenta');
      }
    });
  }

}
