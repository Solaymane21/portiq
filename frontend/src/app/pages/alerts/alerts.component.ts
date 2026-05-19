import { Component, signal, inject, OnInit, HostListener, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { Subject, interval } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { AlertsService, Alert, SymbolResult } from '../../services/alerts.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [FormsModule, DatePipe, DecimalPipe, CdkMenuTrigger, CdkMenu, CdkMenuItem, NgClass],
  templateUrl: './alerts.component.html',
})
export class AlertsComponent implements OnInit {
  private alertsService = inject(AlertsService);
  private destroyRef    = inject(DestroyRef);

  alerts        = signal<Alert[]>([]);
  currentPrices = signal<Record<string, number>>({});
  isLoading     = signal(false);
  isCreating    = signal(false);

  showModal           = signal(false);
  editingAlert        = signal<Alert | null>(null);
  searchQuery         = '';
  searchResults       = signal<SymbolResult[]>([]);
  selectedSymbol      = signal<SymbolResult | null>(null);
  selectedSymbolPrice = signal<number | null>(null);
  condition           = signal<'above' | 'below'>('above');
  targetPrice: number | null = null;
  priceError          = signal<string | null>(null);

  private searchSubject  = new Subject<string>();
  private cachedAlerts: Alert[] | null = null;

  ngOnInit(): void {
    this.loadAlerts();

    interval(120_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const current = this.alerts();
        if (current.length) this.loadCurrentPrices(current);
      });

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => this.alertsService.searchSymbols(query))
    ).subscribe(results => this.searchResults.set(results));
  }

  loadAlerts(): void {
    if (this.cachedAlerts) {
      this.alerts.set(this.cachedAlerts);
      this.alertsService.getAlerts().subscribe({
        next: (data) => {
          this.cachedAlerts = data;
          this.alerts.set(data);
          this.loadCurrentPrices(data);
        },
      });
      return;
    }

    this.isLoading.set(true);
    this.alertsService.getAlerts().subscribe({
      next: (data) => {
        this.cachedAlerts = data;
        this.alerts.set(data);
        this.isLoading.set(false);
        this.loadCurrentPrices(data);
      },
      error: () => this.isLoading.set(false),
    });
  }

  private loadCurrentPrices(alerts: Alert[]): void {
    if (!alerts.length) return;

    const uniquePairs = [...new Map(
      alerts.map(a => [`${a.symbol}:${a.asset_type}`, a])
    ).values()];

    const symbols    = uniquePairs.map(a => a.symbol).join(',');
    const assetTypes = uniquePairs.map(a => a.asset_type).join(',');

    this.alertsService.getCurrentPrices(symbols, assetTypes).subscribe(results => {
      const map: Record<string, number> = { ...this.currentPrices() };
      results.forEach((r: any) => { if (r.price) map[r.symbol] = r.price; });
      this.currentPrices.set(map);
    });
  }

  onSearch(query: string): void {
    if (query.length < 2) { this.searchResults.set([]); return; }
    this.searchSubject.next(query);
  }

  selectSymbol(result: SymbolResult): void {
    this.selectedSymbol.set(result);
    this.searchQuery = result.name;
    this.searchResults.set([]);
    this.priceError.set(null);
    this.targetPrice = null;

    this.alertsService.getCurrentPrices(result.symbol, result.asset_type).subscribe(results => {
      const found = results.find((r: any) => r.symbol === result.symbol);
      this.selectedSymbolPrice.set(found?.price ?? null);
    });
  }

  validatePrice(): boolean {
    const current = this.selectedSymbolPrice();
    const target  = this.targetPrice;
    if (!current || !target) return true;

    if (this.condition() === 'above' && target <= current) {
      this.priceError.set(`El precio debe ser mayor al actual (${current.toLocaleString()}€)`);
      return false;
    }
    if (this.condition() === 'below' && target >= current) {
      this.priceError.set(`El precio debe ser menor al actual (${current.toLocaleString()}€)`);
      return false;
    }
    this.priceError.set(null);
    return true;
  }

  openCreateModal(): void {
    this.editingAlert.set(null);
    this.showModal.set(true);
  }

  openEditModal(alert: Alert): void {
    this.editingAlert.set(alert);
    this.searchQuery = alert.name;
    this.selectedSymbol.set({
      symbol:     alert.symbol,
      name:       alert.name,
      asset_type: alert.asset_type,
      api_id:     (alert as any).api_id ?? '',
      image_url:  (alert as any).image_url ?? '',
    });
    this.condition.set(alert.condition);
    this.targetPrice = alert.target_price;
    this.priceError.set(null);

    this.alertsService.getCurrentPrices(alert.symbol, alert.asset_type).subscribe(results => {
      const found = results.find((r: any) => r.symbol === alert.symbol);
      this.selectedSymbolPrice.set(found?.price ?? null);
    });

    this.showModal.set(true);
  }

  saveAlert(): void {
    const sym = this.selectedSymbol();
    if (!sym || !this.targetPrice) return;
    if (!this.validatePrice()) return;

    const editing = this.editingAlert();
    this.isCreating.set(true);

    if (editing) {
      this.alertsService.updateAlert(editing.id, {
        target_price: this.targetPrice,
        condition:    this.condition(),
      }).subscribe({
        next: (updated) => {
          this.alerts.update(prev => prev.map(a => a.id === updated.id ? updated : a));
          this.cachedAlerts = this.alerts();
          this.closeModal();
          this.isCreating.set(false);
        },
        error: () => this.isCreating.set(false),
      });
    } else {
      this.alertsService.createAlert({
        symbol:       sym.symbol,
        name:         sym.name,
        asset_type:   sym.asset_type,
        api_id:       sym.api_id,
        image_url:    sym.image_url,
        target_price: this.targetPrice,
        condition:    this.condition(),
      }).subscribe({
        next: (alert) => {
          this.alerts.update(prev => [alert, ...prev]);
          this.cachedAlerts = this.alerts();
          this.loadCurrentPrices([alert]);
          this.closeModal();
          this.isCreating.set(false);
        },
        error: () => this.isCreating.set(false),
      });
    }
  }

  toggleAlert(alert: Alert): void {
    const previous = alert.is_active;
    const newValue = !previous;

    this.alerts.update(prev =>
      prev.map(a => a.id === alert.id ? { ...a, is_active: newValue } : a)
    );

    this.alertsService.updateAlert(alert.id, { is_active: newValue }).subscribe({
      next: (updated) => {
        this.alerts.update(prev => prev.map(a => a.id === updated.id ? updated : a));
        this.cachedAlerts = this.alerts();
      },
      error: () => {
        this.alerts.update(prev =>
          prev.map(a => a.id === alert.id ? { ...a, is_active: previous } : a)
        );
      },
    });
  }

  deleteAlert(id: number): void {
    this.alerts.update(prev => prev.filter(a => a.id !== id));
    this.cachedAlerts = this.alerts();

    this.alertsService.deleteAlert(id).subscribe({
      error: () => this.loadAlerts(),
    });
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingAlert.set(null);
    this.searchQuery = '';
    this.searchResults.set([]);
    this.selectedSymbol.set(null);
    this.selectedSymbolPrice.set(null);
    this.targetPrice = null;
    this.condition.set('above');
    this.priceError.set(null);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) this.searchResults.set([]);
  }

  preventNegativeNums(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);

    if (input.value === '') return;

    if (value < 0) {
      input.value = '0';
      this.targetPrice = 0;
    }
  }
}