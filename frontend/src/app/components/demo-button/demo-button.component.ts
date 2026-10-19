import { Component, inject, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';

// Boton "Ver demo": entra en la cuenta demo sin registrarse
@Component({
  selector: 'app-demo-button',
  imports: [MatProgressSpinnerModule],
  templateUrl: './demo-button.component.html'
})
export class DemoButtonComponent {
  authService = inject(AuthService)

  // clases extra para adaptar el boton a cada pagina
  btnClass = input<string>('')
}
