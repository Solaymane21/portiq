import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SearchResult } from '../models/search.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MarketService {

  private apiUrl = environment.apiUrl;
  private http = inject(HttpClient)

  // Obtiene histórico de precios de un activo (1D, 1W, 1M, 1Y)
  getHistory(symbol: string, period: string, assetType: string = 'stock') {
    return this.http.get<any>(
      `${this.apiUrl}/history/${symbol}?period=${period}&asset_type=${assetType}`
    );
  }

  // Obtiene precios en tiempo real de varios activos
  getPrices(symbols: string, assetTypes: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/prices`, {
      params: { symbols, asset_types: assetTypes }
    });
  }

  // Grafica 1D de toda la cartera en una sola peticion (antes era una por activo)
  getPortfolioIntraday(symbols: string[], quantities: number[], assetTypes: string[]) {
    return this.http.get<{ data: { x: number; y: number }[] }>(`${this.apiUrl}/portfolio-intraday`, {
      params: {
        symbols: symbols.join(','),
        quantities: quantities.join(','),
        asset_types: assetTypes.join(',')
      }
    });
  }

  // Busca activos por nombre o símbolo
  search(query: string): Observable<SearchResult[]> {
    return this.http.get<SearchResult[]>(`${this.apiUrl}/assets/search`, {
      params: { q: query }
    });
  }

  // Guarda un símbolo en la base de datos
  storeSymbol(result: SearchResult): Observable<any> {
    return this.http.post(`${this.apiUrl}/assets/store`, result);
  }

  // Lista de criptos soportadas
  private CRYPTO_SYMBOLS = ['BTC', 'ETH', 'SOL', 'ADA', 'DOGE', 'XRP', 'BNB', 'AVAX', 'MATIC', 'DOT'];

  // Detecta si un símbolo es cripto
  isCrypto(symbol: string): boolean {
    const clean = symbol.replace(/-USD$/i, '').toUpperCase();
    return this.CRYPTO_SYMBOLS.includes(clean) || symbol.toUpperCase().endsWith('-USD');
  }

  // Convierte símbolo a ID de CoinGecko
  coinGeckoId(symbol: string): string {
    const map: Record<string, string> = {
      btc: 'bitcoin', eth: 'ethereum', sol: 'solana',
      ada: 'cardano', doge: 'dogecoin', xrp: 'ripple',
      bnb: 'binancecoin', avax: 'avalanche-2', dot: 'polkadot',
    };
    return map[symbol] ?? symbol;
  }

  // Historial de cartera (versión simple) - usa GET
  getPortfolioHistory(symbols: string[], quantities: number[], assetTypes: string[], fromDate: string) {
    return this.http.get<{ data: { x: number; y: number }[] }>(
      `${this.apiUrl}/portfolio-history`,
      {
        params: {
          symbols: symbols.join(','),
          quantities: quantities.join(','),
          asset_types: assetTypes.join(','),
          from_date: fromDate
        }
      }
    );
  }

  // Historial de cartera con datos de compra (precio medio y fecha) - usa POST
  getPortfolioHistoryWithDetails(
    symbols: string[], 
    quantities: number[], 
    assetTypes: string[], 
    purchaseDates: string[], 
    purchasePrices: number[], 
    fromDate: string
  ) {
    return this.http.get<{ data: { x: number; y: number }[] }>(
      `${this.apiUrl}/portfolio-history`,
      {
        params:{
        symbols: symbols.join(','),
        quantities: quantities.join(','),
        asset_types: assetTypes.join(','),
        purchase_dates: purchaseDates.join(','),
        purchase_prices: purchasePrices.join(','),
        from_date: fromDate
        }
      }
    );
  }

}