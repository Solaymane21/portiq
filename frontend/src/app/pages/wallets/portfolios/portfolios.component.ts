import { Component, signal, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { PortfolioService } from '../../../services/portfolio.service';
import { Portfolio } from '../../../models/portfolio.model';

@Component({
  selector: 'app-portfolios',
  imports: [ReactiveFormsModule],
  templateUrl: './portfolios.component.html',
  styleUrl: './portfolios.component.css'
})
export class PortfoliosComponent implements OnInit {
  private router = inject(Router); 
  private portfolioService = inject(PortfolioService);

  viewMode = signal<'list' | 'grid'>('list');
  isLoading = signal<boolean>(true); 

  // --- MODALES ---
  isModalOpen = signal<boolean>(false);
  modoFormulario = signal<'create' | 'edit'>('create');
  isDeleteModalOpen = signal<boolean>(false);

  // --- DATOS ---
  misCarteras = signal<Portfolio[]>([]);
  carteraSeleccionada = signal<Portfolio | null>(null);

  // --- FORMULARIO ---
  formularioCartera = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(50)]),
    is_default: new FormControl(false),
    is_public: new FormControl(false)
  });

  ngOnInit() {
    this.cargarCarteras();

    const guardado = localStorage.getItem('vistaCarteras');
    if (guardado === 'list' || guardado === 'grid') {
      this.viewMode.set(guardado);
    }
  }

  // --- VISTAS ---
  cambiarVista(modo: 'list' | 'grid') {
    this.viewMode.set(modo);
    localStorage.setItem('vistaCarteras', modo);
  }

  // --- LOGICA DE DATOS ---
  cargarCarteras() {
    this.isLoading.set(true); 

    this.portfolioService.getPortfolios().subscribe({
      next: (data) => {
        this.misCarteras.set(data as Portfolio[]);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar carteras', err);
        this.isLoading.set(false);
      }
    });
  }

  // --- CREAR/EDITAR ---
  abrirModalCrear() {
    this.modoFormulario.set('create');
    this.carteraSeleccionada.set(null);
    this.formularioCartera.reset({
      name: '',
      is_default: false,
      is_public: false
    });
    this.isModalOpen.set(true);
  }

  abrirModalEditar(cartera: Portfolio) {
    this.modoFormulario.set('edit');
    this.carteraSeleccionada.set(cartera);
    this.formularioCartera.reset({
      name: cartera.name,
      is_default: cartera.is_default,
      is_public: cartera.is_public
    });
    this.isModalOpen.set(true);
  }

  cerrarModal() {
    this.isModalOpen.set(false);
    this.formularioCartera.reset({
      name: '',
      is_default: false,
      is_public: false
    });
    this.carteraSeleccionada.set(null);
  }

  guardarCartera() {
    if (this.formularioCartera.invalid) return;

    const data = {
      name: this.formularioCartera.value.name!,
      is_default: this.formularioCartera.value.is_default!,
      is_public: this.formularioCartera.value.is_public!
    };

    if (this.modoFormulario() === 'create') {
      this.portfolioService.createPortfolio(data).subscribe({
        next: (respuesta) => {
          this.cerrarModal();
          this.cargarCarteras();
        },
        error: (err) => console.error('Error al crear cartera:', err)
      });
    } else {
      const seleccionada = this.carteraSeleccionada();
      if (seleccionada) {
        this.portfolioService.updatePortfolio(seleccionada.id, data).subscribe({
          next: (respuesta) => {
            this.cerrarModal();
            this.cargarCarteras();
          },
          error: (err) => console.error('Error al actualizar cartera:', err)
        });
      }
    }
  }

  // --- ELIMINAR ---
  abrirModalEliminar(cartera: Portfolio) {
    this.carteraSeleccionada.set(cartera);
    this.isDeleteModalOpen.set(true);
  }

  cerrarModalEliminar() {
    this.isDeleteModalOpen.set(false);
    this.carteraSeleccionada.set(null);
  }

  eliminarCartera() {
    const seleccionada = this.carteraSeleccionada();
    if (!seleccionada) return;

    this.portfolioService.deletePortfolio(seleccionada.id).subscribe({
      next: () => {
        this.cerrarModalEliminar();
        this.cargarCarteras();
      },
      error: (err) => console.error('Error al eliminar cartera:', err)
    });
  }

  // --- NAVEGACION ---
  irACartera(carteraId: number) {
    this.router.navigate(['/app/wallets', carteraId]); 
  }

}