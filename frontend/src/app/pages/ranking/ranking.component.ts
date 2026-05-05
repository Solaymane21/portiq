import { Component, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PortfolioService } from '../../services/portfolio.service';
import { PublicPortfolioRanking } from '../../models/publicPortfolioRanking.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-ranking',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ranking.component.html',
  styleUrl: './ranking.component.css'
})
export class RankingComponent implements OnInit {
  private portfolioService = inject(PortfolioService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  rows = signal<PublicPortfolioRanking[]>([]);
  isLoading = signal(true);
  errorMsg = signal<string | null>(null);

  sort = signal<string>('total_value');
  order = signal<'asc' | 'desc'>('desc');
  searchInput = '';

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
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
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

  private load() {
    this.isLoading.set(true);
    this.errorMsg.set(null);
    this.portfolioService
      .getPublicRanking(
        this.sort(),
        this.order(),
        this.searchInput.trim() || undefined
      )
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
}
