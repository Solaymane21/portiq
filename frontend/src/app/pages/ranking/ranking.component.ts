import { Component, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PortfolioService } from '../../services/portfolio.service';
import { FavoritesService } from '../../services/favorites.service';
import { NotificationsService } from '../../services/notifications.service';
import { PublicPortfolioRanking } from '../../models/publicPortfolioRanking.model';
import { AuthService } from '../../services/auth.service';
import { PreferencesService } from '../../services/preferences.service';

@Component({
  selector: 'app-ranking',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ranking.component.html',
  styleUrl: './ranking.component.css'
})
export class RankingComponent implements OnInit {
  private portfolioService = inject(PortfolioService);
  private authService = inject(AuthService);
  private favoritesService = inject(FavoritesService);
  private notificationsService = inject(NotificationsService);
  private destroyRef = inject(DestroyRef);
  private preferencesService = inject(PreferencesService);

  rows = signal<PublicPortfolioRanking[]>([]);
  isLoading = signal(true);
  errorMsg = signal<string | null>(null);
  togglingIds = signal<Set<number>>(new Set()); // IDs en proceso de petición

  sort = signal<string>('total_value');
  order = signal<'asc' | 'desc'>('desc');
  searchInput = '';

  // Usa el signal del servicio — persiste entre navegaciones
  followingIds = this.favoritesService.followingPortfolioIds;

  sortOptions: { value: string; label: string }[] = [
    { value: 'total_value', label: 'Valor total' },
    { value: 'asset_count', label: 'Nº activos' },
    { value: 'name', label: 'Nombre cartera' },
    { value: 'owner_name', label: 'Inversor' },
    { value: 'updated_at', label: 'Última actualización' },
    { value: 'created_at', label: 'Fecha creación' }
  ];

  private search$ = new Subject<string>();

  ngOnInit(): void {
    // Asegura que followingIds esté poblado
    this.favoritesService.load().subscribe();

    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());

    this.load();
  }

  onSearchChange(value: string) {
    this.searchInput = value;
    this.search$.next(value);
  }

  onSortChange(value: string) {
    this.sort.set(value);
    this.load();
  }

  onOrderChange(value: 'asc' | 'desc') {
    this.order.set(value);
    this.load();
  }

  isOwnPortfolio(row: PublicPortfolioRanking): boolean {
    const me = this.authService.currentUser()?.id;
    return me !== undefined && me === row.user.id;
  }

  isFollowing(row: PublicPortfolioRanking): boolean {
    return this.followingIds().has(row.id);
  }

  isToggling(row: PublicPortfolioRanking): boolean {
    return this.togglingIds().has(row.id);
  }

  toggleFollow(event: Event, row: PublicPortfolioRanking): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.isOwnPortfolio(row) || this.isToggling(row)) return;

    const following = this.isFollowing(row);

    // Marcar como en proceso
    this.togglingIds.update(ids => new Set(ids).add(row.id));

    // Optimistic update
    this.followingIds.update(ids => {
      const next = new Set(ids);
      following ? next.delete(row.id) : next.add(row.id);
      return next;
    });

    const request$ = following
      ? this.portfolioService.unfollowPortfolio(row.id)
      : this.portfolioService.followPortfolio(row.id);

    request$.subscribe({
      next: () => {
        this.togglingIds.update(ids => {
          const next = new Set(ids);
          next.delete(row.id);
          return next;
        });

        if (following) {
          this.notificationsService.info(`Has dejado de seguir "${row.name}"`);
        } else {
          this.notificationsService.success(`Ahora sigues la cartera "${row.name}"`);
        }

        // Invalidar caché para que favoritos recargue la próxima visita
        this.favoritesService.invalidate();
      },
      error: () => {
        // Revertir optimistic update
        this.followingIds.update(ids => {
          const next = new Set(ids);
          following ? next.add(row.id) : next.delete(row.id);
          return next;
        });
        this.togglingIds.update(ids => {
          const next = new Set(ids);
          next.delete(row.id);
          return next;
        });
        this.notificationsService.error(`No se pudo ${following ? 'dejar de seguir' : 'seguir'} la cartera`);
      }
    });
  }

  private load() {
    this.isLoading.set(true);
    this.errorMsg.set(null);

    this.portfolioService
      .getPublicRanking(this.sort(), this.order(), this.searchInput.trim() || undefined)
      .subscribe({
        next: (data) => {
          this.rows.set(data as PublicPortfolioRanking[]);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.errorMsg.set('No se pudo cargar el ranking.');
          this.isLoading.set(false);
        }
      });
  }

  format(value: number) {
    return this.preferencesService.formatCurrency(value);
  }
}