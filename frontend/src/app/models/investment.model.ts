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
}

export interface InvestmentsResponse {
  portfolio_name: string;
  total_value: number;
  investments: Investment[];
}