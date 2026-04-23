import { inject, Injectable } from '@angular/core';
import { HttpClient} from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class PortfolioService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8000/api/portfolios'; 

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

}