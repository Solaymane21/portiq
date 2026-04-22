import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Cartera } from '../../../../models/cartera.model';

@Component({
  selector: 'app-portfolio-delete-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './portfolio-delete-modal.component.html'
})
export class PortfolioDeleteModalComponent {
  @Input() cartera!: Cartera;
  
  @Output() cerrar = new EventEmitter<void>();
  @Output() confirmar = new EventEmitter<number>();

  nombreConfirmacionEliminar = signal('');

  confirmarEliminar() {
    if (this.nombreConfirmacionEliminar() !== this.cartera.name) {
      alert('El nombre no coincide.');
      return;
    }
    this.confirmar.emit(this.cartera.id);
  }
}