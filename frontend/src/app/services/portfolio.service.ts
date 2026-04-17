import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Cartera } from '../models/cartera.model';

@Injectable({
  providedIn: 'root'
})
export class PortfolioService {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:8000/api/portfolios';

  getCarteras(): Observable<Cartera[]> {
    return this.http.get<Cartera[]>(this.apiUrl);
  }

  createCartera(payload: any): Observable<Cartera> {
    return this.http.post<Cartera>(this.apiUrl, payload);
  }

  updateCartera(id: number, payload: any): Observable<Cartera> {
    return this.http.put<Cartera>(`${this.apiUrl}/${id}`, payload);
  }

  deleteCartera(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

}