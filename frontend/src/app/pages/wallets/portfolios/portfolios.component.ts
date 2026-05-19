import { Component, signal, OnInit, inject, viewChild, ElementRef, computed } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, finalize } from 'rxjs/operators';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';

import { PortfolioService } from '../../../services/portfolio.service';
import { InvestmentService } from '../../../services/investment.service';
import { Portfolio } from '../../../models/portfolio.model';
import { ImportPositionRow, parsePositionsCsv } from '../wallets-csv';


@Component({
  selector: 'app-portfolios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgClass, CdkMenuTrigger, CdkMenu, CdkMenuItem],
  templateUrl: './portfolios.component.html',
  styleUrl: './portfolios.component.css'
})
export class PortfoliosComponent implements OnInit {

  // Servicios
  private router            = inject(Router);
  private portfolioService  = inject(PortfolioService);
  private investmentService = inject(InvestmentService);

  // Referencias del template
  csvFileInput = viewChild<ElementRef<HTMLInputElement>>('csvFileInput');

  // Estado general
  isLoading     = signal(true);
  isSubmitting  = signal(false);
  emptyHover    = signal(false);
  skeletonItems = Array(6);

  myPortfolios      = signal<Portfolio[]>([]);
  selectedPortfolio = signal<Portfolio | null>(null);

