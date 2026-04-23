export interface Activo {
  id: number;
  simbolo: string;
  nombre?: string;
  image_url?: string;
  peso: number;
  retorno7d: number;
  valor: number;
  acciones: number; 
  avg_buy_price: number;
}

export interface SearchResult {
  symbol: string;
  name: string;
  type: 'crypto' | 'stock';
  thumb?: string;
}