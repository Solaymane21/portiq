import { Component, signal, OnInit, inject, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { switchMap, finalize } from 'rxjs/operators';
import { PortfolioService } from '../../../services/portfolio.service';
import { InvestmentService } from '../../../services/investment.service';
import { Portfolio } from '../../../models/portfolio.model';
import { ImportPositionRow, parsePositionsCsv } from '../wallets-csv';

@Component({
  selector: 'app-portfolios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './portfolios.component.html',
  styleUrl: './portfolios.component.css'
})
export class PortfoliosComponent implements OnInit {
  private router = inject(Router);
  private portfolioService = inject(PortfolioService);
  private investmentService = inject(InvestmentService);

  csvFileInput = viewChild<ElementRef<HTMLInputElement>>('csvFileInput');

  viewMode = signal<'list' | 'grid'>('list');
  isLoading = signal(true);
  isSubmitting = signal(false);
  isModalOpen = signal(false);
  isDeleteModalOpen = signal(false);
  modoFormulario = signal<'create' | 'edit'>('create');

  importModalOpen = signal(false);
  importSubmitting = signal(false);
  importTarget = signal<'existing' | 'new'>('existing');
  importRows = signal<ImportPositionRow[]>([]);
  importParseError = signal<string | null>(null);
  importFileName = signal<string | null>(null);

  misCarteras = signal<Portfolio[]>([]);
  carteraSeleccionada = signal<Portfolio | null>(null);

  formularioCartera = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(50)]),
    is_default: new FormControl(false),
    is_public: new FormControl(false)
  });

  importNuevaCartera = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(50)]),
    is_default: new FormControl(false),
    is_public: new FormControl(false)
  });

  importCarteraId = new FormControl<number | null>(null, [Validators.required]);

  ngOnInit() {
    this.cargarPreferenciasVista();
    this.cargarCarteras();
  }

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

    this.isSubmitting.set(true);
    peticion$.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.cerrarModal();
        this.cargarCarteras();
      },
      error: (err) => {
        console.error('Error al guardar cartera:', err);
        this.isSubmitting.set(false);
      }
    });
  }

  eliminarCartera() {
    const seleccionada = this.carteraSeleccionada();
    if (!seleccionada) return;

    this.isSubmitting.set(true);
    this.portfolioService.deletePortfolio(seleccionada.id).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.cerrarModalEliminar();
        this.cargarCarteras();
      },
      error: (err) => {
        console.error('Error al eliminar cartera:', err);
        this.isSubmitting.set(false);
      }
    });
  }

  abrirImportModal() {
    this.importModalOpen.set(true);
    this.importRows.set([]);
    this.importParseError.set(null);
    this.importFileName.set(null);
    this.importTarget.set(this.misCarteras().length ? 'existing' : 'new');
    this.importNuevaCartera.reset({ name: '', is_default: false, is_public: false });
    this.importCarteraId.setValue(this.misCarteras()[0]?.id ?? null);
  }

  cerrarImportModal() {
    this.importModalOpen.set(false);
    this.importSubmitting.set(false);
    const input = this.csvFileInput()?.nativeElement;
    if (input) input.value = '';
  }

  onCsvSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.importFileName.set(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const parsed = parsePositionsCsv(text);
      if (parsed.error) {
        this.importParseError.set(parsed.error);
        this.importRows.set([]);
        return;
      }
      this.importParseError.set(null);
      this.importRows.set(parsed.rows);
    };
    reader.readAsText(file, 'UTF-8');
  }

  ejecutarImportacion() {
    const rows = this.importRows();
    if (rows.length === 0 || this.importParseError()) return;

    this.importSubmitting.set(true);

    const positions = rows.map((r) => ({
      symbol: r.symbol,
      name: r.name ?? null,
      image_url: r.image_url ?? null,
      asset_type: r.asset_type,
      quantity: r.quantity,
      avg_buy_price: r.avg_buy_price,
      operated_at: r.operated_at ?? null
    }));

    if (this.importTarget() === 'new') {
      if (this.importNuevaCartera.invalid) {
        this.importSubmitting.set(false);
        return;
      }
      const v = this.importNuevaCartera.getRawValue();
      this.portfolioService
        .createPortfolio({
          name: v.name!,
          is_default: !!v.is_default,
          is_public: !!v.is_public
        })
        .pipe(
          switchMap((res: any) =>
            this.investmentService.importPositions(res.portfolio.id, positions)
          ),
          finalize(() => this.importSubmitting.set(false))
        )
        .subscribe({
          next: () => {
            this.cerrarImportModal();
            this.cargarCarteras();
          },
          error: (err) => console.error('Error en importación:', err)
        });
      return;
    }

    const pid = this.importCarteraId.value;
    if (pid == null) {
      this.importSubmitting.set(false);
      return;
    }

    this.investmentService
      .importPositions(pid, positions)
      .pipe(finalize(() => this.importSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.cerrarImportModal();
          this.cargarCarteras();
        },
        error: (err) => console.error('Error en importación:', err)
      });
  }

  dispararSeleccionCsv() {
    this.csvFileInput()?.nativeElement.click();
  }

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
