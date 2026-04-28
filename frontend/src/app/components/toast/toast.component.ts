import { Component, inject, } from '@angular/core';
import { NgClass } from '@angular/common';
import { Toast } from '../../models/toast.model';
import { NotificationsService } from '../../services/notifications.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [NgClass],
  templateUrl: './toast.component.html'
})
export class ToastComponent {
  notificationService = inject(NotificationsService);
  toasts = this.notificationService.toasts;

  dismiss(id: string) {
    this.notificationService.dismiss(id);
  }

  trackById(_: number, toast: Toast): string {
    return toast.id;
  }
}
