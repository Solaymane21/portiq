import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface AppNotification {
  id: number;        
  title: string; 
  message: string; 
  is_read: boolean;    
  created_at: string;   
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);  
  private api  = environment.apiUrl;  

  // Obtiene todas las notificaciones del usuario
  getAll() {
    return this.http.get<AppNotification[]>(`${this.api}/notifications`);
  }

  // Marca una notificación específica como leída
  markRead(id: number) {
    return this.http.patch(`${this.api}/notifications/${id}/read`, {});
  }

  // Marca TODAS las notificaciones como leídas de una vez
  markAllRead() {
    return this.http.post(`${this.api}/notifications/read-all`, {});
  }
}