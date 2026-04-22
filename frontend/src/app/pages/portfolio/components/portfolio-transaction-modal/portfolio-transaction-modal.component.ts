import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Activo, SearchResult } from '../../../../models/activo.model';
import { PortfolioService } from '../../../../services/portfolio.service';

@Component({
  selector: 'app-portfolio-transaction-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './portfolio-transaction-modal.component.html'
})
export class PortfolioTransactionModalComponent {
  private http = inject(HttpClient);
  private portfolioService = inject(PortfolioService);

  @Input() carteraId!: number;
  
  // Si le pasamos un activo (desde la tabla), vamos directos al paso 2 (formulario)
  @Input() set activoInicial(activo: Activo | null) {
    if (activo) {
      this.activoSeleccionado = { 
        symbol: activo.simbolo, 
        name: activo.nombre || activo.simbolo, 
        type: 'stock', 
        thumb: activo.image_url 
      };
      this.formulario = { simbolo: activo.simbolo, quantity: 0, avg_buy_price: 0, fecha: this.fechaHoy() };
      this.wizardStep = 2;
      this.obtenerPrecioHistorico();
    } else {
      this.wizardStep = 1;
      this.activoSeleccionado = null;
      this.formulario = { simbolo: '', quantity: 0, avg_buy_price: 0, fecha: this.fechaHoy() };
    }
  }
  
  @Input() set tipoInicial(tipo: 'buy' | 'sell') {
    this.transaccionTipo = tipo;
  }

  @Output() cerrar = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<void>();

  // Variables simples (sin signals)
  wizardStep: 1 | 2 = 1;
  searchQuery = '';
  isSearching = false;
  searchResults: SearchResult[] = [];
  activoSeleccionado: SearchResult | null = null;
  filtroActivo: 'all' | 'crypto' | 'stock' = 'all';
  transaccionTipo: 'buy' | 'sell' = 'buy';
  isFetchingPrice = false;

  // Objeto normal para el formulario (Two-way data binding)
  formulario = { 
    simbolo: '', 
    quantity: 0, 
    avg_buy_price: 0, 
    fecha: this.fechaHoy() 
  };

  fechaHoy(): string { 
    return new Date().toISOString().split('T')[0]; 
  }

  cambiarFiltro(filtro: 'all' | 'crypto' | 'stock') {
    this.filtroActivo = filtro;
    if (this.searchQuery.trim().length >= 2) {
      this.buscarActivos();
    }
  }

  buscarActivos() {
    const query = this.searchQuery.trim();
    if (query.length < 2) return;
    
    this.isSearching = true;
    this.searchResults = []; // Vaciamos resultados anteriores

    // 1. Buscamos Criptomonedas en CoinGecko
    if (this.filtroActivo === 'all' || this.filtroActivo === 'crypto') {
      this.http.get<any>(`https://api.coingecko.com/api/v3/search?query=${query}`).subscribe({
        next: (res) => {
          const criptos = res.coins.slice(0, 4).map((c: any) => ({ 
            symbol: c.symbol.toUpperCase(), 
            name: c.name, 
            type: 'crypto', 
            thumb: c.large || c.thumb 
          }));
          this.searchResults.push(...criptos);
        },
        error: (err) => console.error('Error cargando criptos', err)
      });
    }

    // 2. Buscamos Acciones en TwelveData
    if (this.filtroActivo === 'all' || this.filtroActivo === 'stock') {
      this.http.get<any>(`https://api.twelvedata.com/symbol_search?symbol=${query}`).subscribe({
        next: (res) => {
          const acciones = (res.data || []).slice(0, 4).map((s: any) => ({ 
            symbol: s.symbol, 
            name: s.instrument_name, 
            type: 'stock', 
            thumb: `https://ui-avatars.com/api/?name=${s.symbol}&background=171717&color=f97316&rounded=true&bold=true` 
          }));
          this.searchResults.push(...acciones);
        },
        error: (err) => console.error('Error cargando acciones', err)
      });
    }

    // Quitamos el loading tras 1 segundo
    setTimeout(() => this.isSearching = false, 1000);
  }

  seleccionarParaComprarVender(resultado: SearchResult) {
    this.activoSeleccionado = resultado;
    this.transaccionTipo = 'buy';
    this.formulario = { 
      simbolo: resultado.symbol, 
      quantity: 0, 
      avg_buy_price: 0, 
      fecha: this.fechaHoy() 
    };
    this.wizardStep = 2;
    this.obtenerPrecioHistorico();
  }

  obtenerPrecioHistorico() {
    if (!this.activoSeleccionado || !this.formulario.fecha) return;
    this.isFetchingPrice = true;

    if (this.activoSeleccionado.type === 'crypto') {
      // PRECIO CRIPTOS (Binance no requiere API Key y es instantáneo)
      this.http.get<any>(`https://api.binance.com/api/v3/ticker/price?symbol=${this.activoSeleccionado.symbol}USDT`).subscribe({
        next: (res) => {
          this.formulario.avg_buy_price = parseFloat(res.price);
          this.isFetchingPrice = false;
        },
        error: () => {
          this.formulario.avg_buy_price = 0;
          this.isFetchingPrice = false;
        }
      });
    } else {
      // PRECIO ACCIONES (TwelveData)
      // ATENCIÓN: Necesitas poner tu API KEY real aquí para que funcione
      const API_KEY = 'demo'; 
      this.http.get<any>(`https://api.twelvedata.com/price?symbol=${this.activoSeleccionado.symbol}&apikey=${API_KEY}`).subscribe({
        next: (res) => {
          this.formulario.avg_buy_price = parseFloat(res.price);
          this.isFetchingPrice = false;
        },
        error: () => {
          this.formulario.avg_buy_price = 0;
          this.isFetchingPrice = false;
        }
      });
    }
  }

  guardarTransaccion() {
    const payload = {
      simbolo: this.activoSeleccionado?.symbol || this.formulario.simbolo,
      nombre: this.activoSeleccionado?.name || null,
      image_url: this.activoSeleccionado?.thumb || null,
      type: this.transaccionTipo,
      quantity: Number(this.formulario.quantity),
      price: Number(this.formulario.avg_buy_price),
      date: this.formulario.fecha
    };

    this.portfolioService.createTransaccion(this.carteraId, payload).subscribe({
      next: () => { 
        this.guardado.emit(); 
        this.cerrar.emit(); 
      },
      error: (err) => console.error('Error al guardar transacción:', err)
    });
  }
}