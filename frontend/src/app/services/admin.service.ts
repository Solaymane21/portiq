import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminTable } from '../models/admin.model';

@Injectable({providedIn: 'root'})

export class AdminService{
    private apiUrl = 'http://localhost:8000/api/admin/users';

    constructor(private http: HttpClient) {}

    getUsers(): Observable<AdminTable[]> {
        return this.http.get<AdminTable[]>(this.apiUrl);
  }
}