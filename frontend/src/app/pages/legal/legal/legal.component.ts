import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-legal',
  imports: [],
  templateUrl: './legal.component.html',
  styleUrl: './legal.component.css'
})
export class LegalComponent {
  isLoading = signal(false)

  // Vuelve a la página anterior
  goBack(): void {
    this.isLoading.set(true)
    window.history.back()
  }
}
