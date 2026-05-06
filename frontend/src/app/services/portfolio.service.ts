import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class PortfolioService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/portfolios`;

  createPortfolio(data: { name: string, is_default: boolean, is_public: boolean }) {
    return this.http.post<any>(this.apiUrl, data);
  }

  updatePortfolio(id: number, data: { name: string, is_default: boolean, is_public: boolean }) {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  deletePortfolio(id: number) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getPortfolios() {
    return this.http.get(this.apiUrl);
  }

  getPublicRanking(sort: string, order: string, q?: string) {
    const params: Record<string, string> = { sort, order };
    const query = q?.trim();
    if (query) {
      params['q'] = query;
    }
    return this.http.get(`${this.apiUrl}/public`, { params });
  }
}
