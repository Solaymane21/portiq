export interface PortfolioAllocation {
  label: string;
  percent: number;
  color: string;
  colorClass: string;
  textClass: string;
}

export interface PortfolioPosition {
  ticker: string;
  name: string;
  quantity: number;  
  price: number;  
  value: number; 
  change: string;
  positive: boolean;
}

export interface PortfolioDashboard {
  id: number;
  name: string;
  totalValue: number;
  totalValueUSD: number;
  totalPositions: number;
  profitLoss: number;
  assetType?: string;
  allocation: PortfolioAllocation[];
  symbol: string;
  positions: PortfolioPosition[];
}