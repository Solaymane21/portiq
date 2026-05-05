export interface PublicPortfolioRanking {
  id: number;
  name: string;
  owner_name: string;
  user: {
    id: number;
    name: string;
    avatar?: string | null;
  };
  asset_count: number;
  total_value: number;
  created_at: string;
  updated_at: string;
}
