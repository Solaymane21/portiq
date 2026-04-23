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

  getPortfolios() {
    return this.http.get(this.apiUrl);
  }
}