import { Component, inject, signal, HostListener, ElementRef} from '@angular/core';
import {CdkMenu, CdkMenuItem, CdkMenuTrigger} from '@angular/cdk/menu';
import {Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MarketService } from '../../services/market.service';

interface SearchResult {
  symbol: string;
  exchange:string;
  instrument_name: string;
  instrument_type: string;
  country: string;
  currency: string;
}

@Component({
  selector: 'app-topbar-public',
  imports: [CdkMenu, CdkMenuItem, CdkMenuTrigger],
  templateUrl: './topbar-public.component.html',
  styleUrl: './topbar-public.component.css'
})


export class TopbarPublicComponent {
  private router = inject(Router)
  private market = inject(MarketService)
  private elRef = inject(ElementRef)

  //Estado del buscador
  query = signal('');
  results = signal<SearchResult[]>([]);
  isOpen = signal(false);
  isLoading = signal(false);
  activeIndex = signal(-1);

  private search$ = new Subject<string>();

  constructor() {
    this.search$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(q => {
        if (!q.trim()) {
          this.results.set([]);
          this.isOpen.set(false);
          this.isLoading.set(false);
          return of({ data: [] });
        }
        this.isLoading.set(true);
        return this.market.search(q).pipe(
          catchError(() => of({ data: [] }))
        );
      }),
      takeUntilDestroyed()
    ).subscribe((res: any) => {
      console.log('search response:', res);
      const data = (res?.data ?? []).slice(0, 8);
      this.results.set(data);
      this.isLoading.set(false);
      this.isOpen.set(data.length > 0);
      this.activeIndex.set(-1);
    });
  }

  //Buscador
  
  //para movil
  showSearch = false;

  onInput(value: string):void{
    console.log('onInput:', value);
    this.query.set(value)
    this.search$.next(value);
  }
  
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape'){
      this.clearSearch(); return; 
      }
    if (!this.isOpen())
      return
    const last = this.results().length - 1
    if (event.key === 'ArrowDown'){
      event.preventDefault();
      this.activeIndex.update(i => Math.min(i + 1, last));
    }
    if (event.key === 'ArrowUp'){
      event.preventDefault();
      this.activeIndex.update(i => Math.max(i - 1, 0));
    }
    if (event.key === 'Enter') {
     const i = this.activeIndex();
     if (i >= 0) this.goToSymbol(this.results()[i]);
    }
  }

  goToSymbol(result: SearchResult): void {
    this.router.navigate(['/public/symbol', result.symbol]);
    this.clearSearch();
  }

  clearSearch(): void {
    this.query.set('');
    this.results.set([]);
    this.isOpen.set(false);
    this.activeIndex.set(-1);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(e: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(e.target)) {
      this.isOpen.set(false);
    }
  }

  // Helpers
  typeLabel(type: string): string {
    const map: Record<string, string> = {
      'Common Stock': 'Stock', 'ETF': 'ETF',
      'Digital Currency': 'Crypto', 'Cryptocurrency': 'Crypto',
    };
    return map[type] ?? type;
  }

  badgeClass(type: string): string {
    const l = this.typeLabel(type);
    const b = 'text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0';
    if (l === 'Crypto') return b + ' bg-yellow-400/15 text-yellow-400';
    if (l === 'ETF')    return b + ' bg-blue-400/15 text-blue-400';
    return b + ' bg-orange-400/15 text-orange-400';
  }



  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
