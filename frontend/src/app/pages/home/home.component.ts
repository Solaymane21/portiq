import { Component, OnInit, inject } from '@angular/core';
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

}