  sortedPortfolios = computed(() => {
    return [...this.myPortfolios()].sort((a, b) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return a.id - b.id;
    });
  });

  // Modal crear / editar
  isModalOpen = signal(false);
  formMode    = signal<'create' | 'edit'>('create');

  portfolioForm = new FormGroup({
    name:       new FormControl('', [Validators.required, Validators.maxLength(15)]),
    is_default: new FormControl(false),
    is_public:  new FormControl(false)
  });

  portfolioIsPublic  = toSignal(this.portfolioForm.get('is_public')!.valueChanges,  { initialValue: false });
  portfolioIsDefault = toSignal(this.portfolioForm.get('is_default')!.valueChanges, { initialValue: false });

  // Modal eliminar
  isDeleteModalOpen = signal(false);

  // Modal importar CSV
  importModalOpen  = signal(false);
  importSubmitting = signal(false);
  importTarget     = signal<'existing' | 'new'>('existing');
  importRows       = signal<ImportPositionRow[]>([]);
  importParseError = signal<string | null>(null);
  importFileName   = signal<string | null>(null);

  importNewPortfolio = new FormGroup({
    name:       new FormControl('', [Validators.required, Validators.maxLength(15)]),
    is_default: new FormControl(false),
    is_public:  new FormControl(false)
  });

  importPortfolioId = new FormControl<number | null>(null, [Validators.required]);


  // ─────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────────────

  ngOnInit() {
    this.loadPortfolios();
  }


  // ─────────────────────────────────────────────────────────────────────────
  // Carteras
  // ─────────────────────────────────────────────────────────────────────────

  loadPortfolios() {
    this.isLoading.set(true);
    this.portfolioService.getPortfolios().subscribe({
      next: (data) => {
        this.myPortfolios.set(data as Portfolio[]);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading portfolios', err);
        this.isLoading.set(false);
      }
    });
  }

  savePortfolio() {
    if (this.portfolioForm.invalid) return;

    const data = {
      name:       this.portfolioForm.value.name!,
      is_default: this.portfolioForm.value.is_default!,
      is_public:  this.portfolioForm.value.is_public!
    };

    const request$ = this.formMode() === 'create'
      ? this.portfolioService.createPortfolio(data)
      : this.portfolioService.updatePortfolio(this.selectedPortfolio()!.id, data);

    this.isSubmitting.set(true);
    request$.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeModal();
        this.loadPortfolios();
      },
      error: (err) => {
        console.error('Error saving portfolio:', err);
        this.isSubmitting.set(false);
      }
    });
  }

  deletePortfolio() {
    const selected = this.selectedPortfolio();
    if (!selected) return;

    this.isSubmitting.set(true);
    this.portfolioService.deletePortfolio(selected.id).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeDeleteModal();
        this.loadPortfolios();
      },
      error: (err) => {
        console.error('Error deleting portfolio:', err);
        this.isSubmitting.set(false);
      }
    });
  }

  goToPortfolio(portfolioId: number) {
    this.router.navigate(['/app/wallets', portfolioId]);
  }

  getGridClass(): string {
    const len = this.sortedPortfolios().length;
    if (len === 1) return 'grid-cols-1';
    if (len === 2) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2';
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  }


  // ─────────────────────────────────────────────────────────────────────────
  // Modal crear / editar
  // ─────────────────────────────────────────────────────────────────────────

  openCreateModal() {
    this.prepareModal('create', null);
  }

  openEditModal(portfolio: Portfolio) {
    this.prepareModal('edit', portfolio);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedPortfolio.set(null);
  }

  private prepareModal(mode: 'create' | 'edit', portfolio: Portfolio | null) {
    this.formMode.set(mode);
    this.selectedPortfolio.set(portfolio);
    this.portfolioForm.patchValue({
      name:       portfolio?.name       ?? '',
      is_default: portfolio?.is_default ?? false,
      is_public:  portfolio?.is_public  ?? false
    });
    this.isModalOpen.set(true);
  }


  // ─────────────────────────────────────────────────────────────────────────
  // Modal eliminar
  // ─────────────────────────────────────────────────────────────────────────

  openDeleteModal(portfolio: Portfolio) {
    this.selectedPortfolio.set(portfolio);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal() {
    this.isDeleteModalOpen.set(false);
    this.selectedPortfolio.set(null);
  }


  // ─────────────────────────────────────────────────────────────────────────
  // Modal importar CSV
  // ─────────────────────────────────────────────────────────────────────────

  openImportModal() {
    this.importModalOpen.set(true);
    this.importRows.set([]);
    this.importParseError.set(null);
    this.importFileName.set(null);
    this.importTarget.set(this.myPortfolios().length ? 'existing' : 'new');
    this.importNewPortfolio.reset({ name: '', is_default: false, is_public: false });
    this.importPortfolioId.setValue(this.myPortfolios()[0]?.id ?? null);
  }

  closeImportModal() {
    this.importModalOpen.set(false);
    this.importSubmitting.set(false);
    const input = this.csvFileInput()?.nativeElement;
    if (input) input.value = '';
  }

  triggerCsvSelection() {
    this.csvFileInput()?.nativeElement.click();
  }

  onCsvSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    this.importFileName.set(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const text   = String(reader.result ?? '');
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

  executeImport() {
    const rows = this.importRows();
    if (rows.length === 0 || this.importParseError()) return;

    this.importSubmitting.set(true);

    const positions = rows.map((r) => ({
      symbol:        r.symbol,
      name:          r.name       ?? null,
      image_url:     r.image_url  ?? null,
      asset_type:    r.asset_type,
      quantity:      r.quantity,
      avg_buy_price: r.avg_buy_price,
      operated_at:   r.operated_at ?? null
    }));

    if (this.importTarget() === 'new') {
      if (this.importNewPortfolio.invalid) {
        this.importSubmitting.set(false);
        return;
      }
      const v = this.importNewPortfolio.getRawValue();
      this.portfolioService
        .createPortfolio({ name: v.name!, is_default: !!v.is_default, is_public: !!v.is_public })
        .pipe(
          switchMap((res: any) => this.investmentService.importPositions(res.portfolio.id, positions)),
          finalize(() => this.importSubmitting.set(false))
        )
        .subscribe({
          next:  () => { this.closeImportModal(); this.loadPortfolios(); },
          error: (err) => console.error('Import error:', err)
        });
      return;
    }

    const pid = this.importPortfolioId.value;
    if (pid == null) {
      this.importSubmitting.set(false);
      return;
    }

    this.investmentService
      .importPositions(pid, positions)
      .pipe(finalize(() => this.importSubmitting.set(false)))
      .subscribe({
        next:  () => { this.closeImportModal(); this.loadPortfolios(); },
        error: (err) => console.error('Import error:', err)
      });
  }
}