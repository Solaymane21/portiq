export interface User {
  id?: number;
  name: string;
  email: string;
  password?: string;
  avatar?: string | null;
  google_id?: string | null;
  verify_code?: string | null;
  suscription_type?: 'free' | 'premium';
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AdminUsersResponse {
  users: User[];
  totalUsers: number;
  loggedToday: number;
  premiumUsers: number;
  totalPortfolios: number;
}
