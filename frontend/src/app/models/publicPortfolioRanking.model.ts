export interface PublicPortfolioUser {
  id: number;
  name: string;
  avatar?: string | null;
}

export interface PublicPortfolioRanking {
  id: number;
  name: string;
  owner_name: string;
  user: PublicPortfolioUser;
  asset_count: number;
  total_value: number;
  created_at: string;
  updated_at: string;
}