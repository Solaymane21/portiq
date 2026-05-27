import { Component, signal, HostListener, inject, OnInit, effect, DestroyRef, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';
import { Subject, forkJoin, interval } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MarketService } from '../../services/market.service';
import { FavoritesService, Favorite } from '../../services/favorites.service';
import { SearchResult } from '../../models/search.model';
import { NgClass } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotificationsService } from '../../services/notifications.service';
import { PreferencesService } from '../../services/preferences.service';
import { RouterLink } from '@angular/router';
import { SubscriptionService } from '../../services/subscription.service';
import { PlanLimitBannerComponent } from '../../components/plan-limit-banner/plan-limit-banner.component';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [NgApexchartsModule, FormsModule, NgClass, MatProgressSpinnerModule, RouterLink, PlanLimitBannerComponent],
  templateUrl: './favorites.component.html',
  styleUrl: './favorites.component.css'
})
export class FavoritesComponent implements OnInit {

  marketService = inject(MarketService);
  favoritesService = inject(FavoritesService);
  preferencesService = inject(PreferencesService);
  searchSubject = new Subject<string>();
  destroyRef = inject(DestroyRef);
  notificationService = inject(NotificationsService)
  subscriptionService = inject(SubscriptionService);

  // Datos de favoritos
  favorites = this.favoritesService.favorites;
  favoritePortfolios = this.favoritesService.favoritePortfolios;
  deletingPortfolioIds = signal<Set<number>>(new Set()); 

  // Gráficas y precios
  sparklines = new Map<number, any>();        // Mini gráficas para cada favorito
  prices = signal<Record<string, number>>({}); // Precios actuales
  loadingPrices = signal<boolean>(false);      // Cargando precios

  // Búsqueda para añadir favoritos
  searchQuery = '';
  searchResults = signal<SearchResult[]>([]);
  isSearching = signal<boolean>(false);
  isFetching = this.favoritesService.fetching;
  showDropdown = signal<boolean>(false);
  changes = signal<Record<string, number>>({});  // Cambio porcentual de cada símbolo
  deletingIds = signal<Set<number>>(new Set());  // Activos en proceso de borrado

  // Filtro por tipo de activo
  filter = signal<'all' | 'stock' | 'crypto' | 'etf'>('all')
  assetLabels: Record<string, string> = {
    all: 'Todos',
    stock: 'Acciones',
    crypto: 'Criptomonedas',
    etf: 'ETF'
  };

  // Color del tema
  private get primaryColor(): string {
    return this.preferencesService.colorHex();
  }

  constructor() {
    // Cuando cambia el color del tema, reconstruye todas las sparklines
    effect(() => {
      this.preferencesService.colorTheme();
      this.rebuildAllSparklines();
    });
  }

