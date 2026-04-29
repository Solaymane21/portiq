import { Component, signal, inject, OnInit, effect, viewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InvestmentService } from '../../../services/investment.service';
import { Investment, InvestmentsResponse } from '../../../models/investment.model';

import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';

@Component({
  selector: 'app-investments',
  standalone: true,
  imports: [ReactiveFormsModule, MatTableModule, MatSortModule, MatPaginatorModule],
  templateUrl: './investments.component.html',
  styleUrl: './investments.component.css'
})
export class InvestmentsComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private investmentService = inject(InvestmentService);

  portfolioId = signal<number | null>(null);

  cargando = signal(true);
  nombreCartera = signal('Cargando...');
  valorTotal = signal(0);
  ganancias = signal(0);
  porcentajeGanancias = signal(0);
  totalPosiciones = signal(0);

  dataSource = new MatTableDataSource<Investment>([]);
  paginator = viewChild(MatPaginator);
  sort = viewChild(MatSort);

  columnasDef = [
    { def: 'symbol', title: 'Activo', align: 'left' },
    { def: 'weight', title: 'Peso', align: 'right' },
    { def: 'return_7d', title: '7D retorno', align: 'right' },
    { def: 'value', title: 'Valor', align: 'right' },
    { def: 'quantity', title: 'Acciones', align: 'right' }
  ];

  displayedColumns: string[] = [...this.columnasDef.map(c => c.def), 'opciones'];

  modalAbierto = signal(false);
  guardando = signal(false);

  posicionForm: FormGroup = this.fb.group({
    ticker: ['', [Validators.required, Validators.maxLength(10)]],
    quantity: [null, [Validators.required, Validators.min(0.00000001)]],
    price: [null, [Validators.required, Validators.min(0.01)]],
  });

  constructor() {
    effect(() => {
      const pag = this.paginator();
      const srt = this.sort();

      if (pag) this.dataSource.paginator = pag;
      if (srt) this.dataSource.sort = srt;
    });
  }

  ngOnInit() {
    this.route.parent?.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.portfolioId.set(Number(id));
        this.cargarInversiones();
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

  cargarInversiones() {
  const id = this.portfolioId();
  if (!id) return;

  this.cargando.set(true);

  this.investmentService.getInvestments(id).subscribe({
    next: (response) => {
      const data = response as InvestmentsResponse;

      this.nombreCartera.set(data.portfolio_name);
      this.valorTotal.set(data.total_value);
      this.totalPosiciones.set(data.investments.length);

      this.ganancias.set(0);
      this.porcentajeGanancias.set(0);

      this.dataSource.data = data.investments;
      this.cargando.set(false);
    },
    error: (err) => {
      console.error('Error cargando inversiones:', err);
      this.cargando.set(false);
    }
  });
}

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
        this.cargarInversiones();
      },
      error: (err) => {
        console.error('Error guardando posición:', err);
        this.guardando.set(false);
      }
    });
  }

  irAWallets() {
    this.router.navigate(['/app/wallets']);
  }

  verHistorialTrades() {
    const currentId = this.portfolioId();
    if (currentId !== null) {
      this.router.navigate(['/app/wallets', currentId, 'trades']);
    }
  }

  comprarActivo(activo: Investment) {
    this.posicionForm.patchValue({
      ticker: activo.symbol,
      quantity: null,
      price: null
    });
    this.modalAbierto.set(true);
  }

  venderActivo(activo: Investment) {
    if (confirm(`¿Seguro que quieres eliminar la posición de ${activo.symbol}?`)) {
      this.investmentService.deleteInvestment(this.portfolioId()!, activo.id).subscribe({
        next: () => this.cargarInversiones(),
        error: (err) => console.error('Error eliminando posición:', err)
      });
    }
  }

  getInitial(value: string | null | undefined): string {
    return value ? value.charAt(0).toUpperCase() : '';
  }

  formatNumber(value: number | null | undefined, digits: number = 2): string {
    return Number(value ?? 0).toFixed(digits);
  }

  getTextAlignClass(align: string): string {
    return align === 'right' ? '!text-right' : '!text-left';
  }

  getCellClass(colDef: string, value: number | string | null | undefined): string {
    if (colDef === 'return_7d') {
      return Number(value ?? 0) >= 0
        ? '!text-green-500 font-medium'
        : '!text-red-500 font-medium';
    }

    if (colDef === 'value') {
      return '!text-white font-medium';
    }

    if (colDef !== 'symbol') {
      return '!text-neutral-400 font-ibm';
    }

    return '';
  }
}