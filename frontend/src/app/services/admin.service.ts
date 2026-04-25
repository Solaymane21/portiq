import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({providedIn: 'root'})

export class AdminService{
    private apiUrl = 'http://localhost:8000/api/admin/users';

    http = inject(HttpClient)
    isLoading = signal<boolean>(false)

    getUsers(): Observable<User[]> {
        return this.http.get<User[]>(this.apiUrl);
    }

    deleteUser(id: User['id']) {
        return this.http.delete<User[]>(`${this.apiUrl}/${id}`);
    }
}
