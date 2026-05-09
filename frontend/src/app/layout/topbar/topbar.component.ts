import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { RouterLink, Router } from '@angular/router';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

export interface AssetSearchResult {
  symbol: string;
  name: string;
  asset_type: 'stock' | 'crypto' | 'etf';
  image_url?: string;
  api_id?: string;
}

@Component({
  selector: 'app-topbar',
  imports: [RouterLink, NgClass, FormsModule, A11yModule],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css'
})
export class TopbarComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  user = this.authService.currentUser;
  isPremium = signal<boolean>(false);

  avatar = computed(() =>
    this.user()?.avatar ?? 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=q'
  );

  ngOnInit(): void {
    this.authService.isPremium().subscribe(value => {
      this.isPremium.set(value);
    });

    this.searchSubject.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((query) => {
        if (query.trim().length < 2) {
          this.searchResults.set([]);
          this.isSearching.set(false);
          return of([]);
        }
        this.isSearching.set(true);
        // TODO: reemplaza esto por tu servicio real
        // return this.marketService.searchAssets(query);
        return of([]);
      })
    ).subscribe({
      next: (results: AssetSearchResult[]) => {
        this.searchResults.set(results);
        this.selectedIndex = 0;
        this.isSearching.set(false);
      },
      error: () => {
        this.searchResults.set([]);
        this.isSearching.set(false);
      }
    });
  }

  // ── Search state ──────────────────────────────
  selectedIndex = 0;
  assetQuery = '';

  isAssetSearchOpen = signal(false);
  isSearching = signal(false);
  searchResults = signal<AssetSearchResult[]>([]);

  private searchSubject = new Subject<string>();

  // ── Open / close ─────────────────────────────
  openAssetSearch() {
    this.isAssetSearchOpen.set(true);
    this.assetQuery = '';
    this.searchResults.set([]);
    this.isSearching.set(false);
    this.selectedIndex = 0;
  }

  closeAssetSearch() {
    this.isAssetSearchOpen.set(false);
  }

  // ── Keyboard global ───────────────────────────
  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) {
    const isK = event.key.toLowerCase() === 'k';

    if ((event.ctrlKey || event.metaKey) && isK) {
      event.preventDefault();
      this.openAssetSearch();
    }

    if (event.key === 'Escape' && this.isAssetSearchOpen()) {
      this.closeAssetSearch();
    }
  }

  // ── Search input ──────────────────────────────
  onAssetSearch() {
    this.searchSubject.next(this.assetQuery);
  }

  moveSelection(step: number) {
    const total = this.searchResults().length;
    if (!total) return;
    this.selectedIndex = (this.selectedIndex + step + total) % total;
  }

  // ── Select / navigate ─────────────────────────
  openSelectedAsset() {
    const item = this.searchResults()[this.selectedIndex];
    if (item) this.selectAsset(item);
  }

  selectAsset(item: AssetSearchResult) {
    this.closeAssetSearch();
    this.router.navigate(['/app/asset', item.symbol]);
    // Ajusta la ruta a como la tengas montada en PortIQ
  }
}