import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { NotificationsService } from './notifications.service';
import { UserPreferences } from '../models/preferences.model';
import { environment } from '../../environments/environment';

export type ColorTheme = 'orange' | 'lime' | 'teal' | 'sky' | 'indigo' | 'violet' | 'rose' | 'red';

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
  cookies = signal<boolean | null>(null);
  isLoading = signal(true);

  colors: { value: ColorTheme; hex: string; label: string }[] = [
    { value: 'orange', hex: '#f97316', label: 'Naranja' },
    { value: 'lime',   hex: '#84cc16', label: 'Lima'    },
    { value: 'teal',   hex: '#14b8a6', label: 'Teal'    },
    { value: 'sky',    hex: '#0ea5e9', label: 'Cielo'   },
    { value: 'indigo', hex: '#6366f1', label: 'Índigo'  },
    { value: 'violet', hex: '#8b5cf6', label: 'Violeta' },
    { value: 'rose',   hex: '#f43f5e', label: 'Rosa'    },
    { value: 'red',    hex: '#ef4444', label: 'Rojo'    }
  ];

  readonly colorHex = computed(() => {
    const map: Record<ColorTheme, string> = {
      orange: '#f97316',
      lime:   '#84cc16',
      teal:   '#14b8a6',
      sky:    '#0ea5e9',
      indigo: '#6366f1',
      violet: '#8b5cf6',
      rose:   '#f43f5e',
      red:    '#ef4444'
    };
    return map[this.colorTheme()];
  });

  // carga las preferencias del usuario desde la api
  load() {
    this.isLoading.set(true)

    this.http.get<UserPreferences>(`${this.apiUrl}/preferences`).subscribe({
      next: (res) => {
        this.currency.set(res.currency ?? 'EUR');
        this.theme.set(res.theme ?? 'dark');
        this.cookies.set(res.cookies ?? null)
        this.applyColor(res.color_theme ?? 'orange');
        
        this.isLoading.set(false)
      },
      error: () => {
        this.notification.error('Error al cargar preferencias');
        this.isLoading.set(false);
      }
    });
  }

  // guarda las preferencias actuales en la base de datos mediante la API
  save() {
    this.isLoading.set(true);

    this.http.patch<UserPreferences>(`${this.apiUrl}/preferences`, {
      currency: this.currency(),
      theme: this.theme(),
      color_theme: this.colorTheme(),
      cookies: this.cookies()
    }).subscribe({
      next: () => {
        this.notification.success('Preferencias guardadas');
        this.setLocal('portiq_color_theme', this.colorTheme());
        this.setLocal('portiq_theme', this.theme());
        this.setLocal('portiq_currency', this.currency());
        if(!this.cookies()) this.clearLocalStorage()
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
    this.setLocal('portiq_color_theme', color);
    document.documentElement.setAttribute('data-color', color);
  }

  applyTheme(theme: 'dark' | 'light') {
    this.theme.set(theme);
    this.setLocal('portiq_theme', theme);
    
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }

  saveCookies(allow: boolean) {
    this.http.patch<UserPreferences>(`${this.apiUrl}/preferences/cookies`, {
      cookies: allow
    }).subscribe({
      next: (res) => {
        this.notification.success('Elección guardada. Puedes cambiarla desde configuración.');
        this.cookies.set(res.cookies ?? null);
        if (!allow) {
          this.clearLocalStorage();
        }
      },
      error: () => {
        this.notification.error('Error al guardar preferencia de cookies');
      }
    });
  }

  setLocal(key: string, value: string) {
    if (this.cookies() === true) {
      localStorage.setItem(key, value);
    }
  }

  clearLocalStorage() {
    localStorage.removeItem('portiq_color_theme');
    localStorage.removeItem('portiq_theme');
    localStorage.removeItem('portiq_currency');
    localStorage.removeItem('portiq_favorites');
  }

}
