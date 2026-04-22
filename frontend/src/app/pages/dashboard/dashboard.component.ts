import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { MarketService } from '../../services/market.service';
import { Portfolio } from '../../models/portfolio.model';
import { PORTFOLIOS_MOCK } from './dashboard.mock';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgApexchartsModule, FormsModule, DecimalPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {

  // Carteras
  portfolios: Portfolio[] = PORTFOLIOS_MOCK;
  selectedPortfolioId: number = 1;

  get currentPortfolio(): Portfolio {
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

  toggle() {
    this.collapsed.update(v => !v)
  }

  ngOnInit(): void {
    this.buildDonutChart();
    this.loadChart(this.selectedPeriod);
  }

  onPortfolioChange(portfolioId: number): void {
    this.selectedPortfolioId = +portfolioId;
    this.areaOptions = null;
    this.buildDonutChart();
    this.loadChart(this.selectedPeriod);
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
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#e2e8f0',
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

  private buildAreaChart(data: { x: number; y: number }[], period: string): void {
    const tooltipFormat = period === '1D' ? 'HH:mm' : 'dd MMM yyyy';

    this.areaOptions = {
      series: [{ name: this.currentPortfolio.name, data }],
      chart: {
        type: 'area',
        height: 200,
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
