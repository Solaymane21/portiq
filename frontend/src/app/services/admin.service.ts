import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminUsersResponse, User } from '../models/user.model';
import { SubscriptionService } from './subscription.service';

@Injectable({providedIn: 'root'})

export class AdminService{
    private apiUrl = 'http://localhost:8000/api/admin/users';

    http = inject(HttpClient)
    subscriptionService = inject(SubscriptionService)
    isLoading = signal<boolean>(false)

    getUsers(): Observable<AdminUsersResponse[]> {
        return this.http.get<AdminUsersResponse[]>(this.apiUrl);
    }

    deleteUser(id: User['id']) {
        return this.http.delete<User[]>(`${this.apiUrl}/${id}`);
    }

    cancelSubscription(userId: number) {
        return this.http.post(`${this.apiUrl}/${userId}/subscription/cancel`, {})
    }

    resumeSubscription(userId: number) {
        return this.http.post(`${this.apiUrl}/${userId}/subscription/resume`, {});
    }
}
