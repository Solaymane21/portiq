import { Investment } from '../../models/investment.model';

export type ImportPositionRow = {
  symbol: string;
  asset_type: 'stock' | 'crypto';
  quantity: number;
  avg_buy_price: number;
};

// Alias aceptados para las cabeceras del CSV
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

// Limpia la cabecera para poder compararla mejor
function normalizeHeader(header: string): string {
  return header
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

// Convierte texto a numero
function parseNumber(value: string): number | null {
  const normalized = value.trim().replace(',', '.');

  // Si esta vacio no se puede convertir
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  // Solo aceptamos numeros finitos
  return Number.isFinite(parsed) ? parsed : null;
}

// Parte una linea CSV sin romper valores entre comillas
function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (const char of line) {
    // Las comillas cambian el estado del parser
    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    // Solo cortamos columna fuera de comillas
    if (!insideQuotes && char === delimiter) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  // Añade la ultima celda
  cells.push(current);

  // Limpieza final basica
  return cells.map((cell) => cell.trim().replace(/^"|"$/g, ''));
}

// Lee el CSV y devuelve filas validas o un error
export function parsePositionsCsv(text: string): { rows: ImportPositionRow[]; error?: string } {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  // Hace falta cabecera y al menos una fila
  if (lines.length < 2) {
    return {
      rows: [],
      error: 'El archivo debe incluir cabecera y al menos una fila.',
    };
  }

  // Detecta si el CSV usa ";" o ","
  const delimiter = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';

  // Lee y normaliza la cabecera
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeHeader);

  // Guarda en que indice esta cada columna
  const columns: Partial<Record<keyof ImportPositionRow, number>> = {};

  headers.forEach((header, index) => {
    const key = HEADER_ALIASES[header];

    // Solo guardamos columnas conocidas
    if (key) {
      columns[key] = index;
    }
  });

  // Estas columnas son obligatorias
  if (
    columns.symbol === undefined ||
    columns.quantity === undefined ||
    columns.avg_buy_price === undefined
  ) {
    return {
      rows: [],
      error: 'Faltan columnas. Necesitas: symbol, quantity y avg_buy_price.',
    };
  }

  const rows: ImportPositionRow[] = [];

  // Empieza en 1 porque 0 es la cabecera
  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    const cells = splitCsvLine(lines[lineIndex], delimiter);

    // Lee el symbol y lo normaliza
    const symbol = (cells[columns.symbol] ?? '').trim().toUpperCase();

    // El symbol no puede estar vacio
    if (!symbol) {
      return {
        rows: [],
        error: `Fila ${lineIndex + 1}: symbol está vacío.`,
      };
    }

    // Validacion simple para symbols invalidos
    if (!/^[A-Z0-9.\-]{1,20}$/.test(symbol)) {
      return {
        rows: [],
        error: `Fila ${lineIndex + 1}: symbol "${symbol}" no es válido.`,
      };
    }

    // Lee y valida quantity
    const quantity = parseNumber(cells[columns.quantity] ?? '');

    // Quantity debe ser un numero
    if (quantity === null) {
      return {
        rows: [],
        error: `Fila ${lineIndex + 1}: quantity está vacío o no es un número.`,
      };
    }

    // Quantity debe ser mayor que 0
    if (quantity <= 0) {
      return {
        rows: [],
        error: `Fila ${lineIndex + 1}: quantity debe ser mayor que 0.`,
      };
    }

    // Lee y valida avg_buy_price
    const avgBuyPrice = parseNumber(cells[columns.avg_buy_price] ?? '');

    // El precio debe ser un numero
    if (avgBuyPrice === null) {
      return {
        rows: [],
        error: `Fila ${lineIndex + 1}: avg_buy_price está vacío o no es un número.`,
      };
    }

    // El precio debe ser mayor que 0
    if (avgBuyPrice <= 0) {
      return {
        rows: [],
        error: `Fila ${lineIndex + 1}: avg_buy_price debe ser mayor que 0.`,
      };
    }

    // Se mantiene asset_type fijo para no cambiar la logica actual
    rows.push({
      symbol,
      asset_type: 'crypto',
      quantity,
      avg_buy_price: avgBuyPrice,
    });
  }

  // Si no hay filas validas devolvemos error
  if (!rows.length) {
    return {
      rows: [],
      error: 'No hay filas de datos válidas.',
    };
  }

  return { rows };
}

// Escapa valores especiales para que el CSV no se rompa
function escapeCsvCell(value: string | number): string {
  // Convierte el valor a texto
  const text = String(value);

  // Si hay comas, comillas o saltos de linea, se escapa
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  // Si no hay caracteres especiales, se devuelve igual
  return text;
}

// Genera el CSV para exportar inversiones
export function buildInvestmentsCsv(portfolioName: string, rows: Investment[]): string {
  // Se mantiene portfolioName para no cambiar la firma publica
  const header = ['symbol', 'quantity', 'avg_buy_price'];

  // Convierte cada fila a una linea CSV
  const data = rows.map((row) =>
    [
      escapeCsvCell(row.symbol),
      escapeCsvCell(row.quantity),
      escapeCsvCell(row.avg_buy_price),
    ].join(',')
  );

  // Añade BOM para mejorar compatibilidad con Excel
  return '\uFEFF' + [header.join(','), ...data].join('\r\n');
}

// Descarga una plantilla CSV con el formato esperado
export function downloadImportTemplate(): void {
  const csv =
    '\uFEFF' +
    [
      ['symbol', 'quantity', 'avg_buy_price'].join(','),
      ['AAPL', '10', '150.00'].join(','),
    ].join('\r\n');

  // Crea el archivo en memoria
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  // Crea una URL temporal para descargarlo
  const url = URL.createObjectURL(blob);

  // Lanza la descarga en el navegador
  const link = document.createElement('a');
  link.href = url;
  link.download = 'plantilla_importacion.csv';
  link.click();

  // Libera la URL temporal
  URL.revokeObjectURL(url);
}