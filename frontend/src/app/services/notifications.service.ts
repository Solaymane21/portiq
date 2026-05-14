import { computed, Injectable, signal } from '@angular/core';
import { Toast } from '../models/toast.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {

  toasts = signal<Toast[]>([]);

  // añade un toast a la lista y lo elimina automaticamente al expirar
  show(msg: string, type: Toast['type'] = 'info', duration = 3000): void {
    const id = crypto.randomUUID();
    const toast: Toast = { id, msg, type, duration };

    this.toasts.update(list => [...list, toast]);

    setTimeout(() => this.dismiss(id), duration);
  }

  // elimina un toast por su id
  dismiss(id: string): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
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
