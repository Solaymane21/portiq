import { Component, signal, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

interface SearchResult {
  symbol: string;
  name: string;
  type: 'crypto' | 'stock' | 'etf';
  image?: string;
}

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [NgApexchartsModule, FormsModule],
  templateUrl: './favorites.component.html',
  styleUrl: './favorites.component.css'
})
export class FavoritesComponent {
  isFavorite = signal<boolean>(true);
  searchQuery = '';
  searchResults = signal<SearchResult[]>([]);
  isSearching = signal<boolean>(false);
  showDropdown = signal<boolean>(false);

  private searchSubject = new Subject<string>();

  constructor() {
    // debounce para no disparar en cada tecla
    this.searchSubject.pipe(
      debounceTime(350),
      distinctUntilChanged()
    ).subscribe(query => this.fetchResults(query));
  }

  onSearch(query: string): void {
    if (query.length < 2) {
      this.searchResults.set([]);
      this.showDropdown.set(false);
      return;
    }
    this.isSearching.set(true);
    this.searchSubject.next(query);
  }

  private fetchResults(query: string): void {
    // MOCK estático — sustituir por llamada real a tu MarketService
    const mock: SearchResult[] = [
      { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
      { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', image: 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png' },
      { symbol: 'ETH', name: 'Ethereum', type: 'crypto', image: 'https://coin-images.coingecko.com/coins/images/279/large/ethereum.png' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'stock' },
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF', type: 'etf' },
    ];

    const filtered = mock.filter(r =>
      r.name.toLowerCase().includes(query.toLowerCase()) ||
      r.symbol.toLowerCase().includes(query.toLowerCase())
    );

    this.searchResults.set(filtered);
    this.isSearching.set(false);
    this.showDropdown.set(true);
  }

  addToFavorites(result: SearchResult): void {
    // aquí llamarás a tu FavoritesService más adelante
    console.log('Añadir a favoritos:', result);
    this.searchQuery = '';
    this.searchResults.set([]);
    this.showDropdown.set(false);
  }

  // cerrar dropdown al hacer click fuera
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.showDropdown.set(false);
    }
  }

  updateFavorite() {
    this.isFavorite.update(prev => !prev);
  }

  sparkline = {
    series: [{
      name: 'BTC',
      data: [
        { x: new Date('2025-01-01').getTime(), y: 42000 },
        { x: new Date('2025-02-01').getTime(), y: 43500 },
        { x: new Date('2025-03-01').getTime(), y: 41000 },
        { x: new Date('2025-04-01').getTime(), y: 45000 },
        { x: new Date('2025-05-01').getTime(), y: 44200 },
        { x: new Date('2025-06-01').getTime(), y: 46800 },
        { x: new Date('2025-07-01').getTime(), y: 47500 },
        { x: new Date('2025-08-01').getTime(), y: 46000 },
        { x: new Date('2025-09-01').getTime(), y: 48000 },
        { x: new Date('2025-10-01').getTime(), y: 66809 },
      ]
    }],
    chart: {
      type: 'area' as const,
      height: 60,
      sparkline: { enabled: true },
      toolbar: { show: false },
      background: 'transparent',
      animations: { enabled: true }
    },
    stroke: { curve: 'smooth' as const, width: 3 },
    colors: ['#f97316'],
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: 'vertical',
        gradientToColors: ['#ea580c'],
        opacityFrom: 0.35,
        opacityTo: 0.02
      }
    },
    tooltip: {
      theme: 'dark',
      enabled: true,
      x: {
        show: true,
        format: 'dd MMM yyyy'
      },
      y: {
        formatter: (val: number) => `${val.toLocaleString('es-ES')}€`
      }
    },
    markers: {
      size: 0,
      hover: { size: 4 }
    },
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