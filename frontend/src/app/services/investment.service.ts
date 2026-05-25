import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AssetSearchResult,
  InvestmentsResponse,
  UpsertPositionPayload,
  TradeActionPayload,
  ImportPositionPayload,
} from '../models/investment.model';
import { environment } from '../../environments/environment';
import { PreferencesService } from './preferences.service';

@Injectable({
  providedIn: 'root',
})
export class InvestmentService {
  private readonly http = inject(HttpClient);
  private readonly preferencesService = inject(PreferencesService);
  private readonly apiBase = environment.apiUrl;

  getInvestments(portfolioId: number): Observable<InvestmentsResponse> {
    return this.http.get<InvestmentsResponse>(
      `${this.apiBase}/portfolios/${portfolioId}/investments`
    );
  }

  addInvestment(
    portfolioId: number,
    payload: UpsertPositionPayload
  ): Observable<unknown> {
    return this.http.post(
      `${this.apiBase}/portfolios/${portfolioId}/investments`,
      payload
    );
  }

  importPositions(
    portfolioId: number,
    positions: ImportPositionPayload[]
  ): Observable<{ message: string; count: number }> {
    return this.http.post<{ message: string; count: number }>(
      `${this.apiBase}/portfolios/${portfolioId}/investments/import`,
      { positions }
    );
  }

  buyInvestment(
    portfolioId: number,
    investmentId: number,
    payload: TradeActionPayload
  ): Observable<unknown> {
    return this.http.post(
      `${this.apiBase}/portfolios/${portfolioId}/investments/${investmentId}/buy`,
      payload
    );
  }

  sellInvestment(
    portfolioId: number,
    investmentId: number,
    payload: TradeActionPayload
  ): Observable<unknown> {
    return this.http.post(
      `${this.apiBase}/portfolios/${portfolioId}/investments/${investmentId}/sell`,
      payload
    );
  }

  searchAssets(query: string): Observable<AssetSearchResult[]> {
    return this.http.get<AssetSearchResult[]>(`${this.apiBase}/assets/search`, {
      params: { q: query },
    });
  }

  getHistoricalPrice(
    apiId: string,
    assetType: string,
    date: string
  ): Observable<{ price: number }> {
    const convertToEur = this.preferencesService.currency() === 'EUR' ? '1' : '0';

    return this.http.get<{ price: number }>(`${this.apiBase}/assets/history`, {
      params: {
        api_id: apiId,
        asset_type: assetType,
        date,
        convert_to_eur: convertToEur,
      },
    });
  }

  getTrades(portfolioId: number): Observable<unknown> {
    return this.http.get(`${this.apiBase}/portfolios/${portfolioId}/trades`);
  }
}