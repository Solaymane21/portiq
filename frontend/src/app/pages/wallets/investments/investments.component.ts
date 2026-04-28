import { Component, signal, inject, OnInit, effect, viewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NgClass, DecimalPipe, SlicePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InvestmentService } from '../../../services/investment.service';

import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';

@Component({
  selector: 'app-investments',
  standalone: true,
  // 1. Añadimos ReactiveFormsModule y quitamos CommonModule
  imports: [NgClass, DecimalPipe, SlicePipe, ReactiveFormsModule, MatTableModule, MatSortModule, MatPaginatorModule],
  templateUrl: './investments.component.html',
  styleUrl: './investments.component.css'
})
export class InvestmentsComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private investmentService = inject(InvestmentService);

  portfolioId = signal<number | null>(null);

  // --- VARIABLES UI CONECTADAS AL BACKEND ---
  cargando = signal<boolean>(true);
  nombreCartera = signal<string>('Cargando...');
  valorTotal = signal<number>(0);
  ganancias = signal<number>(0);
  porcentajeGanancias = signal<number>(0);
  totalPosiciones = signal<number>(0);

  // --- CONFIGURACIÓN DE TABLA MATERIAL ---
  dataSource = new MatTableDataSource<any>([]);
  paginator = viewChild(MatPaginator);
  sort = viewChild(MatSort);

  columnasDef = [
    { def: 'simbolo', title: 'Activo', align: 'left' },
    { def: 'peso', title: 'Peso', align: 'right' },
    { def: 'retorno7d', title: '7D retorno', align: 'right' },
    { def: 'valor', title: 'Valor', align: 'right' },
    { def: 'acciones', title: 'Acciones', align: 'right' }
  ];
  displayedColumns: string[] = [...this.columnasDef.map(c => c.def), 'opciones'];

  // --- ESTADO DEL MODAL NUEVA POSICIÓN ---
  modalAbierto = signal<boolean>(false);
  guardando = signal<boolean>(false);
  
  posicionForm: FormGroup = this.fb.group({
    ticker: ['', [Validators.required, Validators.maxLength(10)]],
    quantity: [null, [Validators.required, Validators.min(0.00000001)]],
    price: [null, [Validators.required, Validators.min(0.01)]],
  });

  // 2. Conectamos Paginator y Sort usando effects modernos
  constructor() {
    effect(() => {
      const pag = this.paginator();
      const srt = this.sort();
      if (pag) this.dataSource.paginator = pag;
      if (srt) this.dataSource.sort = srt;
    });
  }

  ngOnInit() {
    // Buscar ID en el padre o en la ruta actual
    this.route.parent?.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.portfolioId.set(Number(id));
        this.cargarInversiones(); // Traer datos reales
      }
    });

    if (!this.portfolioId()) {
      this.route.paramMap.subscribe(params => {
        const id = params.get('id');
        if (id) {
          this.portfolioId.set(Number(id));
          this.cargarInversiones();
        }
      });
    }
  }

  // --- CARGAR DATOS (GET) ---
  cargarInversiones() {
    const id = this.portfolioId();
    if (!id) return;

    this.cargando.set(true);
    this.investmentService.getInvestments(id).subscribe({
      next: (response: any) => {
        // Rellenar métricas
        this.nombreCartera.set(response.portfolio_name);
        this.valorTotal.set(response.total_value);
        this.totalPosiciones.set(response.investments.length);
        
        // Simulamos ganancias por ahora
        this.ganancias.set(response.total_value * 0.10); 
        this.porcentajeGanancias.set(10.5);

        // Alimentar tabla
        this.dataSource.data = response.investments;
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error cargando inversiones:', err);
        this.cargando.set(false);
      }
    });
  }

  // --- CREAR POSICIÓN (POST) ---
  abrirModalNuevaPosicion() {
    this.posicionForm.reset();
    this.modalAbierto.set(true);
  }

  cerrarModal() {
    this.modalAbierto.set(false);
  }

  guardarPosicion() {
    if (this.posicionForm.invalid || !this.portfolioId()) return;

    this.guardando.set(true);
    const formValues = this.posicionForm.value;

    const payload = {
      symbol: formValues.ticker.toUpperCase(),
      quantity: formValues.quantity,
      avg_buy_price: formValues.price
    };

    this.investmentService.addInvestment(this.portfolioId()!, payload).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModal();
        this.cargarInversiones(); // Recarga la tabla con la nueva compra
      },
      error: (err) => {
        console.error('Error guardando posición:', err);
        this.guardando.set(false);
      }
    });
  }

  // --- ACCIONES SECUNDARIAS ---
  irAWallets() {
    this.router.navigate(['/app/wallets']); 
  }

  verHistorialTrades() {
    const currentId = this.portfolioId();
    if (currentId !== null) {
      this.router.navigate(['/app/wallets', currentId, 'trades']);
    }
  }

  comprarActivo(activo: any) {
    // Abrir el modal con el ticker pre-rellenado
    this.posicionForm.patchValue({ ticker: activo.simbolo, quantity: null, price: null });
    this.modalAbierto.set(true);
  }

  venderActivo(activo: any) {
    if (confirm(`¿Seguro que quieres eliminar la posición de ${activo.simbolo}?`)) {
      this.investmentService.deleteInvestment(this.portfolioId()!, activo.id).subscribe({
        next: () => this.cargarInversiones(),
        error: (err) => console.error('Error eliminando posición:', err)
      });
    }
  }
}