import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarketService } from '../../services/market.service';
import { Router, RouterLink } from '@angular/router';

interface TickerItem {
  symbol: string;
  name: string;
  logoUrl: string;
  assetType: string;
  price: number | null;
  change: number | null;
}

export interface Feature {
  id: string;
  label: string;
  title: string;
  description: string;
  svgPath: string;
  images: {
    desktop: { light: string; dark: string; };
    tablet: { light: string; dark: string; };
    mobile: { light: string; dark: string; };
  };
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule,RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {

  private market = inject(MarketService);
  private router = inject(Router);

  activeFeature = signal<string>('dashboard');

  skeletonItems = Array(8).fill(0);
  tickerDouble: TickerItem[] = [];

  ticker: TickerItem[] = [
    { symbol: 'AAPL',  name: 'Apple Inc.',        logoUrl: 'https://financialmodelingprep.com/image-stock/AAPL.png',  assetType: 'stock',  price: null, change: null },
    { symbol: 'NVDA',  name: 'NVIDIA Corporation', logoUrl: 'https://financialmodelingprep.com/image-stock/NVDA.png',  assetType: 'stock',  price: null, change: null },
    { symbol: 'TSLA',  name: 'Tesla Inc.',          logoUrl: 'https://financialmodelingprep.com/image-stock/TSLA.png',  assetType: 'stock',  price: null, change: null },
    { symbol: 'MSFT',  name: 'Microsoft Corp.',     logoUrl: 'https://financialmodelingprep.com/image-stock/MSFT.png',  assetType: 'stock',  price: null, change: null },
    { symbol: 'META',  name: 'Meta Platforms',      logoUrl: 'https://financialmodelingprep.com/image-stock/META.png',  assetType: 'stock',  price: null, change: null },
    { symbol: 'BTC',   name: 'Bitcoin',             logoUrl: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png', assetType: 'crypto', price: null, change: null },
    { symbol: 'ETH',   name: 'Ethereum',            logoUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', assetType: 'crypto', price: null, change: null },
    { symbol: 'SOL',   name: 'Solana',              logoUrl: 'https://assets.coingecko.com/coins/images/4128/small/solana.png', assetType: 'crypto', price: null, change: null },
    { symbol: 'AMZN',  name: 'Amazon.com Inc.',     logoUrl: 'https://financialmodelingprep.com/image-stock/AMZN.png',  assetType: 'stock',  price: null, change: null },
    { symbol: 'GOOGL', name: 'Alphabet Inc.',       logoUrl: 'https://financialmodelingprep.com/image-stock/GOOGL.png', assetType: 'stock',  price: null, change: null },
  ];

  ngOnInit(): void {
    const symbols = this.ticker.map(t => t.symbol).join(',');
    const types   = this.ticker.map(t => t.assetType).join(',');

    this.market.getPrices(symbols, types).subscribe({
      next: (res) => {
        // Solo actualiza price y change, el resto ya está
        (res.results ?? []).forEach((r: any) => {
          const item = this.ticker.find(t => t.symbol === r.symbol);
          if (item) {
            item.price  = r.price;
            item.change = r.change ?? 0;
          }
        });

        this.tickerDouble = [...this.ticker, ...this.ticker];
      },
      error: () => {}
    });
  }

  goToSymbol(symbol: string): void {
    this.router.navigate(['/public/symbol', symbol]);
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  selectedDevice: 'desktop'| 'tablet' | 'mobile' = 'desktop';

  devices = [
    { key: 'desktop', label: 'Escritorio' },
    { key: 'tablet', label: 'Tablet' },
    { key: 'mobile',  label: 'Móvil'   },
  ] as const;

  features: Feature[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    title: 'Panel Principal',
    description: 'Ten una visión completa de tus activos en un solo lugar. Analiza el rendimiento general de tus inversiones mediante gráficos interactivos y obtén un resumen instantáneo del estado de tu cartera.',
    svgPath: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z',
    images: {
      desktop: { light: 'images/dashboard-desktop.png', dark: 'images/dashboard-desktop-dark.png' },
      tablet: { light: 'images/dashboard-tablet.png', dark: 'images/dashboard-tablet-dark.png' },
      mobile: { light: 'images/dashboard-mobile.png', dark: 'images/dashboard-mobile-dark.png' }
    }
  },
  {
    id: 'carteras',
    label: 'Carteras',
    title: 'Gestión de Carteras',
    description: 'Crea múltiples carteras para separar tus estrategias de inversión (dividendos, crecimiento, riesgo, etc.). Registra tus operaciones de compra/venta y mantén un control preciso sobre tu precio medio de adquisición.',
    svgPath: 'M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3',
    images: {
      desktop: { light: 'images/carteras-desktop.png', dark: 'images/carteras-desktop-dark.png' },
      tablet: { light: 'images/carteras-tablet.png', dark: 'images/carteras-tablet-dark.png' },
      mobile: { light: 'images/carteras-mobile.png', dark: 'images/carteras-mobile-dark.png' }
    }
  },
  {
    id: 'favoritos',
    label: 'Favoritos',
    title: 'Listas de Favoritos',
    description: 'Agrupa los activos que estás vigilando de cerca. Crea listas personalizadas para tener a mano tus acciones y criptomonedas preferidas antes de tomar cualquier decisión de inversión.',
    svgPath: 'M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z',
    images: {
      desktop: { light: 'images/favoritos-desktop.png', dark: 'images/favoritos-desktop-dark.png' },
      tablet: { light: 'images/favoritos-tablet.png', dark: 'images/favoritos-tablet-dark.png' },
      mobile: { light: 'images/favoritos-mobile.png', dark: 'images/favoritos-mobile-dark.png' }
    }
  },
  {
    id: 'perfil-inversor',
    label: 'Perfil Inversor',
    title: 'Análisis de Perfil Inversor',
    description: 'Descubre cómo se distribuye tu riesgo y exposición a distintos mercados. Nuestro análisis integrado te ayuda a comprender si tu estrategia actual está alineada con tus objetivos financieros a largo plazo.',
    svgPath: 'M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z',
    images: {
      desktop: { light: 'images/perfil-desktop.png', dark: 'images/perfil-desktop-dark.png' },
      tablet: { light: 'images/perfil-tablet.png', dark: 'images/perfil-tablet-dark.png' },
      mobile: { light: 'images/perfil-mobile.png', dark: 'images/perfil-mobile-dark.png' }
    }
  },
  {
    id: 'alertas',
    label: 'Alertas',
    title: 'Sistema de Alertas',
    description: 'No te pierdas ninguna oportunidad. Configura notificaciones de precio y variaciones porcentuales para que el sistema trabaje por ti mientras tú te dedicas a otras cosas.',
    svgPath: 'M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0',
    images: {
      desktop: { light: 'images/alertas-desktop.png', dark: 'images/alertas-desktop-dark.png' },
      tablet: { light: 'images/alertas-tablet.png', dark: 'images/alertas-tablet-dark.png' },
      mobile: { light: 'images/alertas-mobile.png', dark: 'images/alertas-mobile-dark.png' }
    }
  }
];
}
