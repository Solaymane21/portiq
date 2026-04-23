import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortfolioService } from '../../../services/portfolio.service';

@Component({
  selector: 'app-portfolios',
  imports: [CommonModule, FormsModule],
  templateUrl: './portfolios.component.html',
  styleUrl: './portfolios.component.css'
})
export class PortfoliosComponent implements OnInit {
  //Vistas List / Grid
  viewMode = signal<'list' | 'grid'>('list');

  ngOnInit() {
    const guardado = localStorage.getItem('vistaCarteras');
    
    if (guardado === 'list' || guardado === 'grid') {
      this.viewMode.set(guardado);
    }
  }

  cambiarVista(modo: 'list' | 'grid') {
    this.viewMode.set(modo);
    localStorage.setItem('vistaCarteras', modo);
  }

  //Boton Crear Portfolio
  private portfolioService = inject(PortfolioService);

  isModalOpen = signal(false);
  nombreCartera = signal('');
  esDefault = signal(false);
  esPublica = signal(false);

  abrirModal() {
    this.nombreCartera.set('');
    this.esDefault.set(false);
    this.esPublica.set(false);
    this.isModalOpen.set(true);
  }

  cerrarModal() {
    this.isModalOpen.set(false);
  }

  crearCartera() {
    const nombre = this.nombreCartera().trim();
    if (!nombre) return;

    const datosCartera = {
      name: nombre,
      is_default: this.esDefault(),
      is_public: this.esPublica()
    };

    this.portfolioService.createPortfolio(datosCartera).subscribe({
      next: (nueva) => {
        this.cerrarModal();
        console.log(nueva.message);
        console.log(nueva.portfolio)
      },
      error: (err) => console.error('Error:', err)
    });
  }

}
