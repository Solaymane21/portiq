import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MarketService {

  private mlUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  getHistory(symbol: string, period: string): Observable<any> {
    return this.http.get(`${this.mlUrl}/history/${symbol}?period=${period}`);
  }

  getPrices(symbols: string): Observable<any> {
    return this.http.get(`${this.mlUrl}/prices?symbols=${symbols}`);
  }
}