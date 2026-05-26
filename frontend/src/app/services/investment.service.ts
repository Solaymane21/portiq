import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AssetSearchResult, ImportPositionPayload, InvestmentsResponse, TradeActionPayload, UpsertPositionPayload } from '../models/investment.model';

import { environment } from '../../environments/environment';
import { PreferencesService } from './preferences.service';

@Injectable({
  providedIn: 'root',
})
export class InvestmentService {
  private readonly http = inject(HttpClient);
  private readonly preferencesService = inject(PreferencesService);
  private readonly apiUrl = environment.apiUrl;

  // Sacamos una cartera con sus inversiones
  getInvestments(portfolioId: number): Observable<InvestmentsResponse> {
    return this.http.get<InvestmentsResponse>(`${this.apiUrl}/portfolios/${portfolioId}/investments`);
  }

  // Creamos una posicion nueva
  addInvestment(portfolioId: number, payload: UpsertPositionPayload): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/portfolios/${portfolioId}/investments`, payload);
  }

  // Importamos varias posiciones de golpe
  importPositions(portfolioId: number, positions: ImportPositionPayload[]): Observable<{ message: string; count: number }> {
    return this.http.post<{ message: string; count: number }>(
      `${this.apiUrl}/portfolios/${portfolioId}/investments/import`,
      { positions }
    );
  }

  // Registramos una compra
  buyInvestment(portfolioId: number, investmentId: number, payload: TradeActionPayload): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/portfolios/${portfolioId}/investments/${investmentId}/buy`, payload);
  }

  // Registramos una venta
  sellInvestment(portfolioId: number, investmentId: number, payload: TradeActionPayload): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/portfolios/${portfolioId}/investments/${investmentId}/sell`, payload);
  }

  // Buscamos activos por texto
  searchAssets(query: string): Observable<AssetSearchResult[]> {
    return this.http.get<AssetSearchResult[]>(`${this.apiUrl}/assets/search`, { params: { q: query } });
  }

  // Pedimos el precio historico con la moneda elegida
  getHistoricalPrice(apiId: string, assetType: string, date: string): Observable<{ price: number }> {
    const convertToEur = this.preferencesService.currency() === 'EUR' ? '1' : '0';

    return this.http.get<{ price: number }>(`${this.apiUrl}/assets/history`, {
      params: { api_id: apiId, asset_type: assetType, date, convert_to_eur: convertToEur },
    });
  }

  // Sacamos el historial de operaciones
  getTrades(portfolioId: number): Observable<unknown> {
    return this.http.get(`${this.apiUrl}/portfolios/${portfolioId}/trades`);
  }
}