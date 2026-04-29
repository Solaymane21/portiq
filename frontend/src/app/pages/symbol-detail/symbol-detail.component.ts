import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DecimalPipe, Location } from '@angular/common';
import { MarketService } from '../../services/market.service';
import { NgApexchartsModule } from 'ng-apexcharts';

interface SymbolInfo {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  type: string;
  sector: string;
  logo: string;
}

@Component({
  selector: 'app-symbol-detail',
  standalone: true,
  imports: [NgApexchartsModule, DecimalPipe],
  templateUrl: './symbol-detail.component.html',
  styleUrl: './symbol-detail.component.css'
})
export class SymbolDetailComponent implements OnInit {

  private route    = inject(ActivatedRoute);
  private location = inject(Location);
  private market   = inject(MarketService);

  symbol         = signal('');
  info           = signal<SymbolInfo | null>(null);
  loadingInfo    = signal(true);
  loadingChart   = signal(true);
  selectedPeriod = signal('1M');

  readonly periods = ['1D', '1W', '1M', '1Y'];

  chartOptions: any = {};
  changeData = { value: 0, percent: 0, positive: true };

  ngOnInit(): void {
    const sym = (this.route.snapshot.paramMap.get('symbol') ?? '').toUpperCase();
    this.symbol.set(sym);
    this.loadInfo(sym);
    this.loadChart(sym, this.selectedPeriod());
  }

  loadInfo(symbol: string): void {
    this.loadingInfo.set(true);
    this.market.getPrices(symbol).subscribe({
      next: (res) => {
        const item = res?.results?.[0] ?? null;
        this.info.set(item);
        this.loadingInfo.set(false);
      },
      error: (err) => {
        console.error('ERROR getPrices:', err);
        this.loadingInfo.set(false);
      }
    });
  }

  loadChart(symbol: string, period: string): void {
    this.loadingChart.set(true);
    this.market.getHistory(symbol, period).subscribe({
      next: (res) => {
        const values = res?.values ?? res?.data ?? [];
        const prices = values.map((v: any) => +(v.y ?? 0));
        const first  = prices[0] ?? 0;
        const last   = prices[prices.length - 1] ?? 0;
        const color  = last >= first ? '#10B981' : '#EF4444';

        const val = +(last - first).toFixed(2);
        const pct = first !== 0 ? +((last - first) / first * 100).toFixed(2) : 0;
        this.changeData = { value: val, percent: pct, positive: val >= 0 };

        this.chartOptions = {
          chart: {
            type: 'area',
            height: 320,
            toolbar: { show: false },
            background: 'transparent',
            animations: { enabled: true, speed: 400 }
          },
          series: [{ name: symbol, data: prices }],
          xaxis: {
            categories: values.map((v: any) => {
              const d = new Date(v.x);
              return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
            }),
            labels: { show: false },
            axisBorder: { show: false },
            axisTicks: { show: false }
          },
          yaxis: {
            labels: {
              style: { colors: ['#6b7280'] },
              formatter: (v: number) => v.toFixed(2)
            }
          },
          stroke:     { curve: 'smooth', width: 2, colors: [color] },
          fill: {
            type: 'gradient',
            colors: [color],
            gradient: { shadeIntensity: 1, opacityFrom: 0.25, opacityTo: 0 }
          },
          grid:       { borderColor: '#1f2937', strokeDashArray: 3 },
          tooltip:    { theme: 'dark', x: { show: true } },
          dataLabels: { enabled: false },
          theme:      { mode: 'dark' }
        };

        this.loadingChart.set(false);
      },
      error: (err) => {
        console.error('ERROR getHistory:', err);
        this.loadingChart.set(false);
      }
    });
  }

  selectPeriod(period: string): void {
    this.selectedPeriod.set(period);
    this.loadChart(this.symbol(), period);
  }

  goBack(): void {
    this.location.back();
  }
}