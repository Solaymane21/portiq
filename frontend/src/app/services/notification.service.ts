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

getAll(){
    return this.http.get<AppNotification[]>(`${this.api}/notifications`);
}
markRead(id: number){
    return this.http.patch(`${this.api}/notifications/${id}/read`, {});
}
markAllRead(){
    return this.http.post(`${this.api}/notifications/read-all`, {});
}
}