  ngOnInit(): void {
    // Carga favoritos al iniciar
    this.favoritesService.load().subscribe(favs => {
      this.loadPrices(favs.assets);
      this.loadSparklines(favs.assets);
    });

    // Actualiza precios cada 30 segundos
    interval(30000).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      const favs = this.favorites();
      if (favs.length > 0) {
        this.loadPrices(favs);
      }
    });

    // Búsqueda con debounce (espera 250ms después de cada tecla)
    this.searchSubject.pipe(
      debounceTime(250),
      distinctUntilChanged()
    ).subscribe(query => this.fetchResults(query));
  }

  // Filtra los favoritos según el tipo seleccionado
  filteredFavorites = computed(() => {
    const f = this.filter();
    const favs = this.favorites();
    if (f === 'all') return favs;
    return favs.filter(fav => fav.asset_type === f);
  });

  // Carga las sparklines (mini gráficas) de los favoritos
  loadSparklines(favs: Favorite[]): void {
    const missing = favs.filter(f => !this.sparklines.has(f.symbol_id));
    if (missing.length === 0) return;

    const requests = missing.reduce((acc, fav) => {
      acc[fav.symbol_id] = this.marketService.getHistory(fav.symbol, '1M', fav.asset_type);
      return acc;
    }, {} as Record<number, any>);

    forkJoin(requests).subscribe({
      next: (results: Record<string, any>) => {
        Object.entries(results).forEach(([symbolId, history]) => {
          const fav = missing.find(f => f.symbol_id === Number(symbolId))!;
          this.sparklines.set(Number(symbolId), this.buildSparkline(fav, history));
        });
      }
    });
  }

  // Carga los precios actuales de los favoritos
  loadPrices(favs: Favorite[], silent = false): void {
    if (!silent) this.loadingPrices.set(true);

    const symbols = favs.map(f => f.symbol).join(',');
    const assetTypes = favs.map(f => f.asset_type).join(',');

    this.marketService.getPrices(symbols, assetTypes).subscribe({
      next: (data) => {
        const priceMap: Record<string, number> = {};
        const changeMap: Record<string, number> = {};

        (data.results ?? []).forEach((item: any) => {
          if (item.price != null) {
            priceMap[item.symbol] = item.price;
            changeMap[item.symbol] = item.change ?? 0;
          }
        });

        this.prices.update(prev => ({ ...prev, ...priceMap }));
        this.changes.update(prev => ({ ...prev, ...changeMap }));
        this.loadingPrices.set(false);
      },
      error: () => this.loadingPrices.set(false)
    });
  }

  // Devuelve el precio de un símbolo
  getPrice(symbol: string): number {
    return this.prices()[symbol] ?? 0;
  }

  // Devuelve el cambio porcentual de un símbolo
  getChange(symbol: string): number {
    return this.changes()[symbol] ?? 0;
  }

  // Devuelve la sparkline de un símbolo
  getSparkline(symbolId: number) {
    return this.sparklines.get(symbolId);
  }

  // Construye una sparkline (mini gráfica de 60px de alto)
  buildSparkline(fav: Favorite, history: any) {
    const data = history?.data ?? [];

    return {
      series: [{ name: fav.symbol, data }],
      chart: {
        type: 'area' as const,
        height: 60,
        sparkline: { enabled: true },  // Modo sparkline: sin ejes ni grid
        toolbar: { show: false },
        background: 'transparent'
      },
      stroke: { curve: 'smooth' as const, width: 3 },
      colors: [this.primaryColor],
      fill: {
        type: 'gradient',
        gradient: { shade: 'dark', type: 'vertical', opacityFrom: 0.35, opacityTo: 0.02 }
      },
      tooltip: {
        theme: 'dark',
        enabled: true,
        x: { show: true, format: 'dd/MM/yyyy' },
        y: { formatter: (v: number) => `${v.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€` }
      },
      markers: { size: 0, hover: { size: 4 } },
      grid: { show: false },
      xaxis: {
        type: 'datetime' as const,
        labels: { show: false },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: { labels: { show: false } }
    };
  }

  // Cuando cambia el color del tema, actualiza todas las sparklines
  private rebuildAllSparklines(): void {
    this.sparklines.forEach((sparkline, symbolId) => {
      this.sparklines.set(symbolId, {
        ...sparkline,
        colors: [this.primaryColor]
      });
    });
  }

  // Busca activos para añadir a favoritos
  onSearch(query: string): void {
    if (query.length < 2) {
      this.searchResults.set([]);
      this.showDropdown.set(false);
      return;
    }
    this.isSearching.set(true);
    this.searchSubject.next(query);
  }

  // Ejecuta la búsqueda en el backend
  fetchResults(query: string): void {
    this.marketService.search(query).subscribe({
      next: (results) => {
        const favSymbols = this.favorites().map(f => f.symbol);
        this.searchResults.set(results.filter(r => !favSymbols.includes(r.symbol)));
        this.isSearching.set(false);
        this.showDropdown.set(true);
      },
      error: () => {
        this.searchResults.set([]);
        this.isSearching.set(false);
      }
    });
  }

  // Añade un activo a favoritos
  addToFavorites(result: SearchResult): void {
    if (!this.subscriptionService.canCreate('favorites')) {
      this.notificationService.warning('Has alcanzado el límite de favoritos. Mejora al Plan Premium.');
      return;
    }

    this.favoritesService.add(result).subscribe({
      next: (newFav) => {
        this.loadPrices([newFav], false);
        this.loadSparklines([newFav]);
        this.subscriptionService.loadPlanLimits();
      }
    });

    this.searchQuery = '';
    this.searchResults.set([]);
    this.showDropdown.set(false);
  }

  // Indica si un activo está siendo eliminado
  isDeleting(symbolId: number): boolean {
    return this.deletingIds().has(symbolId);
  }

  // Elimina un activo de favoritos
  removeFromFavorites(symbolId: number): void {
    const fav = this.favorites().find(f => f.symbol_id === symbolId);

    this.deletingIds.update(ids => new Set(ids).add(symbolId));

    this.favoritesService.remove(symbolId, fav?.name, fav?.symbol).subscribe({
      next: () => {
        this.sparklines.delete(symbolId);
        this.deletingIds.update(ids => {
          const next = new Set(ids);
          next.delete(symbolId);
          return next;
        });
        this.subscriptionService.loadPlanLimits();
      },
      error: () => {
        this.deletingIds.update(ids => {
          const next = new Set(ids);
          next.delete(symbolId);
          return next;
        });
      }
    });
  }

  // Si hace clic fuera del buscador, cierra el dropdown
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) this.showDropdown.set(false);
  }

  // Limpia la búsqueda
  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults.set([]);
    this.showDropdown.set(false);
    this.isSearching.set(false);
  }

  // Formatea un número como moneda
  format(value: number) {
    return this.preferencesService.formatCurrency(value);
  }

  // Indica si un portfolio está siendo eliminado
  isDeletingPortfolio(portfolioId: number): boolean {
    return this.deletingPortfolioIds().has(portfolioId);
  }

  // Elimina un portfolio de favoritos
  removeFromFavoritePortfolios(portfolioId: number): void {
    const portfolio = this.favoritePortfolios().find(p => p.portfolio_id === portfolioId);

    this.deletingPortfolioIds.update(ids => new Set(ids).add(portfolioId));

    this.favoritesService.removePortfolio(portfolioId, portfolio?.name).subscribe({
      next: () => {
        this.deletingPortfolioIds.update(ids => {
          const next = new Set(ids);
          next.delete(portfolioId);
          return next;
        });
      },
      error: () => {
        this.deletingPortfolioIds.update(ids => {
          const next = new Set(ids);
          next.delete(portfolioId);
          return next;
        });
      }
    });
  }

}