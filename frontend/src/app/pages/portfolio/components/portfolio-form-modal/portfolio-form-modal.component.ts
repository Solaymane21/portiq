import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-portfolio-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './portfolio-form-modal.component.html'
})
export class PortfolioFormModalComponent {
  @Input() esModoEdicion = false;
  @Input() set initialData(data: { name: string, is_public: boolean, is_default: boolean }) {
    this.formulario.set(data);
  }

  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<any>();

  formulario = signal({ name: '', is_public: false, is_default: false });

  actualizarNombre(nombre: string) {
    this.formulario.update(f => ({ ...f, name: nombre }));
  }

  actualizarIsPublic(isPublic: boolean) {
    this.formulario.update(f => ({ ...f, is_public: isPublic }));
  }

  actualizarIsDefault(isDefault: boolean) {
    this.formulario.update(f => ({ ...f, is_default: isDefault }));
  }

  guardarFormulario() {
    this.guardar.emit(this.formulario());
  }
}