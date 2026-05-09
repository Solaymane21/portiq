import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { InitialDataService } from './services/initial-data.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'PortIQ';

  private authService = inject(AuthService);
  private initialDataService = inject(InitialDataService);

  ngOnInit(): void {
    this.authService.refreshUser().subscribe();

    if (this.authService.currentUser() && !this.initialDataService.ready()) {
      this.initialDataService.run().subscribe();
    }
  }
}
