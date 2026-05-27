import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { PublicPortfolioRanking } from '../../models/publicPortfolioRanking.model';
import { AuthService } from '../../services/auth.service';
import { FavoritesService } from '../../services/favorites.service';
import { NotificationsService } from '../../services/notifications.service';
import { PortfolioService } from '../../services/portfolio.service';
import { PreferencesService } from '../../services/preferences.service';

@Component({
  selector: 'app-ranking',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ranking.component.html',
  styleUrl: './ranking.component.css',
})
export class RankingComponent implements OnInit {
  private readonly portfolioService = inject(PortfolioService);
  private readonly authService = inject(AuthService);
  private readonly favoritesService = inject(FavoritesService);
  private readonly notificationsService = inject(NotificationsService);
  private readonly preferencesService = inject(PreferencesService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly search$ = new Subject<string>();

  rows = signal<PublicPortfolioRanking[]>([]);
  isLoading = signal(true);
  errorMsg = signal<string | null>(null);

  // Guardamos los ids que estan cambiando para bloquear el boton
  togglingIds = signal<Set<number>>(new Set());

  sort = signal<string>('total_value');
  order = signal<'asc' | 'desc'>('desc');
  searchInput = '';

  // Este signal viene del servicio y se mantiene entre vistas
  followingIds = this.favoritesService.followingPortfolioIds;

  sortOptions: { value: string; label: string }[] = [
    { value: 'total_value', label: 'Valor total' },
    { value: 'asset_count', label: 'Nº activos' },
    { value: 'name', label: 'Nombre cartera' },
    { value: 'owner_name', label: 'Inversor' },
    { value: 'updated_at', label: 'Última actualización' },
    { value: 'created_at', label: 'Fecha creación' },
  ];

  ngOnInit(): void {
    // Cargamos favoritos al entrar para saber cuales sigue el usuario
    this.favoritesService.load().subscribe();

    // Esperamos un poco antes de buscar para no disparar peticiones de mas
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.load());

    this.load();
  }

  onSearchChange(value: string): void {
    this.searchInput = value;
    this.search$.next(value);
  }

  onSortChange(value: string): void {
    this.sort.set(value);
    this.load();
  }

  onOrderChange(value: 'asc' | 'desc'): void {
    this.order.set(value);
    this.load();
  }

  isOwnPortfolio(row: PublicPortfolioRanking): boolean {
    const currentUserId = this.authService.currentUser()?.id;
    return currentUserId !== undefined && currentUserId === row.user.id;
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

    if (this.isOwnPortfolio(row) || this.isToggling(row)) {
      return;
    }

    const wasFollowing = this.isFollowing(row);

    // Marcamos la cartera como bloqueada mientras llega la respuesta
    this.addTogglingId(row.id);

    // Actualizamos la UI al momento para que se note rapido
    this.updateFollowingState(row.id, !wasFollowing);

    const request$ = wasFollowing
      ? this.portfolioService.unfollowPortfolio(row.id)
      : this.portfolioService.followPortfolio(row.id);

    request$.subscribe({
      next: () => {
        this.removeTogglingId(row.id);

        if (wasFollowing) {
          this.notificationsService.info(`Has dejado de seguir "${row.name}"`);
        } else {
          this.notificationsService.success(`Ahora sigues la cartera "${row.name}"`);
        }

        // Limpiamos cache para recargar favoritos en la siguiente visita
        this.favoritesService.invalidate();
      },
      error: () => {
        // Si falla, dejamos el estado como estaba antes
        this.updateFollowingState(row.id, wasFollowing);
        this.removeTogglingId(row.id);
        this.notificationsService.error(`No se pudo ${wasFollowing ? 'dejar de seguir' : 'seguir'} la cartera`);
      },
    });
  }

  format(value: number): string {
    return this.preferencesService.formatCurrency(value);
  }

  private load(): void {
    this.isLoading.set(true);
    this.errorMsg.set(null);

    const search = this.searchInput.trim() || undefined;

    this.portfolioService.getPublicRanking(this.sort(), this.order(), search).subscribe({
      next: (data) => {
        this.rows.set(data as PublicPortfolioRanking[]);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.errorMsg.set('No se pudo cargar el ranking.');
        this.isLoading.set(false);
      },
    });
  }

  private addTogglingId(id: number): void {
    this.togglingIds.update((ids) => {
      const nextIds = new Set(ids);
      nextIds.add(id);
      return nextIds;
    });
  }

  private removeTogglingId(id: number): void {
    this.togglingIds.update((ids) => {
      const nextIds = new Set(ids);
      nextIds.delete(id);
      return nextIds;
    });
  }

  private updateFollowingState(id: number, shouldFollow: boolean): void {
    this.followingIds.update((ids) => {
      const nextIds = new Set(ids);

      if (shouldFollow) {
        nextIds.add(id);
      } else {
        nextIds.delete(id);
      }

      return nextIds;
    });
  }
}