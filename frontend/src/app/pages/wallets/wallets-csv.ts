import { Investment } from '../../models/investment.model';

export type ImportPositionRow = {
  symbol: string;
  asset_type: 'stock' | 'crypto';
  quantity: number;
  avg_buy_price: number;
};

const HEADER_ALIASES: Record<string, keyof ImportPositionRow> = {
  symbol: 'symbol',
  ticker: 'symbol',
  activo: 'symbol',
  quantity: 'quantity',
  cantidad: 'quantity',
  avg_buy_price: 'avg_buy_price',
  precio_medio: 'avg_buy_price',
  price: 'avg_buy_price',
  precio: 'avg_buy_price',
};

function normalizeHeader(h: string): string {
  return h
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function parseNumber(raw: string): number | null {
  const s = raw.trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parsePositionsCsv(text: string): { rows: ImportPositionRow[]; error?: string } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    return { rows: [], error: 'El archivo debe incluir cabecera y al menos una fila.' };
  }

  const delimiter = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
  const split = (line: string) => {
    const parts: string[] = [];
    let cur = '';
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { q = !q; continue; }
      if (!q && c === delimiter) { parts.push(cur); cur = ''; continue; }
      cur += c;
    }
    parts.push(cur);
    return parts.map((p) => p.trim().replace(/^"|"$/g, ''));
  };

  const headers = split(lines[0]).map(normalizeHeader);
  const col: Partial<Record<keyof ImportPositionRow, number>> = {};

  headers.forEach((h, i) => {
    const key = HEADER_ALIASES[h];
    if (key) col[key] = i;
  });

  if (col.symbol === undefined || col.quantity === undefined || col.avg_buy_price === undefined) {
    return {
      rows: [],
      error: 'Faltan columnas. Necesitas: symbol, quantity y avg_buy_price.',
    };
  }

  const rows: ImportPositionRow[] = [];

  for (let li = 1; li < lines.length; li++) {
    const cells = split(lines[li]);

    // symbol
    const sym = (cells[col.symbol!] ?? '').trim().toUpperCase();
    if (!sym) {
      return { rows: [], error: `Fila ${li + 1}: symbol está vacío.` };
    }
    if (!/^[A-Z0-9.\-]{1,20}$/.test(sym)) {
      return { rows: [], error: `Fila ${li + 1}: symbol "${sym}" no es válido.` };
    }

    // quantity
    const qty = parseNumber(cells[col.quantity!] ?? '');
    if (qty === null) {
      return { rows: [], error: `Fila ${li + 1}: quantity está vacío o no es un número.` };
    }
    if (qty <= 0) {
      return { rows: [], error: `Fila ${li + 1}: quantity debe ser mayor que 0.` };
    }

    // avg_buy_price
    const price = parseNumber(cells[col.avg_buy_price!] ?? '');
    if (price === null) {
      return { rows: [], error: `Fila ${li + 1}: avg_buy_price está vacío o no es un número.` };
    }
    if (price <= 0) {
      return { rows: [], error: `Fila ${li + 1}: avg_buy_price debe ser mayor que 0.` };
    }

    rows.push({ symbol: sym, asset_type: 'crypto', quantity: qty, avg_buy_price: price });
  }

  if (rows.length === 0) {
    return { rows: [], error: 'No hay filas de datos válidas.' };
  }

  return { rows };
}

function escapeCsvCell(v: string | number): string {
  const s = String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildInvestmentsCsv(portfolioName: string, rows: Investment[]): string {
  const header = ['symbol', 'quantity', 'avg_buy_price'];
  const lines = [
    header.join(','),
    ...rows.map((r) =>
      [
        escapeCsvCell(r.symbol),
        escapeCsvCell(r.quantity),
        escapeCsvCell(r.avg_buy_price),
      ].join(',')
    ),
  ];
  return '\uFEFF' + lines.join('\r\n');
}

export function downloadImportTemplate(): void {
  const header = ['symbol', 'quantity', 'avg_buy_price'];
  const exampleRow = ['AAPL', '10', '150.00'];

  const csv = '\uFEFF' + [header.join(','), exampleRow.join(',')].join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla_importacion.csv';
  a.click();
  URL.revokeObjectURL(url);
}