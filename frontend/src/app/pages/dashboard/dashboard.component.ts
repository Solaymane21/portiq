import { Component, OnInit, inject, ViewChild, AfterViewInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { MarketService } from '../../services/market.service';
import { PortfolioDashboard, PortfolioPosition } from '../../models/portfolioDashboard.model';
import { PORTFOLIOS_MOCK } from './dashboard.mock';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { FormsModule } from '@angular/forms';
import {CdkMenu, CdkMenuItem, CdkMenuTrigger} from '@angular/cdk/menu';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationsService } from '../../services/notifications.service';



@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgApexchartsModule, FormsModule, DecimalPipe, MatTableModule, MatPaginatorModule, MatSortModule, CdkMenu],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, AfterViewInit  {

  route = inject(ActivatedRoute);
  router = inject(Router);
  authService = inject(AuthService);
  notificationService = inject(NotificationsService);

  //Tabla
  displayedColumns = ['ticker', 'name', 'price', 'change'];
  dataSource = new MatTableDataSource<PortfolioPosition>([]);

  portfolio =signal(0);


  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngAfterViewInit(): void {

    setTimeout(()=>{
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
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
    });
  }

  // Carteras
  portfolios: PortfolioDashboard[] = PORTFOLIOS_MOCK;
  selectedPortfolioId: number = 1;

  get currentPortfolio(): PortfolioDashboard {
    return this.portfolios.find(p => p.id === this.selectedPortfolioId) ?? this.portfolios[0];
  }


  get profitLoss(): number {
    return this.currentPortfolio.profitLoss;
  }

  // Chart
  selectedPeriod = '1D';
  periods = ['1D', '1M', '1A'];
  donutOptions: any = {};
  areaOptions: any = null;
  isLoading = false;


  marketService = inject(MarketService);
  collapsed = signal(false)

  ngOnInit(): void {
    this.buildDonutChart();
    this.loadChart(this.selectedPeriod);
    this.dataSource.data = this.currentPortfolio.positions

    // mostrar notificacion si el usuario se ha suscrito
    this.route.queryParams.subscribe(params => {
      if (params['subscribed'] === '1') {

        // Limpia la URL inmediatamente
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true
        });

        // Consulta el estado de la suscripcion en la API
        this.authService.refreshUser().subscribe(user => {
          // Solo notifica si realmente es premium
          if (user.suscription_type === 'premium') {
            this.notificationService.success('¡Bienvenido a PortIQ Pro!');
          }
        });
      }
    });
  }

  onPortfolioChange(portfolioId: number): void {
    this.selectedPortfolioId = +portfolioId;
    this.areaOptions = null;
    this.buildDonutChart();
    this.loadChart(this.selectedPeriod);
    this.dataSource.data = this.currentPortfolio.positions;
  }


  // Donut
  private buildDonutChart(): void {

    this.donutOptions = null;

     setTimeout(() => {
      const alloc = this.currentPortfolio.allocation;
      const total = this.currentPortfolio.totalValue;

      this.donutOptions = {
        series: alloc.map(i => i.percent),
        chart: {
          type: 'donut',
          height: 180,
          background: 'transparent',
          toolbar: { show: false }
        },
        labels: alloc.map(i => i.label),
        colors: alloc.map(i => i.color),
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
                  color: '#e2e8f0',
                  offsetY: 4,
                  formatter: (val: string) => val + '%'
                },
                total: {
                  show: true,
                  label: total.toLocaleString('es-ES') + '€',
                  fontSize: '32px',
                  fontWeight: 500,
                  color: '#fff',
                  formatter: () => ''
                  }
              }
            }
          }
        }
      };
    }, 0);
  }


  setPeriod(period: string): void {
    this.selectedPeriod = period;
    this.loadChart(period);
  }


  private loadChart(period: string): void {
    this.isLoading = true;
    const symbol = this.currentPortfolio.symbol;


    this.marketService.getHistory(symbol, period).subscribe({
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


  //Area chart
  private buildAreaChart(data: { x: number; y: number }[], period: string): void {
    const tooltipFormat = period === '1D' ? 'HH:mm' : 'dd MMM yyyy';


    this.areaOptions = {
      series: [{ name: this.currentPortfolio.name, data }],
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
      colors: ['#EA580C'],
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


}

