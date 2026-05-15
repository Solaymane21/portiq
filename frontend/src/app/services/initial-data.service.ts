import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { FavoritesService } from './favorites.service';
import { map, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { PreferencesService } from './preferences.service';

@Injectable({
  providedIn: 'root'
})
export class InitialDataService {

  private http = inject(HttpClient);
  private favoritesService = inject(FavoritesService);
  private preferencesService = inject(PreferencesService);

  private apiUrl = environment.apiUrl;

  ready = signal<boolean>(false);

  run(): Observable<void> {
    return this.http.get<any>(`${this.apiUrl}/initial-data`).pipe(
      tap((data) => {
        if (data.favorites) this.favoritesService.hydrate(data.favorites);

        if (data.preferences) {
          this.preferencesService.currency.set(data.preferences.currency ?? 'EUR');
          this.preferencesService.theme.set(data.preferences.theme ?? 'dark');
          this.preferencesService.cookies.set(data.preferences.cookies ?? null);
          this.preferencesService.applyColor(data.preferences.color_theme ?? 'orange');
        }

        this.ready.set(true);
      }),
      map(() => void 0)
    );
  }

}
