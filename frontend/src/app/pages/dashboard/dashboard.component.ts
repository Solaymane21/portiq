import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';
import { MarketService } from './market.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgApexchartsModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {

  selectedPeriod = '1D';
  periods = ['1D', '1M', '1A'];
  selectedSymbol = 'AAPL';
  donutOptions: any = {};
  areaOptions: any = null;
  isLoading = false;

  marketService = inject(MarketService);


  // Datos del portfolio
  totalValue = 100000;

  portfolioAllocation = [
    { label: 'Acciones', percent: 70, color: '#EA580C', colorClass: 'bg-orange-500', textClass: 'text-[#EA580C]' },
    { label: 'Criptomonedas', percent: 30, color: '#92400e', colorClass: 'bg-orange-800', textClass: 'text-neutral-400' }
  ];

  get portfolioValues() {
    return this.portfolioAllocation.map(item => ({
      ...item,
      value: (this.totalValue * item.percent / 100).toLocaleString('es-ES') + '€'
    }));
  }


  ngOnInit(): void {
    //Donut
    this.donutOptions = {
      series: this.portfolioAllocation.map(i => i.percent),
      chart: {
        type: 'donut',
        height: 160,
        background: 'transparent',
        toolbar: { show: false }
      },
      labels: this.portfolioAllocation.map(i => i.label),
      colors: this.portfolioAllocation.map(i => i.color),
      legend: { show: false },
      dataLabels: { enabled: false },
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '11px',
                color: '#9ca3af',
                formatter: (seriesName: string) => {
                  const item = this.portfolioAllocation.find(i => i.label === seriesName);
                  if (!item) return seriesName;
                  const amount = this.totalValue * item.percent / 100;
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
                label: this.totalValue.toLocaleString('es-ES') + '€',
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

    this.loadChart('1D');
  }

  setPeriod(period: string): void {
    this.selectedPeriod = period;
    this.loadChart(period);
  }

  private loadChart(period: string): void {
    this.isLoading = true;

    this.marketService.getHistory(this.selectedSymbol, period).subscribe({
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

  //Grafico Lineal
  private buildAreaChart(data: { x: number; y: number }[], period: string): void {
    const tooltipFormat = period === '1D' ? 'HH:mm' : 'dd MMM yyyy';

    this.areaOptions = {
      series: [{ name: this.selectedSymbol, data }],
      chart: {
        type: 'area',
        height: 300,
        background: 'transparent',
        toolbar: { show: false },
        animations: { enabled: true, speed: 640 },
        zoom: { enabled: false }
      },
      markers: {
        size: 0,
        hover: { size: 5 }
      },
      dataLabels: {
        enabled: false
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