export interface User {
  id?: number;
  name: string;
  email: string;
  password?: string;
  avatar?: string | null;
  google_id?: string | null;
  verify_code?: string | null;
  suscription_type?: 'free' | 'premium';
  subscription_cancelled: boolean;
  last_login_at?: string | null;
  is_admin?: boolean;
  created_at?: string;
  updated_at?: string;
  is_new_user?: boolean;
}

export interface AdminUsersResponse {
  users: User[];
  totalUsers: number;
  loggedToday: number;
  premiumUsers: number;
  totalPortfolios: number;
}
