import { Investment } from '../../models/investment.model';

export type ImportPositionRow = {
  symbol: string;
  asset_type: 'stock' | 'crypto';
  quantity: number;
  avg_buy_price: number;
  name?: string;
  image_url?: string;
  operated_at?: string;
};

const HEADER_ALIASES: Record<string, keyof ImportPositionRow> = {
  symbol: 'symbol',
  ticker: 'symbol',
  activo: 'symbol',
  asset_type: 'asset_type',
  tipo: 'asset_type',
  quantity: 'quantity',
  cantidad: 'quantity',
  avg_buy_price: 'avg_buy_price',
  precio_medio: 'avg_buy_price',
  price: 'avg_buy_price',
  precio: 'avg_buy_price',
  name: 'name',
  nombre: 'name',
  image_url: 'image_url',
  operated_at: 'operated_at',
  fecha: 'operated_at',
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

/** Lee un CSV de posiciones (cabecera obligatoria). */
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
      if (c === '"') {
        q = !q;
        continue;
      }
      if (!q && c === delimiter) {
        parts.push(cur);
        cur = '';
        continue;
      }
      cur += c;
    }
    parts.push(cur);
    return parts.map((p) => p.trim().replace(/^"|"$/g, ''));
  };

  const headers = split(lines[0]).map(normalizeHeader);
  const col: Partial<Record<keyof ImportPositionRow, number>> = {};

  headers.forEach((h, i) => {
    const key = HEADER_ALIASES[h];
    if (key) {
      col[key] = i;
    }
  });

  if (col.symbol === undefined || col.asset_type === undefined || col.quantity === undefined || col.avg_buy_price === undefined) {
    return {
      rows: [],
      error: 'Faltan columnas. Necesitas: symbol (o ticker), asset_type, quantity y avg_buy_price (o price).',
    };
  }

  const rows: ImportPositionRow[] = [];

  for (let li = 1; li < lines.length; li++) {
    const cells = split(lines[li]);
    const sym = (cells[col.symbol!] ?? '').trim().toUpperCase();
    if (!sym) continue;

    const atRaw = (cells[col.asset_type!] ?? '').trim().toLowerCase();
    if (atRaw !== 'stock' && atRaw !== 'crypto') {
      return { rows: [], error: `Fila ${li + 1}: asset_type debe ser stock o crypto.` };
    }

    const qty = parseNumber(cells[col.quantity!] ?? '');
    const price = parseNumber(cells[col.avg_buy_price!] ?? '');
    if (qty === null || qty <= 0) {
      return { rows: [], error: `Fila ${li + 1}: quantity no válida.` };
    }
    if (price === null) {
      return { rows: [], error: `Fila ${li + 1}: precio no válido.` };
    }

    const row: ImportPositionRow = {
      symbol: sym,
      asset_type: atRaw as 'stock' | 'crypto',
      quantity: qty,
      avg_buy_price: price,
    };

    if (col.name !== undefined) {
      const n = (cells[col.name] ?? '').trim();
      if (n) row.name = n;
    }
    if (col.image_url !== undefined) {
      const u = (cells[col.image_url] ?? '').trim();
      if (u) row.image_url = u;
    }
    if (col.operated_at !== undefined) {
      const d = (cells[col.operated_at] ?? '').trim();
      if (d) row.operated_at = d;
    }

    rows.push(row);
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

/** Genera CSV de posiciones activas (UTF-8 con BOM para Excel). */
export function buildInvestmentsCsv(portfolioName: string, rows: Investment[]): string {
  const header = [
    'portfolio_name',
    'symbol',
    'name',
    'asset_type',
    'quantity',
    'avg_buy_price',
    'value_eur',
    'weight_pct',
  ];
  const lines = [
    header.join(','),
    ...rows.map((r) =>
      [
        escapeCsvCell(portfolioName),
        escapeCsvCell(r.symbol),
        escapeCsvCell(r.name ?? ''),
        escapeCsvCell(r.asset_type ?? ''),
        escapeCsvCell(r.quantity),
        escapeCsvCell(r.avg_buy_price),
        escapeCsvCell(r.value ?? 0),
        escapeCsvCell(r.weight ?? 0),
      ].join(',')
    ),
  ];
  return '\uFEFF' + lines.join('\r\n');
}
