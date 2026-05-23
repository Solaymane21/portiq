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

export interface FavoritePortfolio {
  favorite_id: number;
  portfolio_id: number;
  name: string;
  is_public: boolean;
  is_default: boolean;
  owner_id: number;
  created_at: string;
  updated_at: string;
}

interface FavoritesResponse {
  assets: Favorite[];
  portfolios: FavoritePortfolio[];
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
  favoritePortfolios = signal<FavoritePortfolio[]>([]);
  loaded = signal<boolean>(false);
  fetching = signal<boolean>(false);
  followingPortfolioIds = signal<Set<number>>(new Set());

  // Llamado desde InitialDataService tras login
  hydrate(data: FavoritesResponse): void {
    const assets = data?.assets ?? [];
    const portfolios = data?.portfolios ?? [];
  
    this.favorites.set(assets);
    this.favoritePortfolios.set(portfolios);
    this.syncFollowingIds(portfolios);
    this.loaded.set(true);
    this.saveCache({ assets, portfolios });
  }

  load(): Observable<FavoritesResponse> {
    // omitir si ya esta en memoria
    if (this.loaded()) return of({ assets: this.favorites(), portfolios: this.favoritePortfolios() });

    // primero mirar en localStorage sino hacer peticion
    const cached = this.getCache();
    if (cached) {
      this.favorites.set(cached.assets);
      this.favoritePortfolios.set(cached.portfolios);
      this.loaded.set(true);
      this.fetchFromApi().subscribe();
      return of(cached);
    }

    this.fetching.set(true);
    return this.fetchFromApi();
  }

  private fetchFromApi(): Observable<FavoritesResponse> {
    return this.http.get<FavoritesResponse>(`${this.apiUrl}/favorites`).pipe(
      tap({
        next: (data) => {
          const assets = data?.assets ?? [];
          const portfolios = data?.portfolios ?? [];

          this.favorites.set(assets);
          this.favoritePortfolios.set(portfolios);
          this.syncFollowingIds(portfolios);
          this.loaded.set(true);
          this.fetching.set(false);
          this.saveCache({ assets, portfolios });
        },
        error: () => {
          this.fetching.set(false);
        }
      })
    );
  }

   private saveCache(data: FavoritesResponse): void {
    if (this.preferencesService.cookies() !== true) return;
    localStorage.setItem(this.CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  }

  private getCache(): FavoritesResponse | null {
    try {
      const raw = localStorage.getItem(this.CACHE_KEY);
      if (!raw) return null;

      const { data, timestamp } = JSON.parse(raw);

      if (Date.now() - timestamp > this.CACHE_TTL) {
        localStorage.removeItem(this.CACHE_KEY);
        return null;
      }

      return data as FavoritesResponse;
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
            this.saveCache({ assets: updated, portfolios: this.favoritePortfolios() });
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
            this.saveCache({ assets: updated, portfolios: this.favoritePortfolios() });
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

  removePortfolio(portfolioId: number, name?: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/favorites/portfolios/${portfolioId}`).pipe(
      tap({
        next: () => {
          this.favoritePortfolios.update(list => {
            const updated = list.filter(p => p.portfolio_id !== portfolioId);
            this.syncFollowingIds(updated);
            this.saveCache({ assets: this.favorites(), portfolios: updated });
            return updated;
          });
          this.notificationService.info(`Portfolio "${name}" quitado de favoritos`);
        },
        error: () => this.notificationService.error('No se pudo quitar el portfolio de favoritos')
      })
    );
  }

  isPortfolioFavorite(portfolioId: number): boolean {
    return this.favoritePortfolios().some(p => p.portfolio_id === portfolioId);
  }

  invalidate(): void {
    this.loaded.set(false);
    this.clearCache();
  }

  syncFollowingIds(portfolios: FavoritePortfolio[] | undefined | null): void {
    const list = portfolios ?? [];
    this.followingPortfolioIds.set(new Set(list.map(p => p.portfolio_id)));
  }

}
