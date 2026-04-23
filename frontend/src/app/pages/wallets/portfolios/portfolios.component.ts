import { Component, signal, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { PortfolioService } from '../../../services/portfolio.service';

@Component({
  selector: 'app-portfolios',
  imports: [ReactiveFormsModule],
  templateUrl: './portfolios.component.html',
  styleUrl: './portfolios.component.css'
})
export class PortfoliosComponent implements OnInit {
  //Vistas List / Grid
  viewMode = signal<'list' | 'grid'>('list');

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

  //CRUD Porfolios
  private portfolioService = inject(PortfolioService);

  formularioCartera = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(50)]),
    is_default: new FormControl(false),
    is_public: new FormControl(false)
  });

  isModalOpen = signal(false);
  misCarteras: any[] = [];

  abrirModal() {
    this.isModalOpen.set(true);
  }

  cerrarModal() {
    this.isModalOpen.set(false);
  }

  crearCartera() {
    if (this.formularioCartera.invalid) return;

    const data = {
      name: this.formularioCartera.value.name!,
      is_default: this.formularioCartera.value.is_default!,
      is_public: this.formularioCartera.value.is_public!
    };

    this.portfolioService.createPortfolio(data).subscribe({
      next: (respuesta) => {
        this.cerrarModal();
        console.log(respuesta);
        this.cargarCarteras();
      },
      error: (err) => console.error("Error al crear cartera:", err)
    });
  }

  cargarCarteras() {
    this.portfolioService.getPortfolios().subscribe({
      next: (data) => {
        this.misCarteras = data as any[];
        console.log("Carteras descargadas:", this.misCarteras);
      },
      error: (err) => console.error("Error al cargar carteras", err)
    });
  }

}
