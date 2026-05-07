import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Alert {
  id: number;
  symbol: string;
  name: string;
  asset_type: string;
  image_url: string | null;
  target_price: number;
  condition: 'above' | 'below';
  is_active: boolean;
  created_at: string;
}

export interface SymbolResult {
  symbol: string;
  name: string;
  asset_type: string;
  api_id: string | null;
  image_url: string | null;
}

@Injectable({ providedIn: 'root' })
export class AlertsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/alerts`;

  getAlerts(): Observable<Alert[]> {
    return this.http.get<Alert[]>(this.base);
  }

  createAlert(payload: {
    symbol: string;
    name: string;
    asset_type: string;
    api_id: string | null;
    image_url: string | null;
    target_price: number;
    condition: 'above' | 'below';
  }): Observable<Alert> {
    return this.http.post<Alert>(this.base, payload);
  }

  updateAlert(id: number, data: Partial<Pick<Alert, 'target_price' | 'condition' | 'is_active'>>): Observable<Alert> {
    return this.http.put<Alert>(`${this.base}/${id}`, data);
  }

  deleteAlert(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  searchSymbols(query: string): Observable<SymbolResult[]> {
    return this.http.get<SymbolResult[]>(`${environment.apiUrl}/assets/search`, {
      params: { q: query }
    });
  }
}