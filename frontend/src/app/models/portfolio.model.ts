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
  price: string;
  change: string;
  positive: boolean;
}

export interface Portfolio {
  id: number;
  name: string;
  totalValue: number;
  totalValueUSD: number;
  totalPositions: number;
  profitLoss: number;
  allocation: PortfolioAllocation[];
  symbol: string;
  positions: PortfolioPosition[];
}