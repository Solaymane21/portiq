// ─── 1. IMPORTS ───────────────────────────────────────────
import { Component, OnInit } from '@angular/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import { MarketService } from './market.service';

// ─── 2. DECORADOR ─────────────────────────────────────────
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgApexchartsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})

// ─── 3. CLASE ─────────────────────────────────────────────
export class DashboardComponent implements OnInit {

  // ─── 4. PROPIEDADES (variables del componente) ──────────
  selectedPeriod = '1D';
  periods = ['1D', '1M', '1A'];
  selectedSymbol = 'NVDA';
  donutOptions: any = {};
  areaOptions: any = {};
  isLoading = false;

  // ─── 5. CONSTRUCTOR (inyección de servicios) ────────────
  constructor(private marketService: MarketService) {}

  // ─── 6. LIFECYCLE HOOKS (ngOnInit, ngOnDestroy...) ──────
  ngOnInit(): void {
    this.donutOptions = {
      series: [70, 30],
      chart: {
        type: 'donut',
        height: 220,
        background: 'transparent',
        toolbar: { show: false }
      },
      labels: ['Acciones', 'Criptomonedas'],
      colors: ['#EA580C', '#6b4f2a'],
      legend: { show: false },
      dataLabels: { enabled: false },
      plotOptions: {
        pie: {
          donut: {
            size: '68%',
            labels: {
              show: true,
              total: {
                show: true,
                label: '99.900€',
                fontSize: '16px',
                fontWeight: 700,
                color: '#e2e8f0',
                formatter: () => '+2,6%'
              }
            }
          }
        }
      }
    };

    this.loadChart('1D');
  }

  // ─── 7. MÉTODOS PÚBLICOS (llamados desde el HTML) ────────
  setPeriod(period: string): void {
    this.selectedPeriod = period;
    this.loadChart(period);
  }

  // ─── 8. MÉTODOS PRIVADOS (lógica interna) ────────────────
  private loadChart(period: string): void {
    this.isLoading = true;

    this.marketService.getHistory(this.selectedSymbol, period).subscribe({
      next: (response) => {
        this.buildAreaChart(response.data);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.buildAreaChart([]);
      }
    });
  }

  private buildAreaChart(data: { x: number; y: number }[]): void {
    this.areaOptions = {
      series: [{ name: this.selectedSymbol, data }],
      chart: {
        type: 'area',
        height: 220,
        background: 'transparent',
        toolbar: { show: false },
        animations: { enabled: true, speed: 400 }
      },
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
        xaxis: { lines: { show: false } }
      },
      xaxis: {
        type: 'datetime',
        labels: { show: false },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: { style: { colors: '#6b7280', fontSize: '11px' } }
      },
      tooltip: {
        theme: 'dark',
        x: { format: 'dd MMM HH:mm' }
      }
    };
  }
}