import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {
  private router = inject(Router);
  public rutaActiva: string = 'dashboard';

  ngOnInit() {
    this.actualizarRuta(this.router.url);

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.actualizarRuta(event.urlAfterRedirects);
    });
  }

  private actualizarRuta(url: string) {
    switch (url) {
      case '/app/dashboard':
        this.rutaActiva = 'dashboard';
        break;
      case '/app/portfolios':
        this.rutaActiva = 'carteras';
        break;
      case '/app/favorites':
        this.rutaActiva = 'favoritos';
        break;
      case '/app/investor-profile':
        this.rutaActiva = 'perfil-inversor';
        break;
      case '/app/ranking':
        this.rutaActiva = 'ranking';
        break;
      case '/app/settings':
        this.rutaActiva = 'configuracion';
        break;
    }
    console.log(this.rutaActiva);
  }
}
