import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SearchResult } from '../models/search.model';

@Injectable({ providedIn: 'root' })
export class MarketService {

  private apiUrl = 'http://localhost:8000/api';
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
}