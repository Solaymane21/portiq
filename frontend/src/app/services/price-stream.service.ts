import { Injectable, signal, OnDestroy } from '@angular/core';
import { environment } from '../../environments/environment';

export interface PriceUpdate {
  symbol: string;
  price:  number;
  change: number;
}

@Injectable({ providedIn: 'root' })
export class PriceStreamService implements OnDestroy {

  private laravelUrl     = environment.apiUrl;
  private abortController: AbortController | null = null;
  private decoder        = new TextDecoder();
  private buffer         = '';
  private currentSymbols:    string[] = [];
  private currentAssetTypes: string[] = [];

  prices    = signal<Record<string, number>>({});
  changes   = signal<Record<string, number>>({});
  connected = signal<boolean>(false);

  connect(symbols: string[], assetTypes: string[]): void {
    if (this.abortController) this.disconnect();
    if (symbols.length === 0) return;

    this.currentSymbols    = symbols;
    this.currentAssetTypes = assetTypes;

    const token      = localStorage.getItem('token');
    const symbolsStr = symbols.join(',');
    const typesStr   = assetTypes.join(',');
    const url        = `${this.laravelUrl}/prices/stream?symbols=${symbolsStr}&asset_types=${typesStr}`;

    this.abortController = new AbortController();

    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept':        'text/event-stream',
      },
      signal: this.abortController.signal
    })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.connected.set(true);
      return response.body!.getReader();
    })
    .then(reader => this.readStream(reader))
    .catch(err => {
      if (err.name === 'AbortError') return;
      console.error('SSE error:', err);
      this.connected.set(false);
      setTimeout(() => this.connect(this.currentSymbols, this.currentAssetTypes), 5000);
    });
  }

  private readStream(reader: ReadableStreamDefaultReader<Uint8Array>): void {
    reader.read().then(({ done, value }) => {
      if (done) {
        this.connected.set(false);
        return;
      }

      this.buffer += this.decoder.decode(value, { stream: true });

      const lines = this.buffer.split('\n');
      this.buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        try {
          const data = JSON.parse(line.slice(6));

          if (data.type === 'connected') {
            this.connected.set(true);
            continue;
          }

          if (data.type === 'prices' && data.results) {
            const priceMap:  Record<string, number> = {};
            const changeMap: Record<string, number> = {};

            data.results.forEach((item: any) => {
              if (item.price != null) {
                priceMap[item.symbol]  = item.price;
                changeMap[item.symbol] = item.change ?? 0;
              }
            });

            this.prices.update(prev  => ({ ...prev, ...priceMap  }));
            this.changes.update(prev => ({ ...prev, ...changeMap }));
          }
        } catch {
          // línea malformada, ignorar
        }
      }

      this.readStream(reader);
    }).catch(err => {
      if (err.name === 'AbortError') return;
      console.error('SSE stream read error:', err);
      this.connected.set(false);
      setTimeout(() => this.connect(this.currentSymbols, this.currentAssetTypes), 5000);
    });
  }

  addSymbol(symbol: string, assetType: string): void {
    if (this.currentSymbols.includes(symbol)) return;

    this.currentSymbols    = [...this.currentSymbols, symbol];
    this.currentAssetTypes = [...this.currentAssetTypes, assetType];

    this.connect(this.currentSymbols, this.currentAssetTypes);
  }

  disconnect(): void {
    this.abortController?.abort();
    this.abortController = null;
    this.connected.set(false);
    this.buffer = '';
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}