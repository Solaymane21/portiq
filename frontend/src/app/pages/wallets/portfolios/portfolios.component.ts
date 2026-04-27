import { Component, signal, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { PortfolioService } from '../../../services/portfolio.service';

@Component({
  selector: 'app-portfolios',
  imports: [ReactiveFormsModule],
  templateUrl: './portfolios.component.html',
  styleUrl: './portfolios.component.css'
})
export class PortfoliosComponent implements OnInit {
  private router = inject(Router); 
  private portfolioService = inject(PortfolioService);

  // Vistas List / Grid
  viewMode = signal<'list' | 'grid'>('list');

  // Modal Crear / Editar
  isModalOpen = signal(false);
  modoFormulario = signal<'create' | 'edit'>('create');

  // Modal Borrar
  isDeleteModalOpen = signal(false);

  misCarteras: any[] = [];
  carteraSeleccionada: any = null;

  //Cargar Carteras
  isLoading = signal(true); 

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

  cambiarVista(modo: 'list' | 'grid') {
    this.viewMode.set(modo);
    localStorage.setItem('vistaCarteras', modo);
  }

  abrirModalCrear() {
    this.modoFormulario.set('create');
    this.carteraSeleccionada = null;
    this.formularioCartera.reset({
      name: '',
      is_default: false,
      is_public: false
    });
    this.isModalOpen.set(true);
  }

  abrirModalEditar(cartera: any) {
    this.modoFormulario.set('edit');
    this.carteraSeleccionada = cartera;
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
    this.carteraSeleccionada = null;
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
          console.log(respuesta);
          this.cargarCarteras();
        },
        error: (err) => console.error('Error al crear cartera:', err)
      });
    } else if (this.carteraSeleccionada) {
      this.portfolioService.updatePortfolio(this.carteraSeleccionada.id, data).subscribe({
        next: (respuesta) => {
          this.cerrarModal();
          console.log(respuesta);
          this.cargarCarteras();
        },
        error: (err) => console.error('Error al actualizar cartera:', err)
      });
    }
  }

  abrirModalEliminar(cartera: any) {
    this.carteraSeleccionada = cartera;
    this.isDeleteModalOpen.set(true);
  }

  cerrarModalEliminar() {
    this.isDeleteModalOpen.set(false);
    this.carteraSeleccionada = null;
  }

  eliminarCartera() {
    if (!this.carteraSeleccionada) return;

    this.portfolioService.deletePortfolio(this.carteraSeleccionada.id).subscribe({
      next: () => {
        this.cerrarModalEliminar();
        this.cargarCarteras();
      },
      error: (err) => console.error('Error al eliminar cartera:', err)
    });
  }

  cargarCarteras() {
    this.isLoading.set(true); 

    this.portfolioService.getPortfolios().subscribe({
      next: (data) => {
        this.misCarteras = data as any[];
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar carteras', err);
        this.isLoading.set(false);
      }
    });
  }

  irACartera(carteraId: number) {
    this.router.navigate(['/app/wallets', carteraId]); 
  }

}
