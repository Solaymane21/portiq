import { Component, OnInit, inject, ViewChild, signal, effect } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { MarketService } from '../../services/market.service';
import { PortfolioDashboard, PortfolioPosition } from '../../models/portfolioDashboard.model';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationsService } from '../../services/notifications.service';
import { PortfolioService } from '../../services/portfolio.service';
import { InvestmentService } from '../../services/investment.service';
import { PreferencesService } from '../../services/preferences.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgApexchartsModule, FormsModule, DecimalPipe, MatTableModule, MatPaginatorModule, MatSortModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})

export class DashboardComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationsService);
  private portfolioService = inject(PortfolioService);
  private investmentService = inject(InvestmentService);
  preferencesService = inject(PreferencesService);

  hasInvestments = signal<boolean>(false);
  isLoadingInvestments = signal<boolean>(true);

  displayedColumns = ['ticker', 'name', 'price', 'change'];
  dataSource = new MatTableDataSource<PortfolioPosition>([]);

  @ViewChild(MatPaginator) set paginator(paginator: MatPaginator) {
    if (paginator) {
      this.dataSource.paginator = paginator;
    }
  }

  @ViewChild(MatSort) set sort(sort: MatSort) {
    if (sort) {
      this.dataSource.sort = sort;
      this.dataSource.sortingDataAccessor = (item: PortfolioPosition, sortHeaderId: string) => {
        switch (sortHeaderId) {
          case 'price':
            return parseFloat(String(item.price).replace(/[^0-9.-]/g, '')) || 0;
          case 'change':
            return parseFloat(String(item.change).replace(/[^0-9.-]/g, '')) || 0;
          case 'ticker':
            return item.ticker?.toLowerCase() ?? '';
          case 'name':
            return item.name?.toLowerCase() ?? '';
          default:
            return (item as any)[sortHeaderId];
        }
      };
    }
  }

  portfolios: PortfolioDashboard[] = [];
  selectedPortfolioId: number = 0;
  isLoadingPortfolios = true;

  get currentPortfolio(): PortfolioDashboard | undefined {
    return this.portfolios.find(p => p.id === this.selectedPortfolioId) ?? this.portfolios[0];
  }

  selectedPeriod = '1D';
  periods = ['1D', '1M', '1A'];
  donutOptions: any = {};
  areaOptions: any = null;
  isLoading = false;

  treemapOptions: any = null;
  private dashboardInvestments: any[] = [];
  private dashboardTotalValue = 0;

  marketService = inject(MarketService);
  collapsed = signal(false);

  private get primaryColor(): string {
    return this.preferencesService.colorHex();
  }

  constructor() {
    effect(() => {
      this.preferencesService.colorTheme();
      if (this.currentPortfolio) {
        this.buildDonutChart();
        this.rebuildAreaColor();
        this.buildTreemap(this.dashboardInvestments, this.dashboardTotalValue);
      }
    });
  }

  private rebuildAreaColor(): void {
    if (!this.areaOptions) return;
    this.areaOptions = {
      ...this.areaOptions,
      colors: [this.primaryColor]
    };
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['subscribed'] === '1') {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true
        });
        this.authService.refreshUser().subscribe(user => {
          if (user?.suscription_type === 'premium') {
            this.notificationService.success('¡Bienvenido a PortIQ Pro!');
          }
        });
        
      }
    });

    this.portfolioService.getPortfolios().subscribe({
      next: (carteras: any[]) => {

        const defaultCarteras = carteras.find(c => c.is_default) ?? carteras[0];

        if (!defaultCarteras) {
          this.isLoadingPortfolios = false;
          this.isLoadingInvestments.set(false);
          return;
        }

        this.selectedPortfolioId = defaultCarteras.id;

        this.portfolios = carteras.map(c => ({
          id: c.id,
          name: c.name,
          is_default: c.is_default,
          totalValue: 0,
          totalValueUSD: 0,
          totalPositions: c.activos_count ?? 0,
          profitLoss: 0,
          symbol: 'AAPL',
          allocation: [],
          positions: []
        }));

        this.cargarInvestmentsDashboard(this.selectedPortfolioId);
        this.isLoadingPortfolios = false;
      },
      error: (err) => {
        console.error('Error cargando carteras', err);
        this.isLoadingPortfolios = false;
      }
    });
  }

  onPortfolioChange(portfolioId: number): void {
    this.selectedPortfolioId = +portfolioId;
    this.areaOptions = null;
    this.treemapOptions = null;
    this.donutOptions = null;
    this.dataSource.data = [];
    this.dataSource.paginator?.firstPage();
    this.isLoadingInvestments.set(true);
    this.cargarInvestmentsDashboard(this.selectedPortfolioId);
  }

  private cargarInvestmentsDashboard(portfolioId: number): void {
    this.isLoading = true;
    this.areaOptions = null;
    this.isLoadingInvestments.set(true);

    this.investmentService.getInvestments(portfolioId).subscribe({
      next: (response: any) => {
        console.log('Response API:', response);

        

        const investments = response.investments.filter((inv: any) =>
          parseFloat(inv.quantity || '0') > 0
        );

        console.table(investments.map((inv: any) => ({
          symbol:        inv.symbol,
          qty:           inv.quantity,
          avg_buy_price: inv.avg_buy_price,
          current_price: inv.current_price,
          pl:            inv.pl,
          pl_percentage: inv.pl_percentage,
        })));

        this.hasInvestments.set(investments.length > 0);
        this.dashboardInvestments = investments;
        this.dashboardTotalValue = response.total_value ?? 0;

        const idx = this.portfolios.findIndex(p => p.id === portfolioId);
        if (idx !== -1) {

          const primerActivo = investments[0];
          const symbolParaChart = primerActivo?.symbol ?? 'AAPL';

          const totalGanancias = investments.reduce((acc: number, inv: any) =>
            acc + (parseFloat(inv.pl) || 0), 0);

          const totalInvertido = investments.reduce((acc: number, inv: any) =>
            acc + (parseFloat(inv.avg_buy_price) || 0) * (parseFloat(inv.quantity) || 0), 0);

          const rendimientoGlobal = totalInvertido > 0
            ? (totalGanancias / totalInvertido) * 100
            : 0;

          this.portfolios[idx] = {
            ...this.portfolios[idx],
            totalValue: response.total_value ?? 0,
            totalValueUSD: totalGanancias,
            totalPositions: investments.length,
            profitLoss: rendimientoGlobal,
            symbol: symbolParaChart,
            assetType: primerActivo?.asset_type ?? 'stock',
            allocation: this.buildAllocation(investments, response.total_value),
            positions: investments.map((inv: any) => {
              const rendimiento = parseFloat(inv.pl_percentage) || 0;
              return {
                ticker: inv.symbol,
                name: inv.name ?? inv.symbol,
                price: '$' + Number(inv.current_price ?? 0).toFixed(2),
                change: (rendimiento >= 0 ? '+' : '') + rendimiento.toFixed(2) + '%',
                positive: rendimiento >= 0
              };
            })
          };

          this.portfolios = [...this.portfolios];
        }

        this.dataSource.data = this.currentPortfolio?.positions ?? [];
        this.buildDonutChart();
        this.buildTreemap(this.dashboardInvestments, this.dashboardTotalValue);
        this.loadChart(this.selectedPeriod);
        this.isLoadingInvestments.set(false);
      },
      error: () => {
        this.isLoading = false;
        this.isLoadingInvestments.set(false);
        this.buildDonutChart();
        this.loadChart(this.selectedPeriod);
      }
    });
  }

  private buildAllocation(investments: any[], totalValue: number): any[] {
    if (!investments.length || !totalValue) return [];

    const grupos: Record<string, number> = {};
    investments.forEach((inv: any) => {
      const tipo = inv.asset_type ?? 'Otros';
      grupos[tipo] = (grupos[tipo] ?? 0) + (inv.value ?? 0);
    });

    return Object.entries(grupos).map(([tipo, valor]) => ({
      label: tipo === 'crypto' ? 'Criptomonedas'
        : tipo === 'stock' ? 'Acciones'
        : tipo === 'etf' ? 'ETFs'
        : tipo,
      percent: Math.round((valor / totalValue) * 100),
      color: this.getAssetColor(tipo),
    }));
  }

  private buildDonutChart(): void {
    if (!this.currentPortfolio) return;
    this.donutOptions = null;

    setTimeout(() => {
      if (!this.currentPortfolio) return;
      const alloc = this.currentPortfolio.allocation;
      const total = this.currentPortfolio.totalValue;
      const colors = alloc.map(i => i.color);

      this.donutOptions = {
        series: alloc.map(i => i.percent),
        chart: {
          type: 'donut',
          height: 180,
          background: 'transparent',
          toolbar: { show: false }
        },
        labels: alloc.map(i => i.label),
        colors,
        stroke: { width: 0 },
        legend: { show: false },
        dataLabels: { enabled: false },
        plotOptions: {
          pie: {
            donut: {
              size: '55%',
              labels: {
                show: true,
                name: {
                  show: true,
                  fontSize: '11px',
                  color: '#9ca3af',
                  formatter: (seriesName: string) => {
                    const item = alloc.find(i => i.label === seriesName);
                    if (!item) return seriesName;
                    const amount = total * item.percent / 100;
                    return amount.toLocaleString('es-ES') + '€';
                  }
                },
                value: {
                  show: true,
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#fff',
                  offsetY: 4,
                  formatter: (val: string) => val + '%'
                },
                total: {
                  show: false
                }
              }
            }
          }
        }
      };
    }, 0);
  }

  private getAssetColor(tipo: string): string {
    const primary = this.primaryColor;

    const colores: Record<string, string> = {
      stock: primary,
      crypto: primary + '99',
      etf: primary + '44'
    };

    return colores[tipo] ?? primary;
  }

  setPeriod(period: string): void {
    this.selectedPeriod = period;
    this.loadChart(period);
  }

  private loadChart(period: string): void {
    if (!this.currentPortfolio) return;
    this.isLoading = true;
    const symbol = this.currentPortfolio.symbol;
    const assetType = this.currentPortfolio.assetType ?? 'stock';

    this.marketService.getHistory(symbol, period, assetType).subscribe({
      next: (response) => {
        this.buildAreaChart(response.data, period);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.buildAreaChart([], period);
      }
    });
  }

  private buildAreaChart(data: { x: number; y: number }[], period: string): void {
    const tooltipFormat = period === '1D' ? 'HH:mm' : 'dd MMM yyyy';

    this.areaOptions = {
      series: [{ name: this.currentPortfolio?.name ?? '', data }],
      chart: {
        type: 'area',
        height: 250,
        background: 'transparent',
        toolbar: { show: false },
        animations: { enabled: true, speed: 640 },
        zoom: { enabled: false }
      },
      markers: { size: 0, hover: { size: 5 } },
      dataLabels: { enabled: false },
      colors: [this.primaryColor],
      stroke: { curve: 'smooth', width: 2 },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          type: 'vertical',
          gradientToColors: ['transparent'],
          opacityFrom: 0.45,
          opacityTo: 0.02
        }
      },
      grid: {
        borderColor: '#374151',
        strokeDashArray: 3,
        xaxis: { lines: { show: true } }
      },
      xaxis: {
        type: 'datetime',
        labels: { show: true },
        axisBorder: { show: true },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: { style: { colors: '#6b7280', fontSize: '11px' } }
      },
      tooltip: {
        theme: 'dark',
        shared: true,
        intersect: false,
        x: { format: tooltipFormat }
      }
    };
  }

  private buildTreemap(investments: any[], totalValue: number): void {
    if (!investments.length || !totalValue) {
      this.treemapOptions = null;
      return;
    }

    const baseHex = this.primaryColor;

    const hexToRgba = (hex: string, alpha: number) => {
      const clean = hex.replace('#', '');
      const r = parseInt(clean.slice(0, 2), 16);
      const g = parseInt(clean.slice(2, 4), 16);
      const b = parseInt(clean.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const getAlphaByWeight = (weight: number) => {
      if (weight <= 5) return 0.35;
      if (weight <= 10) return 0.45;
      if (weight <= 15) return 0.55;
      if (weight <= 20) return 0.70;
      if (weight <= 25) return 0.85;
      return 1;
    };

    const treemapData = investments
      .filter((inv: any) => (inv.value ?? 0) > 0)
      .map((inv: any) => {
        const weight = ((inv.value ?? 0) / totalValue) * 100;
        const alpha = getAlphaByWeight(weight);
        const symbol = inv.symbol ?? inv.name ?? 'Activo';

        return {
          x: symbol,
          y: Number(weight.toFixed(2)),
          fillColor: hexToRgba(baseHex, alpha),
          meta: symbol
        };
      });

    this.treemapOptions = {
      series: [{ data: treemapData }],
      chart: {
        type: 'treemap',
        height: 320,
        background: 'transparent',
        toolbar: { show: false },
        events: {
          dataPointMouseEnter: (event: any) => {
            event.target.style.cursor = 'pointer';
          },
          dataPointSelection: (_event: any, _chartContext: any, config: any) => {
            const item = treemapData[config.dataPointIndex];
            if (item?.meta) {
              this.router.navigate(['/public/symbol', item.meta]);
            }
          }
        }
      },
      xaxis: {
        show: false,
        labels: { show: false },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        show: false,
        labels: { show: false }
      },
      plotOptions: {
        treemap: {
          distributed: false,
          enableShades: false,
          useFillColorAsStroke: false
        }
      },
      stroke: {
        show: false,
        width: 0,
        colors: ['transparent']
      },
      dataLabels: {
        enabled: true,
        style: {
          fontSize: '11px',
          fontWeight: 600,
          colors: ['#ffffff']
        },
        formatter: (text: string, opts: any) => {
          const item = opts.w.config.series[opts.seriesIndex].data[opts.dataPointIndex];
          return `${text}\n${Number(item.y).toFixed(1)}%`;
        }
      },
      legend: {
        show: false
      },
      tooltip: {
        theme: 'dark',
        custom: (opts: any) => {
          const item = opts.w.config.series[opts.seriesIndex].data[opts.dataPointIndex];
          return `
            <div class="p-3 bg-neutral-900 border border-neutral-700 rounded-lg shadow-lg min-w-[180px]">
              <div class="font-bold text-white text-sm mb-1">${item.x}</div>
              <div class="text-neutral-300 text-xs">
                Peso: <span class="font-mono">${Number(item.y).toFixed(2)}%</span>
              </div>
            </div>
          `;
        }
      }
    };
  }
}