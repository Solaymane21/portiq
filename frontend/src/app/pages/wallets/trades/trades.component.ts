import { CommonModule } from '@angular/common';
import { Component, OnInit, effect, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { InvestmentService } from '../../../services/investment.service';
import { PreferencesService } from '../../../services/preferences.service';

@Component({
  selector: 'app-trades',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatSortModule, MatPaginatorModule],
  templateUrl: './trades.component.html',
  styleUrl: './trades.component.css',
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

  skeletonItems = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  dataSource = new MatTableDataSource<any>([]);
  paginator = viewChild(MatPaginator);
  sort = viewChild(MatSort);

  displayedColumns: string[] = ['operated_at', 'symbol', 'type', 'price_per_unit', 'quantity', 'total_value'];

  constructor() {
    effect(() => {
      const paginator = this.paginator();
      const sort = this.sort();

      if (paginator) {
        this.dataSource.paginator = paginator;
      }

      if (sort) {
        this.dataSource.sort = sort;
      }
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');

      if (!id) {
        return;
      }

      this.portfolioId.set(Number(id));
      this.cargarTrades();
    });

    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/app/wallets';
  }

  format(value: number): string {
    return this.preferencesService.formatCurrency(value);
  }

  cargarTrades(): void {
    const id = this.portfolioId();

    if (!id) {
      return;
    }

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
      },
    });
  }

  volver(): void {
    this.router.navigateByUrl(this.returnUrl);
  }

  getInitial(value: string | null | undefined): string {
    return value ? value.charAt(0).toUpperCase() : '';
  }

  formatNumber(value: number, digits: number = 2): string {
    return Number(value ?? 0).toFixed(digits);
  }

  // Pintamos el badge segun el tipo
  getTypeBadgeClass(type: string): string {
    switch (type) {
      case 'compra':
        return 'bg-green-500/10 text-green-500 border border-green-500/20';
      case 'venta':
        return 'bg-red-500/10 text-red-500 border border-red-500/20';
      case 'nuevaPosicion':
        return 'bg-orange-500/20 text-orange-500 border border-orange-500';
      default:
        return 'bg-neutral-800 text-neutral-400 border border-neutral-700';
    }
  }

  // Mostramos un texto mas claro en la tabla
  getTypeLabel(type: string): string {
    switch (type) {
      case 'compra':
        return 'Compra';
      case 'venta':
        return 'Venta';
      case 'nuevaPosicion':
        return 'Inicial';
      default:
        return type;
    }
  }

  // La exposicion se muestra con signo segun el balance
  getExposicionNetaDisplay(): string {
    const value = this.exposicionNeta();

    if (value > 0) {
      return `-${this.format(Math.abs(value))}`;
    }

    if (value < 0) {
      return `+${this.format(Math.abs(value))}`;
    }

    return this.format(0);
  }
}