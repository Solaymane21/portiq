import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { SearchResult } from '../models/search.model';
import { NotificationsService } from './notifications.service';
import { environment } from '../../environments/environment';
import { PreferencesService } from './preferences.service';

export interface Favorite {
  id: number;
  symbol_id: number;
  symbol: string;
  name: string;
  image_url: string | null;
  asset_type: 'crypto' | 'stock' | 'etf';
  api_id: string;
}

@Injectable({ providedIn: 'root' })
export class FavoritesService {

  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private notificationService = inject(NotificationsService);
  private preferencesService = inject(PreferencesService);

  private readonly CACHE_KEY = 'portiq_favorites';
  private readonly CACHE_TTL = 5 * 60 * 1000;

  favorites = signal<Favorite[]>([]);
  loaded = signal<boolean>(false);
  fetching = signal<boolean>(false);

  // Llamado desde InitialDataService tras login
  hydrate(data: Favorite[]): void {
    this.favorites.set(data);
    this.loaded.set(true);
    this.saveCache(data);
  }

  load(): Observable<Favorite[]> {
    // omitir si ya esta en memoria
    if (this.loaded()) return of(this.favorites());

    // primero mirar en localStorage sino hacer peticion
    const cached = this.getCache();
    if (cached) {
      this.favorites.set(cached);
      this.loaded.set(true);
      this.fetchFromApi().subscribe();
      return of(cached);
    }

    this.fetching.set(true);
    return this.fetchFromApi();
  }

  private fetchFromApi(): Observable<Favorite[]> {
    return this.http.get<Favorite[]>(`${this.apiUrl}/favorites`).pipe(
      tap({
        next: (data) => {
          this.favorites.set(data);
          this.loaded.set(true);
          this.fetching.set(false);
          this.saveCache(data);
        },
        error: () => {
          this.fetching.set(false);
        }
      })
    );
  }

  private saveCache(data: Favorite[]): void {
    if (this.preferencesService.cookies() !== true) return;
    localStorage.setItem(this.CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  }

  private getCache(): Favorite[] | null {
    try {
      const raw = localStorage.getItem(this.CACHE_KEY);
      if (!raw) return null;

      const { data, timestamp } = JSON.parse(raw);

      if (Date.now() - timestamp > this.CACHE_TTL) {
        localStorage.removeItem(this.CACHE_KEY);
        return null;
      }

      return data as Favorite[];
    } catch {
      return null;
    }
  }

  clearCache(): void {
    localStorage.removeItem(this.CACHE_KEY);
  }

  add(result: SearchResult): Observable<Favorite> {
    if (this.isFavorite(result.symbol)) return new Observable();

    return this.http.post<Favorite>(`${this.apiUrl}/favorites`, result).pipe(
      tap({
        next: (newFav) => {
          this.favorites.update(favs => {
            const updated = [...favs, newFav];
            this.saveCache(updated);
            return updated;
          });
          this.notificationService.success(`Has añadido a favoritos a ${newFav?.name} (${newFav?.symbol})`);
        },
        error: () => this.notificationService.error('No se pudo añadir a favoritos')
      })
    );
  }

  remove(symbolId: number, name?: string, symbol?: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/favorites/${symbolId}`).pipe(
      tap({
        next: () => {
          this.favorites.update(favs => {
            const updated = favs.filter(f => f.symbol_id !== symbolId);
            this.saveCache(updated);
            return updated;
          });
          this.notificationService.info(`${name} (${symbol}) quitado de favoritos`);
        },
        error: () => this.notificationService.error('No se pudo quitar de favoritos')
      })
    );
  }

  isFavorite(symbol: string): boolean {
    return this.favorites().some(f => f.symbol === symbol);
  }
}
