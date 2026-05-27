import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PortfolioService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/portfolios`;

  // Creamos una cartera nueva
  createPortfolio(data: { name: string; is_default: boolean; is_public: boolean }) {
    return this.http.post<any>(this.apiUrl, data);
  }

  // Actualizamos una cartera
  updatePortfolio(id: number, data: { name: string; is_default: boolean; is_public: boolean }) {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  // Borramos una cartera
  deletePortfolio(id: number) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Sacamos las carteras del usuario
  getPortfolios() {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Sacamos el ranking publico y añadimos busqueda si viene texto
  getPublicRanking(sort: string, order: string, q?: string) {
    const params: Record<string, string> = { sort, order };
    const query = q?.trim();

    if (query) {
      params['q'] = query;
    }

    return this.http.get(`${this.apiUrl}/public`, { params });
  }

  // Seguimos una cartera publica
  followPortfolio(portfolioId: number) {
    return this.http.post(`${this.apiUrl}/${portfolioId}/follow`, {});
  }

  // Dejamos de seguir una cartera
  unfollowPortfolio(portfolioId: number) {
    return this.http.delete(`${this.apiUrl}/${portfolioId}/unfollow`);
  }
}