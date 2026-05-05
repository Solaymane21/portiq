import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { FavoritesService } from './favorites.service';
import { map, Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InitialDataService {

  private http = inject(HttpClient);
  private favoritesService = inject(FavoritesService);

  private apiUrl = 'http://localhost:8000/api';

  ready = signal<boolean>(false);

  run(): Observable<void> {
    return this.http.get<any>(`${this.apiUrl}/initial-data`).pipe(
      tap((data) => {
        if (data.favorites) this.favoritesService.hydrate(data.favorites);
        this.ready.set(true);
      }),
      map(() => void 0)
    );
  }

}
