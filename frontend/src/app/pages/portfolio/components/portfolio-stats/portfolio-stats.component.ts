import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-portfolio-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portfolio-stats.component.html'
})
export class PortfolioStatsComponent {
  @Input() cargando = true;
  @Input() valorTotal = 0;
  @Input() ganancias = 0;
  @Input() porcentajeGanancias = 0;
  @Input() totalPosiciones = 0;
}