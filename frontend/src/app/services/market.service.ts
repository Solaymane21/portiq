import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SearchResult } from '../models/search.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MarketService {

  private apiUrl = environment.apiUrl;
  private http = inject(HttpClient)

  // Historial de precios
  getHistory(symbol: string, period: string, assetType: string = 'stock'): Observable<any> {
    return this.http.get(`${this.apiUrl}/history/${symbol}`, {
      params: { period, asset_type: assetType }
    });
  }

  // Precios en tiempo real
  getPrices(symbols: string, assetTypes: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/prices`, {
      params: { symbols, asset_types: assetTypes }
    });
  }

  // Búsqueda de symbols
  search(query: string): Observable<SearchResult[]> {
    return this.http.get<SearchResult[]>(`${this.apiUrl}/assets/search`, {
      params: { q: query }
    });
  }

  // Guardar symbols
  storeSymbol(result: SearchResult): Observable<any> {
    return this.http.post(`${this.apiUrl}/assets/store`, result);
  }

  private CRYPTO_SYMBOLS = ['BTC', 'ETH', 'SOL', 'ADA', 'DOGE', 'XRP', 'BNB', 'AVAX', 'MATIC', 'DOT'];

  isCrypto(symbol: string): boolean {
    const clean = symbol.replace(/-USD$/i, '').toUpperCase();
    return this.CRYPTO_SYMBOLS.includes(clean) || symbol.toUpperCase().endsWith('-USD');
  }

  coinGeckoId(symbol: string): string {
    const map: Record<string, string> = {
      btc: 'bitcoin', eth: 'ethereum', sol: 'solana',
      ada: 'cardano', doge: 'dogecoin', xrp: 'ripple',
      bnb: 'binancecoin', avax: 'avalanche-2', dot: 'polkadot',
    };
    return map[symbol] ?? symbol;
  }

}