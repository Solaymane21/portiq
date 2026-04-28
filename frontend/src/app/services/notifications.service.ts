import { computed, Injectable, signal } from '@angular/core';
import { Toast } from '../models/toast.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {

  private _toasts = signal<Toast[]>([]);
  toasts = computed(() => this._toasts());

  show(msg: string, type: Toast['type'] = 'info', duration = 5000): void {
    const id = crypto.randomUUID();
    const toast: Toast = { id, msg, type, duration };

    this._toasts.update(list => [...list, toast]);

    setTimeout(() => this.dismiss(id), duration);
  }

  dismiss(id: string): void {
    this._toasts.update(list => list.filter(t => t.id !== id));
  }

  success(msg: string, duration?: number) {
    this.show(msg, 'success', duration);
  }

  error(msg: string, duration?: number) {
    this.show(msg, 'error',   duration);
  }

  warning(msg: string, duration?: number) {
    this.show(msg, 'warning', duration);
  }

  info(msg: string, duration?: number) {
    this.show(msg, 'info',    duration);
  }
}
