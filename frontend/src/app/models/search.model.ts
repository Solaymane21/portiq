export interface SearchResult {
  symbol: string;
  name: string;
  api_id: string;
  image_url: string | null;
  asset_type: 'crypto' | 'stock' | 'etf';
  source: 'local' | 'api';
}