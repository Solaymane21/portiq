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
  // --- 1. DEPENDENCIAS ---
  private router = inject(Router);
  private portfolioService = inject(PortfolioService);

  // --- 2. ESTADO (SIGNALS) ---
  viewMode = signal<'list' | 'grid'>('list');
  isLoading = signal(true);
  isSubmitting = signal(false);
  isModalOpen = signal(false);
  isDeleteModalOpen = signal(false);
  modoFormulario = signal<'create' | 'edit'>('create');

  misCarteras = signal<Portfolio[]>([]);
  carteraSeleccionada = signal<Portfolio | null>(null);

  // --- 3. FORMULARIOS ---
  formularioCartera = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(50)]),
    is_default: new FormControl(false),
    is_public: new FormControl(false)
  });

  // --- 4. INICIALIZACION ---
  ngOnInit() {
    this.cargarPreferenciasVista();
    this.cargarCarteras();
  }

  // --- 5. PETICIONES A LA API ---
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

  guardarCartera() {
    if (this.formularioCartera.invalid) return;

    const data = {
      name: this.formularioCartera.value.name!,
      is_default: this.formularioCartera.value.is_default!,
      is_public: this.formularioCartera.value.is_public!
    };

    const peticion$ = this.modoFormulario() === 'create'
      ? this.portfolioService.createPortfolio(data)
      : this.portfolioService.updatePortfolio(this.carteraSeleccionada()!.id, data);

    this.isSubmitting.set(true); // ← NUEVO
    peticion$.subscribe({
      next: () => {
        this.isSubmitting.set(false); // ← NUEVO
        this.cerrarModal();
        this.cargarCarteras();
      },
      error: (err) => {
        console.error('Error al guardar cartera:', err);
        this.isSubmitting.set(false); // ← NUEVO
      }
    });
  }

  eliminarCartera() {
    const seleccionada = this.carteraSeleccionada();
    if (!seleccionada) return;

    this.isSubmitting.set(true); // ← NUEVO
    this.portfolioService.deletePortfolio(seleccionada.id).subscribe({
      next: () => {
        this.isSubmitting.set(false); // ← NUEVO
        this.cerrarModalEliminar();
        this.cargarCarteras();
      },
      error: (err) => {
        console.error('Error al eliminar cartera:', err);
        this.isSubmitting.set(false); // ← NUEVO
      }
    });
  }

  // --- 6. EVENTOS DE LA INTERFAZ Y MODALES ---
  cambiarVista(modo: 'list' | 'grid') {
    this.viewMode.set(modo);
    localStorage.setItem('vistaCarteras', modo);
  }

  abrirModalCrear() {
    this.prepararModal('create', null);
  }

  abrirModalEditar(cartera: Portfolio) {
    this.prepararModal('edit', cartera);
  }

  cerrarModal() {
    this.isModalOpen.set(false);
    this.carteraSeleccionada.set(null);
  }

  abrirModalEliminar(cartera: Portfolio) {
    this.carteraSeleccionada.set(cartera);
    this.isDeleteModalOpen.set(true);
  }

  cerrarModalEliminar() {
    this.isDeleteModalOpen.set(false);
    this.carteraSeleccionada.set(null);
  }

  irACartera(carteraId: number) {
    this.router.navigate(['/app/wallets', carteraId]);
  }

  // --- 7. MÉTODOS PRIVADOS AUXILIARES ---
  private cargarPreferenciasVista() {
    const guardado = localStorage.getItem('vistaCarteras');
    if (guardado === 'list' || guardado === 'grid') {
      this.viewMode.set(guardado);
    }
  }

  private prepararModal(modo: 'create' | 'edit', cartera: Portfolio | null) {
    this.modoFormulario.set(modo);
    this.carteraSeleccionada.set(cartera);
    this.formularioCartera.reset({
      name: cartera ? cartera.name : '',
      is_default: cartera ? cartera.is_default : false,
      is_public: cartera ? cartera.is_public : false
    });
    this.isModalOpen.set(true);
  }
}
