import { Component, computed, HostListener, inject, OnInit, signal, DestroyRef} from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { RouterLink, Router } from '@angular/router';
import { NgClass, DatePipe} from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { A11yModule } from '@angular/cdk/a11y';
import { Subject, of, interval} from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError} from 'rxjs/operators';
import { PreferencesService } from '../../services/preferences.service';
import { MarketService } from '../../services/market.service';
import { NotificationService, AppNotification } from '../../services/notification.service';

export interface AssetSearchResult {
  symbol: string;
  name: string;
  asset_type: 'stock' | 'crypto' | 'etf';
  image_url?: string;
  api_id?: string;
}

@Component({
  selector: 'app-topbar',
  imports: [RouterLink, NgClass, FormsModule, A11yModule, DatePipe],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css'
})
export class TopbarComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  preferencesService = inject(PreferencesService);
  private notificationService  = inject(NotificationService);
  private market = inject(MarketService);
  private destroyRef = inject(DestroyRef);

  user = this.authService.currentUser;
  isPremium = signal<boolean>(false);

  avatar = computed(() =>
    this.user()?.avatar ?? 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=q'
  );

  notifications     = signal<AppNotification[]>([]);
  showNotifications = signal(false);
  selectedNotif     = signal<AppNotification | null>(null);

  unreadCount = computed(() => this.notifications().filter(n => !n.is_read).length);

  ngOnInit(): void {
    this.authService.isPremium().subscribe(value => {
      this.isPremium.set(value);
    });

    this.loadNotifications();

    interval(10_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadNotifications());

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
        return this.market.search(query).pipe(
          catchError(() => of([]))
        );
      })
    ).subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : (res?.data ?? []);
        const data = raw.slice(0, 8);
        this.searchResults.set(data);
        this.selectedIndex = 0;
        this.isSearching.set(false);
      },
      error: () => {
        this.searchResults.set([]);
        this.isSearching.set(false);
      }
    });
  }

  // ── Notifications logic ───────────────────────

  loadNotifications(): void {
    this.notificationService.getAll().subscribe(data => this.notifications.set(data));
  }

  toggleNotifications(): void {
    this.showNotifications.update(v => !v);
    this.selectedNotif.set(null);
  }

  openNotif(notif: AppNotification): void {
    this.selectedNotif.set(notif);
    if (!notif.is_read) {
      this.notificationService.markRead(notif.id).subscribe(() => {
        this.notifications.update(prev =>
          prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
        );
      });
    }
  }

  closeNotifModal(): void {
    this.selectedNotif.set(null);
  }

  markAllRead(): void {
    this.notificationService.markAllRead().subscribe(() => {
      this.notifications.update(prev => prev.map(n => ({ ...n, is_read: true })));
    });
  }

  updateMode() {
    const next = this.preferencesService.theme() === 'dark' ? 'light' : 'dark';
    this.preferencesService.applyTheme(next);
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
    this.router.navigate(['/public/symbol', item.symbol]);
  }
}