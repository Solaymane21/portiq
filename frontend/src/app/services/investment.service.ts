import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AssetSearchResult, Investment, InvestmentsResponse, UpsertPositionPayload, TradeActionPayload } from '../models/investment.model';

@Injectable({
  providedIn: 'root'
})
export class InvestmentService {
  private http = inject(HttpClient);
  private apiBase = 'http://localhost:8000/api';

  getInvestments(portfolioId: number): Observable<InvestmentsResponse> {
    return this.http.get<InvestmentsResponse>(`${this.apiBase}/portfolios/${portfolioId}/investments`);
  }

  addInvestment(portfolioId: number, payload: UpsertPositionPayload): Observable<any> {
    return this.http.post(`${this.apiBase}/portfolios/${portfolioId}/investments`, payload);
  }

  buyInvestment(portfolioId: number, investmentId: number, payload: TradeActionPayload): Observable<any> {
    return this.http.post(`${this.apiBase}/portfolios/${portfolioId}/investments/${investmentId}/buy`, payload);
  }

  sellInvestment(portfolioId: number, investmentId: number, payload: TradeActionPayload): Observable<any> {
    return this.http.post(`${this.apiBase}/portfolios/${portfolioId}/investments/${investmentId}/sell`, payload);
  }

  searchAssets(query: string): Observable<AssetSearchResult[]> {
    return this.http.get<AssetSearchResult[]>(`${this.apiBase}/assets/search`, {
      params: { q: query }
    });
  }

  getHistoricalPrice(apiId: string, assetType: string, date: string): Observable<{ price: number }> {
    return this.http.get<{ price: number }>(`${this.apiBase}/assets/history`, {
      params: { api_id: apiId, asset_type: assetType, date: date }
    });
  }

  getTrades(portfolioId: number): Observable<any> {
    return this.http.get(`${this.apiBase}/portfolios/${portfolioId}/trades`);
  }
}