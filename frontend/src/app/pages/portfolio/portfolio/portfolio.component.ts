import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PortfolioService } from '../../../services/portfolio.service';
import { Cartera } from '../../../models/cartera.model';
import { PortfolioCardComponent } from './components/portfolio-card/portfolio-card.component';
import { PortfolioFormModalComponent } from './components/portfolio-form-modal/portfolio-form-modal.component';
import { PortfolioDeleteModalComponent } from './components/portfolio-delete-modal/portfolio-delete-modal.component';

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule, PortfolioCardComponent, PortfolioFormModalComponent, PortfolioDeleteModalComponent],
  templateUrl: './portfolio.component.html',
  styleUrl: './portfolio.component.css'
})
export class PortfolioComponent implements OnInit {
  private portfolioService = inject(PortfolioService);
  private router = inject(Router);

  listaCarteras = signal<Cartera[]>([]);
  viewMode = signal<'list' | 'grid'>('list');
  cargando = signal(true);

  mostrarModal = signal(false);
  esModoEdicion = signal(false);
  carteraActualId = signal<number | null>(null);
  formulario = signal({ name: '', is_public: false, is_default: false });

  mostrarModalEliminar = signal(false);
  carteraAEliminar = signal<Cartera | null>(null);

  containerClass = computed(() =>
    this.viewMode() === 'list'
      ? 'flex flex-col gap-2'
      : 'grid grid-cols-2 md:grid-cols-3 gap-3'
  );

  btnListClass = computed(() =>
    `p-2 rounded-md transition-colors duration-200 ${
      this.viewMode() === 'list' ? 'bg-orange-500' : 'bg-neutral-800'
    }`
  );

  btnGridClass = computed(() =>
    `p-2 rounded-md transition-colors duration-200 ${
      this.viewMode() === 'list' ? 'bg-neutral-800' : 'bg-orange-500'
    }`
  );

  cardLayoutClass = computed(() =>
    this.viewMode() === 'list'
      ? 'flex flex-row items-center gap-4 justify-between relative'
      : 'flex flex-col items-start gap-3 relative'
  );

  optionsContainerClass = computed(() =>
    this.viewMode() === 'list'
      ? 'group relative shrink-0 ml-auto'
      : 'group absolute top-4 right-4'
  );

  ngOnInit() {
    this.cargarCarteras();
  }

  irAlDetalle(carteraId: number) {
    this.router.navigate(['/app/portfolios', carteraId]);
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

  abrirModalCrear() {
    this.esModoEdicion.set(false);
    this.carteraActualId.set(null);
    this.formulario.set({ name: '', is_public: false, is_default: false });
    this.mostrarModal.set(true);
  }

  abrirModalEditar(cartera: Cartera) {
    this.esModoEdicion.set(true);
    this.carteraActualId.set(cartera.id);
    this.formulario.set({
      name: cartera.name,
      is_public: Boolean(cartera.is_public),
      is_default: Boolean(cartera.is_default)
    });
    this.mostrarModal.set(true);
  }

  cerrarModal() {
    this.mostrarModal.set(false);
  }

  guardarFormulario(payload: any) {
    const id = this.carteraActualId();
    
    if (this.esModoEdicion() && id !== null) {
      this.portfolioService.updateCartera(id, payload).subscribe({
        next: () => {
          this.cargarCarteras();
          this.cerrarModal();
        },
        error: (err) => console.error('Error al editar:', err)
      });
    } else {
      this.portfolioService.createCartera(payload).subscribe({
        next: () => {
          this.cargarCarteras();
          this.cerrarModal();
        },
        error: (err) => console.error('Error al crear:', err)
      });
    }
  }

  abrirModalEliminar(cartera: Cartera) {
    this.carteraAEliminar.set(cartera);
    this.mostrarModalEliminar.set(true);
  }

  cerrarModalEliminar() {
    this.mostrarModalEliminar.set(false);
    this.carteraAEliminar.set(null);
  }

  confirmarEliminar(id: number) {
    this.portfolioService.deleteCartera(id).subscribe({
      next: () => {
        this.listaCarteras.update(carteras => carteras.filter(c => c.id !== id));
        this.cerrarModalEliminar();
      },
      error: (err) => console.error('Error al eliminar:', err)
    });
  }
}