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
  private readonly CACHE_TTL = 5 * 60 * 1000;  // 5 minutos de caché

  // Estados reactivos
  favorites = signal<Favorite[]>([]);
  favoritePortfolios = signal<FavoritePortfolio[]>([]);
  loaded = signal<boolean>(false);
  fetching = signal<boolean>(false);
  followingPortfolioIds = signal<Set<number>>(new Set());

  // Carga datos desde el backend (usado por InitialDataService)
  hydrate(data: FavoritesResponse): void {
    const assets = data?.assets ?? [];
    const portfolios = data?.portfolios ?? [];
  
    this.favorites.set(assets);
    this.favoritePortfolios.set(portfolios);
    this.syncFollowingIds(portfolios);
    this.loaded.set(true);
    this.saveCache({ assets, portfolios });
  }

  // Carga favoritos (primero desde caché, luego desde API)
  load(): Observable<FavoritesResponse> {
    if (this.loaded()) return of({ assets: this.favorites(), portfolios: this.favoritePortfolios() });

    const cached = this.getCache();
    if (cached) {
      this.favorites.set(cached.assets);
      this.favoritePortfolios.set(cached.portfolios);
      this.loaded.set(true);
      this.fetchFromApi().subscribe();  // Refresca en segundo plano
      return of(cached);
    }

    this.fetching.set(true);
    return this.fetchFromApi();
  }

  // Obtiene favoritos desde la API
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
        error: () => this.fetching.set(false)
      })
    );
  }

  // Guarda en caché local
  private saveCache(data: FavoritesResponse): void {
    if (this.preferencesService.cookies() !== true) return;
    localStorage.setItem(this.CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  }

  // Recupera desde caché
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

  // Limpia caché
  clearCache(): void {
    localStorage.removeItem(this.CACHE_KEY);
  }

  // Añade a favoritos
  add(result: SearchResult): Observable<Favorite> {
    if (this.isFavorite(result.symbol)) return new Observable();

    return this.http.post<Favorite>(`${this.apiUrl}/favorites`, result).pipe(
      tap({
        next: (newFav) => {
          this.favorites.update(favs => [...favs, newFav]);
          this.saveCache({ assets: this.favorites(), portfolios: this.favoritePortfolios() });
          this.notificationService.success(`Añadido ${newFav?.name} a favoritos`);
        },
        error: () => this.notificationService.error('No se pudo añadir a favoritos')
      })
    );
  }

  // Elimina de favoritos
  remove(symbolId: number, name?: string, symbol?: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/favorites/${symbolId}`).pipe(
      tap({
        next: () => {
          this.favorites.update(favs => favs.filter(f => f.symbol_id !== symbolId));
          this.saveCache({ assets: this.favorites(), portfolios: this.favoritePortfolios() });
          this.notificationService.info(`${name} (${symbol}) quitado de favoritos`);
        },
        error: () => this.notificationService.error('No se pudo quitar de favoritos')
      })
    );
  }

  // Verifica si symbol está en favoritos
  isFavorite(symbol: string): boolean {
    return this.favorites().some(f => f.symbol === symbol);
  }

  // Elimina un portfolio de favoritos
  removePortfolio(portfolioId: number, name?: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/favorites/portfolios/${portfolioId}`).pipe(
      tap({
        next: () => {
          this.favoritePortfolios.update(list => list.filter(p => p.portfolio_id !== portfolioId));
          this.syncFollowingIds(this.favoritePortfolios());
          this.saveCache({ assets: this.favorites(), portfolios: this.favoritePortfolios() });
          this.notificationService.info(`Portfolio "${name}" quitado de favoritos`);
        },
        error: () => this.notificationService.error('No se pudo quitar el portfolio de favoritos')
      })
    );
  }

  // Verifica si portfolio está en favoritos
  isPortfolioFavorite(portfolioId: number): boolean {
    return this.favoritePortfolios().some(p => p.portfolio_id === portfolioId);
  }

  // Invalida cache (fuerza recarga)
  invalidate(): void {
    this.loaded.set(false);
    this.clearCache();
  }

  // Sincroniza los IDs de portfolios seguidos
  syncFollowingIds(portfolios: FavoritePortfolio[] | undefined | null): void {
    const list = portfolios ?? [];
    this.followingPortfolioIds.set(new Set(list.map(p => p.portfolio_id)));
  }
}