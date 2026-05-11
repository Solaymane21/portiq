import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { InitialDataService } from './services/initial-data.service';
import { Title } from '@angular/platform-browser';
import { filter, map } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  private authService = inject(AuthService);
  private initialDataService = inject(InitialDataService);
  private router = inject(Router);
  private title = inject(Title);

  ngOnInit(): void {
    this.authService.refreshUser().subscribe({
      next: (user) => {
        if (user && !this.initialDataService.ready()) {
          this.initialDataService.run().subscribe();
        }
      }
    });

    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        map(() => this.router.routerState.snapshot.root),
        map(route => {
          while (route.firstChild) route = route.firstChild;
          return route;
        })
      )
      .subscribe(route => {
        const title = route.data?.['title'] || 'PortIQ';
        this.title.setTitle(`PortIQ | ${title}`);
      });
  }
}
