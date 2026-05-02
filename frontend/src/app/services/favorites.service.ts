// services/favorites.service.ts
import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { SearchResult } from '../models/search.model';

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

  favorites = signal<Favorite[]>([]);
  loaded = signal<boolean>(false);
  fetching = signal<boolean>(false);

  load(): void {
    if (this.loaded()) return;

    this.fetching.set(true)

    this.http.get<Favorite[]>(`${this.apiUrl}/favorites`).subscribe({
      next: (data) => {
        this.favorites.set(data);
        this.loaded.set(true);
        this.fetching.set(false);
      },
      error: () => {
        this.fetching.set(false);
      }
    });
  }

  add(result: SearchResult): Observable<Favorite> {
    return this.http.post<Favorite>(`${this.apiUrl}/favorites`, result).pipe(
      tap((newFav) => {
        // actualizar signal
        this.favorites.update(favs => [...favs, newFav]);
      })
    );
  }

  remove(symbolId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/favorites/${symbolId}`).pipe(
      tap(() => {
        // actualizar signal
        this.favorites.update(favs =>
          favs.filter(f => f.symbol_id !== symbolId)
        );
      })
    );
  }

  isFavorite(symbol: string): boolean {
    return this.favorites().some(f => f.symbol === symbol);
  }
}