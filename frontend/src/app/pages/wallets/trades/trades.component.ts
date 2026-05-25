import { Component, signal, effect, inject, OnInit, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { InvestmentService } from '../../../services/investment.service';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { PreferencesService } from '../../../services/preferences.service';

@Component({
  selector: 'app-trades',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatSortModule, MatPaginatorModule],
  templateUrl: './trades.component.html',
  styleUrl: './trades.component.css'
})
export class TradesComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private investmentService = inject(InvestmentService);
  private preferencesService = inject(PreferencesService);

  portfolioId = signal<number | null>(null);
  nombreCartera = signal('Cargando...');
  cargando = signal(true);
  returnUrl = '';

  totalDepositado = signal(0);
  totalRetirado = signal(0);
  exposicionNeta = signal(0);
  totalOperaciones = signal(0);

  skeletonItems = [1, 2, 3, 4, 5, 6, 7, 8];

  dataSource = new MatTableDataSource<any>([]);
  paginator = viewChild(MatPaginator);
  sort = viewChild(MatSort);

  displayedColumns: string[] = ['operated_at', 'symbol', 'type', 'price_per_unit', 'quantity', 'total_value'];

  constructor() {
    effect(() => {
      const pag = this.paginator();
      const srt = this.sort();
      if (pag) this.dataSource.paginator = pag;
      if (srt) this.dataSource.sort = srt;
    });
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.portfolioId.set(Number(id));
        this.cargarTrades();
      }
    });

    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/app/wallets';
  }

  format(value: number) {
    return this.preferencesService.formatCurrency(value);
  }

  cargarTrades() {
    const id = this.portfolioId();
    if (!id) return;

    this.cargando.set(true);
    this.investmentService.getTrades(id).subscribe({
      next: (res: any) => {
        this.nombreCartera.set(res.portfolio_name);
        
        if (res.stats) {
          this.totalDepositado.set(res.stats.total_depositado);
          this.totalRetirado.set(res.stats.total_retirado);
          this.exposicionNeta.set(res.stats.exposicion_neta);
          this.totalOperaciones.set(res.stats.total_operaciones);
        }

        this.dataSource.data = res.trades ?? [];
        this.cargando.set(false);
      },
      error: (err: any) => {
        console.error('Error cargando trades', err);
        this.cargando.set(false);
      }
    });
  }

  volver() {
    this.router.navigateByUrl(this.returnUrl);
  }

  getInitial(value: string | null | undefined): string {
    return value ? value.charAt(0).toUpperCase() : '';
  }

  formatNumber(value: number, digits: number = 2): string {
    return Number(value ?? 0).toFixed(digits);
  }

  getTypeBadgeClass(type: string): string {
    switch (type) {
      case 'compra': return 'bg-green-500/10 text-green-500 border border-green-500/20';
      case 'venta': return 'bg-red-500/10 text-red-500 border border-red-500/20';
      case 'nuevaPosicion': return 'bg-orange-500/20 text-orange-500 border border-orange-500';
      default: return 'bg-neutral-800 text-neutral-400 border border-neutral-700';
    }
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'compra': return 'Compra';
      case 'venta': return 'Venta';
      case 'nuevaPosicion': return 'Inicial';
      default: return type;
    }
  }

  getExposicionNetaDisplay(): string {
    const value = this.exposicionNeta();

    if (value > 0) return `-${this.format(Math.abs(value))}`;
    if (value < 0) return `+${this.format(Math.abs(value))}`;
    return this.format(0);
  }
}