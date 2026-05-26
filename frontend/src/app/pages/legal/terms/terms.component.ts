import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-terms',
  imports: [],
  templateUrl: './terms.component.html',
  styleUrl: './terms.component.css'
})
export class TermsComponent {
  isLoading = signal(false)

  // Vuelve a la página anterior
  goBack(): void {
    this.isLoading.set(true)
    window.history.back()
  }
}
