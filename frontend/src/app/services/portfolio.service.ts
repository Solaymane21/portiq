import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PortfolioService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8000/api/portfolios'; 

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token'); 
    
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  createPortfolio(data: { name: string, is_default: boolean, is_public: boolean }): Observable<any> {
    return this.http.post<any>(this.apiUrl, data, { headers: this.getAuthHeaders() });
  }

  getPortfolios(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, { headers: this.getAuthHeaders() });
  }
}