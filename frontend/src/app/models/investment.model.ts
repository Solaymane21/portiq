export interface Investment {
  id: number;
  portfolio_id: number;
  symbol_id: number;
  quantity: number;
  avg_buy_price: number;
  symbol: string;
  image_url?: string | null;
  current_price?: number;
  value?: number;
  weight?: number;
  return_7d?: number;
  asset_type?: 'stock' | 'crypto' | string;
  name?: string;
  api_id?: string;
}

export interface InvestmentsResponse {
  portfolio_name: string;
  total_value: number;
  investments: Investment[];
}

export interface AssetSearchResult {
  symbol: string;
  name: string;
  api_id?: string; // NUEVO: el id de CoinGecko o TwelveData
  image_url?: string | null;
  asset_type: 'stock' | 'crypto' | string;
}

export interface UpsertPositionPayload {
  symbol: string;
  name?: string | null;
  image_url?: string | null;
  asset_type: 'stock' | 'crypto' | string;
  quantity: number;
  avg_buy_price: number;
  operated_at?: string | null;
}

export interface TradeActionPayload {
  quantity: number;
  price_per_unit: number;
  operated_at?: string | null;
}