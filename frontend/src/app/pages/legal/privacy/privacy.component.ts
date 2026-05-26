import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-privacy',
  imports: [],
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.css'
})
export class PrivacyComponent {
  isLoading = signal(false)

  // Vuelve a la página anterior
  goBack(): void {
    this.isLoading.set(true)
    window.history.back()
  }
}
