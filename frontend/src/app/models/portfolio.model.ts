export interface Portfolio {
  id: number;
  name: string;
  is_public: boolean;
  is_default: boolean;
  asset_count?: number;
  total_value?: number;
  created_at?: string;
  updated_at?: string;
}