import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DecimalPipe, Location } from '@angular/common';
import { MarketService } from '../../services/market.service';
import { NgApexchartsModule } from 'ng-apexcharts';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { PreferencesService } from '../../services/preferences.service';

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

  private preferencesService = inject(PreferencesService)
  private http = inject(HttpClient);
  private route    = inject(ActivatedRoute);
  private market   = inject(MarketService);

  // Estados del componente
  symbol         = signal('');              // Símbolo actual
  info           = signal<SymbolInfo | null>(null);  // Información del símbolo
  loadingInfo    = signal(true);            // Cargando información
  loadingChart   = signal(true);            // Cargando gráfica
  selectedPeriod = signal('1D');            // Período seleccionado

  readonly periods = ['1D', '1W', '1M', '1Y'];  // Opciones de la gráfica

  chartOptions: any = {};                   // Opciones de la gráfica
  changeData = { value: 0, percent: 0, positive: true };  // Cambio de precio

  isLoading = signal(false)

  ngOnInit(): void {
    // Escucha cambios en la URL (cuando cambia el símbolo)
    this.route.params.subscribe(params => {
      const sym = (this.route.snapshot.paramMap.get('symbol') ?? '').toUpperCase();
      this.symbol.set(sym);
      this.loadInfo(sym);        // Carga información del símbolo
      this.loadChart(sym, this.selectedPeriod());  // Carga la gráfica
    });
  }

  // Carga la información del símbolo (precio, nombre, logo, etc.)
  loadInfo(symbol: string): void {
    this.loadingInfo.set(true);

    // Si es criptomoneda, usa CoinGecko
    if (this.market.isCrypto(symbol)) {
      const coinId = this.market.coinGeckoId(
        symbol.replace(/-USD$/i, '').toLowerCase()
      );

      this.http.get<any>(`https://api.coingecko.com/api/v3/coins/${coinId}`).subscribe({
        next: (data) => {
          this.info.set({
            symbol: symbol,
            name: data.name,
            type: 'CRYPTO',
            price: data.market_data.current_price.usd,
            currency: 'USD',
            sector: data.categories?.[0] ?? null,
            logo: data.image?.large ?? '',
          });
          this.loadingInfo.set(false);
        },
        error: () => this.loadingInfo.set(false),
      });

    // Si es acción, usa la API propia
    } else {
      this.market.getPrices(symbol, 'stock').subscribe({
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
  }

  // Carga la gráfica del símbolo
  loadChart(symbol: string, period: string): void {
    this.loadingChart.set(true);

    const assetType = this.market.isCrypto(symbol) ? 'crypto' : 'stock';
    const chartSymbol = assetType === 'crypto' ? symbol.replace(/-USD$/i, '') : symbol;

    this.market.getHistory(chartSymbol, period, assetType).subscribe({
      next: (res) => {
        const values = res?.values ?? res?.data ?? [];
        const prices = values.map((v: any) => +(v.y ?? 0));
        const first  = prices[0] ?? 0;           // Primer precio del período
        const last   = prices[prices.length - 1] ?? 0;  // Último precio

        // Calcula cambio de precio (absoluto y porcentual)
        const val = +(last - first).toFixed(2);
        const pct = first !== 0 ? +((last - first) / first * 100).toFixed(2) : 0;
        this.changeData = { value: val, percent: pct, positive: val >= 0 };

        // Formatea las fechas según el período
        const xFormatter = (value: string, timestamp?: number) => {
          if (!timestamp) return '';
          const d = new Date(timestamp);

          switch (period) {
            case '1D':
              return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            case '1W':
              return d.toLocaleDateString('es-ES', { weekday: 'short' });
            case '1M':
              return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
            case '1Y':
              return d.toLocaleDateString('es-ES', { month: 'short' });
            default:
              return d.toLocaleDateString('es-ES', { month: 'short', day: '2-digit' });
          }
        };

        // Configuración de la gráfica
        this.chartOptions = {
          chart: {
            type: 'area',
            height: 320,
            toolbar: { show: false },
            background: 'transparent',
            animations: { enabled: true, speed: 400 }
          },
          colors: [this.preferencesService.colorHex()],  // Color del tema
          series: [{
            name: symbol,
            data: values.map((v: any) => ({ x: v.x, y: +(v.y ?? 0) }))
          }],
          xaxis: {
            type: 'datetime',
            tickAmount: period === '1D' ? 6 : period === '1W' ? 7 : period === '1M' ? 6 : 12,
            labels: {
              show: true,
              formatter: (_value: string, timestamp?: number) => xFormatter(_value, timestamp),
              style: { colors: '#6b7280' }
            },
            axisBorder: { show: false },
            axisTicks: { show: false }
          },
          yaxis: {
            labels: {
              style: { colors: ['#6b7280'] },
              formatter: (v: number) => v.toFixed(2)
            }
          },
          stroke: { curve: 'smooth', width: 2 },
          fill: {
            type: 'gradient',
            gradient: {
              shade: 'dark',
              type: 'vertical',
              shadeIntensity: 0.35,
              opacityFrom: 0.25,
              opacityTo: 0
            }
          },
          grid: { borderColor: '#1f2937', strokeDashArray: 3 },
          tooltip: { theme: 'dark', x: { show: true } },
          dataLabels: { enabled: false },
          theme: { mode: 'dark' }
        };

        this.loadingChart.set(false);
      },
      error: (err) => {
        console.error('ERROR getHistory:', err);
        this.loadingChart.set(false);
      }
    });
  }

  // Cambia el período de la gráfica
  selectPeriod(period: string): void {
    this.selectedPeriod.set(period);
    this.loadChart(this.symbol(), period);
  }

  // Vuelve a la página anterior
  goBack(): void {
    this.isLoading.set(true)
    window.history.back()
  }

  // Obtiene la URL del logo (para acciones)
  getLogoUrl(symbol: string): string {
    const clean = symbol.replace(/-USD$/i, '');
    return `https://financialmodelingprep.com/image-stock/${clean}.png`;
  }

  // Si la imagen falla, la oculta
  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

}