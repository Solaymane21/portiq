// services/favorites.service.ts
import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { SearchResult } from '../models/search.model';
import { NotificationsService } from './notifications.service';

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
  private apiUrl = 'http://localhost:8000/api';
  private notificationService = inject(NotificationsService)

  favorites = signal<Favorite[]>([]);
  loaded = signal<boolean>(false);
  fetching = signal<boolean>(false);

  load(): Observable<Favorite[]> {
    if (this.loaded()) return of(this.favorites());

    this.fetching.set(true);

    return this.http.get<Favorite[]>(`${this.apiUrl}/favorites`).pipe(
      tap({
        next: (data) => {
          this.favorites.set(data);
          this.loaded.set(true);
          this.fetching.set(false);
        },
        error: () => this.fetching.set(false)
      })
    );
  }

  add(result: SearchResult): Observable<Favorite> {
    if (this.isFavorite(result.symbol)) {
      return new Observable();
    }

    return this.http.post<Favorite>(`${this.apiUrl}/favorites`, result).pipe(
      tap({
        next: (newFav) => {
          this.favorites.update(favs => [...favs, newFav]);
          this.notificationService.success(`Has añadido a favoritos a ${newFav?.name} (${newFav?.symbol})`);
        },
        error: () => {
          this.notificationService.error('No se pudo añadir a favoritos');
        }
      })
    );
  }

  remove(symbolId: number, name?: string, symbol?: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/favorites/${symbolId}`).pipe(
      tap({
        next: () => {
          this.favorites.update(favs => favs.filter(f => f.symbol_id !== symbolId));
          this.notificationService.info(`${name} (${symbol}) quitado de favoritos`);
        },
        error: () => {
          this.notificationService.error('No se pudo quitar de favoritos');
        }
      })
    );
  }

  isFavorite(symbol: string): boolean {
    return this.favorites().some(f => f.symbol === symbol);
  }
}
