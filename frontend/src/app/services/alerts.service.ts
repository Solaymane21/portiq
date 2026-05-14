import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap} from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { NotificationsService } from './notifications.service';

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
  private notificationService = inject(NotificationsService);

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
    return this.http.post<Alert>(this.base, payload).pipe(
      tap({
        next: (alert) => this.notificationService.success(`Alerta creada para ${alert.name} (${alert.symbol})`),
        error: () => this.notificationService.error('No se pudo crear la alerta')
      })
    );
  }

  updateAlert(id: number, data: Partial<Pick<Alert, 'target_price' | 'condition' | 'is_active'>>): Observable<Alert> {
    return this.http.patch<Alert>(`${this.base}/${id}`, data).pipe(
      tap({
        next: () => this.notificationService.success('Alerta actualizada correctamente'),
        error: () => this.notificationService.error('No se pudo actualizar la alerta')
      })
    );
  }

  deleteAlert(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`).pipe(
      tap({
        next: ()=>this.notificationService.success('Alerta borrada correctamente'),
        error: () =>this.notificationService.error('No se pudo borrar la alerta')
      })
    )
  }

  searchSymbols(query: string): Observable<SymbolResult[]> {
    return this.http.get<SymbolResult[]>(`${environment.apiUrl}/assets/search`, {
      params: { q: query }
    });
  }

  getCurrentPrices(symbols: string, assetTypes: string): Observable<any[]> {
    return this.http.get<any>(`${environment.apiUrl}/prices`, {
      params: { symbols, asset_types: assetTypes }
    }).pipe(
      map(res => res.results ?? [])
    );
  }
}