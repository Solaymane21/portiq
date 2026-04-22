import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PortfolioService } from '../../../services/portfolio.service';
import { Cartera } from '../../../models/cartera.model';
import { PortfolioCardComponent } from '../components/portfolio-card/portfolio-card.component';
import { PortfolioFormModalComponent } from '../components/portfolio-form-modal/portfolio-form-modal.component';
import { PortfolioDeleteModalComponent } from '../components/portfolio-delete-modal/portfolio-delete-modal.component';

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule, PortfolioCardComponent, PortfolioFormModalComponent, PortfolioDeleteModalComponent],
  templateUrl: './portfolio-list.component.html'
})
export class PortfolioComponent implements OnInit {
  private portfolioService = inject(PortfolioService);
  private router = inject(Router);

  listaCarteras = signal<Cartera[]>([]);
  viewMode = signal<'list' | 'grid'>('list');
  cargando = signal(true);

  mostrarModal = signal(false);
  carteraActual = signal<Cartera | null>(null);
  carteraAEliminar = signal<Cartera | null>(null);

  ngOnInit() {
    this.cargarCarteras();
  }

  irAlDetalle(id: number) {
    this.router.navigate(['/app/portfolios', id]);
  }

  cargarCarteras() {
    this.cargando.set(true);
    this.portfolioService.getCarteras().subscribe({
      next: (data) => {
        this.listaCarteras.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar:', err);
        this.cargando.set(false);
      }
    });
  }

  abrirModal(cartera?: Cartera) {
    this.carteraActual.set(cartera || null);
    this.mostrarModal.set(true);
  }

  guardarFormulario(payload: any) {
    const id = this.carteraActual()?.id;
    const request = id 
      ? this.portfolioService.updateCartera(id, payload)
      : this.portfolioService.createCartera(payload);

    request.subscribe({
      next: () => {
        this.cargarCarteras();
        this.mostrarModal.set(false);
      },
      error: (err) => console.error('Error al guardar:', err)
    });
  }

  confirmarEliminar(id: number) {
    this.portfolioService.deleteCartera(id).subscribe({
      next: () => {
        this.listaCarteras.update(c => c.filter(item => item.id !== id));
        this.carteraAEliminar.set(null);
      },
      error: (err) => console.error('Error al eliminar:', err)
    });
  }
}