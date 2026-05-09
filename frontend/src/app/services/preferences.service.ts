import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { NotificationsService } from './notifications.service';
import { UserPreferences } from '../models/preferences.model';
import { environment } from '../../environments/environment';

export type ColorTheme = 'orange' | 'lime' | 'teal' | 'sky' | 'indigo' | 'violet' | 'rose';

@Injectable({
  providedIn: 'root'
})

export class PreferencesService {
  http = inject(HttpClient);
  notification = inject(NotificationsService);
  apiUrl = environment.apiUrl;

  currency = signal<'EUR' | 'USD'>('EUR');
  theme = signal<'dark' | 'light'>('dark');
  colorTheme = signal<ColorTheme>('orange');
  isLoading = signal(false);

  colors: { value: ColorTheme; hex: string; label: string }[] = [
    { value: 'orange', hex: '#f97316', label: 'Naranja' },
    { value: 'lime',   hex: '#84cc16', label: 'Lima'    },
    { value: 'teal',   hex: '#14b8a6', label: 'Teal'    },
    { value: 'sky',    hex: '#0ea5e9', label: 'Cielo'   },
    { value: 'indigo', hex: '#6366f1', label: 'Índigo'  },
    { value: 'violet', hex: '#8b5cf6', label: 'Violeta' },
    { value: 'rose',   hex: '#f43f5e', label: 'Rosa'    },
  ];

  // carga las preferencias del usuario desde la api
  load() {
    this.http.get<UserPreferences>(`${this.apiUrl}/preferences`).subscribe({
      next: (res) => {
        this.currency.set(res.currency);
        this.theme.set(res.theme);
        this.applyColor(res.color_theme ?? 'orange');
      }
    });
  }

  // guarda las preferencias actuales en la base de datos mediante la API
  save() {
    this.isLoading.set(true);
    this.http.patch<UserPreferences>(`${this.apiUrl}/preferences`, {
      currency: this.currency(),
      theme: this.theme(),
      color_theme: this.colorTheme()
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

   // aplica el color al html sin guardar en BD
  applyColor(color: ColorTheme) {
    this.colorTheme.set(color);

    document.documentElement.removeAttribute('data-color');
    document.documentElement.setAttribute('data-color', color);
  }
}
