import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { NotificationsService } from './notifications.service';
import { UserPreferences } from '../models/preferences.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})

export class PreferencesService {
  http = inject(HttpClient);
  notification = inject(NotificationsService);
  apiUrl = environment.apiUrl;

  currency = signal<'EUR' | 'USD'>('EUR');
  theme    = signal<'dark' | 'light'>('dark');
  isLoading = signal(false);

  // carga las preferencias del usuario desde la api
  load() {
    this.http.get<UserPreferences>(`${this.apiUrl}/preferences`).subscribe({
      next: (res) => {
        this.currency.set(res.currency);
        this.theme.set(res.theme);
      }
    });
  }

  // guarda las preferencias actuales en la base de datos mediante la API
  save() {
    this.isLoading.set(true);
    this.http.patch<UserPreferences>(`${this.apiUrl}/preferences`, {
      currency: this.currency(),
      theme: this.theme(),
    }).subscribe({
      next: () => {
        this.notification.success('Preferencias guardadas');
        this.isLoading.set(false);
      },
      error: () => {
        this.notification.error('Error al guardar preferencias');
        this.isLoading.set(false);
      }
    });
  }
}
