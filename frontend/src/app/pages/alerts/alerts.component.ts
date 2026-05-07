import { Component, signal, inject, OnInit, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe  } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { AlertsService, Alert, SymbolResult } from '../../services/alerts.service';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [FormsModule, DatePipe, CdkMenuTrigger, CdkMenu, CdkMenuItem, DecimalPipe],
  templateUrl: './alerts.component.html',
})

export class AlertsComponent implements OnInit {
  private alertsService = inject(AlertsService);

  alerts = signal<Alert[]>([]);
  isLoading = signal(false);
  isCreating = signal(false);

  showModal = signal(false);
  searchQuery = '';
  searchResults = signal<SymbolResult[]>([]);
  selectedSymbol = signal<SymbolResult | null>(null);
  condition = signal<'above' | 'below'>('above');
  targetPrice: number | null = null;

  private searchSubject = new Subject<string>();

  ngOnInit(): void {
    this.loadAlerts();

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => this.alertsService.searchSymbols(query))
    ).subscribe(results => this.searchResults.set(results));
  }

  loadAlerts(): void {
    this.isLoading.set(true);
    this.alertsService.getAlerts().subscribe({
      next: (data) => { this.alerts.set(data); this.isLoading.set(false); },
      error: () => this.isLoading.set(false),
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
  }

  createAlert(): void {
    const sym = this.selectedSymbol();
    if (!sym || !this.targetPrice) return;

    this.isCreating.set(true);
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
        this.closeModal();
        this.isCreating.set(false);
      },
      error: () => this.isCreating.set(false),
    });
  }

  toggleAlert(alert: Alert): void {
    this.alertsService.updateAlert(alert.id, { is_active: !alert.is_active }).subscribe(updated => {
      this.alerts.update(prev => prev.map(a => a.id === updated.id ? updated : a));
    });
  }

  deleteAlert(id: number): void {
    this.alertsService.deleteAlert(id).subscribe(() => {
      this.alerts.update(prev => prev.filter(a => a.id !== id));
    });
  }

  closeModal(): void {
    this.showModal.set(false);
    this.searchQuery = '';
    this.searchResults.set([]);
    this.selectedSymbol.set(null);
    this.targetPrice = null;
    this.condition.set('above');
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) this.searchResults.set([]);
  }
}