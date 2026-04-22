import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cartera } from '../../../../models/cartera.model';

@Component({
  selector: 'app-portfolio-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portfolio-card.component.html'
})
export class PortfolioCardComponent {
  @Input() cartera!: Cartera;
  @Input() cardLayoutClass: string = '';
  @Input() optionsContainerClass: string = '';

  @Output() open = new EventEmitter<number>();
  @Output() edit = new EventEmitter<Cartera>();
  @Output() delete = new EventEmitter<Cartera>();
}