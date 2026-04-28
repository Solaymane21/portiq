import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class InvestmentService {
  private http = inject(HttpClient);
  
  private apiUrl = 'http://localhost:8000/api/portfolios'; 

  getInvestments(portfolioId: number) {
    return this.http.get(`${this.apiUrl}/${portfolioId}/investments`);
  }

  addInvestment(portfolioId: number, data: { symbol: string, quantity: number, avg_buy_price: number }) {
    return this.http.post(`${this.apiUrl}/${portfolioId}/investments`, data);
  }

  updateInvestment(portfolioId: number, investmentId: number, data: { quantity: number, avg_buy_price: number }) {
    return this.http.put(`${this.apiUrl}/${portfolioId}/investments/${investmentId}`, data);
  }

  deleteInvestment(portfolioId: number, investmentId: number) {
    return this.http.delete(`${this.apiUrl}/${portfolioId}/investments/${investmentId}`);
  }
}