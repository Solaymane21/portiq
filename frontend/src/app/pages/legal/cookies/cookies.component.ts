import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-cookies',
  imports: [],
  templateUrl: './cookies.component.html',
  styleUrl: './cookies.component.css'
})
export class CookiesComponent {
  isLoading = signal(false)

  // Vuelve a la página anterior
  goBack(): void {
    this.isLoading.set(true)
    window.history.back()
  }
}
