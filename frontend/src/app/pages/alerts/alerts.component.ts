import { Component, signal, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';

interface Alert {
  id: number;
  symbol: string;
  name: string;
  target_price: number;
  condition: 'above' | 'below';
  is_active: boolean;
  created_at: Date;
}

interface SymbolResult {
  symbol: string;
  name: string;
}

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [FormsModule, DatePipe, CdkMenuTrigger, CdkMenu, CdkMenuItem, NgClass],
  templateUrl: './alerts.component.html',
  styleUrl: './alerts.component.css'
})
export class AlertsComponent {
  showModal = signal(false);
  searchQuery = '';
  searchResults = signal<SymbolResult[]>([]);
  selectedSymbol = signal<SymbolResult | null>(null);
  condition = signal<'above' | 'below'>('above');
  targetPrice: number | null = null;

  alerts = signal<Alert[]>([
    { id: 1, symbol: 'BTC', name: 'Bitcoin', target_price: 70000, condition: 'above', is_active: true, created_at: new Date('2025-04-01') },
    { id: 2, symbol: 'AAPL', name: 'Apple Inc.', target_price: 180, condition: 'below', is_active: false, created_at: new Date('2025-03-15') },
  ]);

  private searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject.pipe(
      debounceTime(250),
      distinctUntilChanged()
    ).subscribe(query => this.fetchResults(query));
  }

  onSearch(query: string): void {
    if (query.length < 2) { this.searchResults.set([]); return; }
    this.searchSubject.next(query);
  }

  private fetchResults(query: string): void {
    // sustituir por llamada real a MarketService
    const mock: SymbolResult[] = [
      { symbol: 'BTC', name: 'Bitcoin' },
      { symbol: 'ETH', name: 'Ethereum' },
      { symbol: 'AAPL', name: 'Apple Inc.' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation' },
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF' },
    ];

    this.searchResults.set(
      mock.filter(r =>
        r.name.toLowerCase().includes(query.toLowerCase()) ||
        r.symbol.toLowerCase().includes(query.toLowerCase())
      )
    );
  }

  selectSymbol(result: SymbolResult): void {
    this.selectedSymbol.set(result);
    this.searchQuery = result.name;
    this.searchResults.set([]);
  }

  toggleAlert(alert: Alert): void {
    this.alerts.update(alerts =>
      alerts.map(a => a.id === alert.id ? { ...a, is_active: !a.is_active } : a)
    );
  }

  deleteAlert(id: number): void {
    this.alerts.update(alerts => alerts.filter(a => a.id !== id));
  }

  createAlert(): void {
    if (!this.selectedSymbol() || !this.targetPrice) return;

    const newAlert: Alert = {
      id: Date.now(),
      symbol: this.selectedSymbol()!.symbol,
      name: this.selectedSymbol()!.name,
      target_price: this.targetPrice!,
      condition: this.condition(),
      is_active: true,
      created_at: new Date()
    };

    this.alerts.update(alerts => [...alerts, newAlert]);
    this.closeModal();
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