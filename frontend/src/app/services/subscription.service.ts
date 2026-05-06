import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { NotificationsService } from './notifications.service';
import { environment } from '../../environments/environment';

export interface SubscriptionStatus {
  is_subscribed: boolean;
  plan: 'free' | 'premium';
  ends_at: string | null;
  on_grace: boolean;
  next_billing_date: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {

  http = inject(HttpClient);
  notification = inject(NotificationsService);
  apiUrl = environment.apiUrl;

  isLoading = signal(false);
  isCancelling = signal(false);
  status = signal<SubscriptionStatus | null>(null);

  getStatus() {
    this.isLoading.set(true);
    this.http.get<SubscriptionStatus>(`${this.apiUrl}/subscription/status`).subscribe({
      next: (res) => {
        this.status.set(res)
        this.isLoading.set(false)
      },
      error: ()    => {
        this.notification.error('No se pudo cargar el estado de la suscripción');
        this.isLoading.set(false);
      }
    });
  }

  checkout() {
    this.isLoading.set(true);
    this.http.post<{ url: string }>(`${this.apiUrl}/subscription/checkout`, {}).subscribe({
      next: (res) => { window.location.href = res.url; },
      error: ()   => {
        this.notification.error('Error al iniciar el pago');
        this.isLoading.set(false);
      }
    });
  }

  cancel(onSuccess: () => void) {
    this.isCancelling.set(true);
    this.http.post<{ message: string }>(`${this.apiUrl}/subscription/cancel`, {}).subscribe({
      next: (res) => {
        this.notification.warning(res.message);
        this.getStatus();
        this.isCancelling.set(false);
        onSuccess();
      },
      error: () => {
        this.notification.error('Error al cancelar la suscripción');
        this.isCancelling.set(false);
      }
    });
  }

  portal() {
    this.isLoading.set(true);
    this.http.get<{ url: string }>(`${this.apiUrl}/subscription/portal`).subscribe({
      next: (res) => { window.location.href = res.url; },
      error: ()   => {
        this.notification.error('Error al abrir el portal de facturación');
        this.isLoading.set(false);
      }
    });
  }

  resume(onSuccess: () => void) {
    this.isLoading.set(true);
    this.http.post<{ message: string }>(`${this.apiUrl}/subscription/resume`, {}).subscribe({
      next: (res) => {
        this.notification.success(res.message);
        this.getStatus();
        this.isLoading.set(false);
        onSuccess();
      },
      error: () => {
        this.notification.error('Error al reanudar la suscripción');
        this.isLoading.set(false);
      }
    });
  }

}
