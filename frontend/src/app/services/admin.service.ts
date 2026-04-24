import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({providedIn: 'root'})

export class AdminService{
    private apiUrl = 'http://localhost:8000/api/admin/users';

    constructor(private http: HttpClient) {}

    getUsers(): Observable<User[]> {
        return this.http.get<User[]>(this.apiUrl);
  }
}
