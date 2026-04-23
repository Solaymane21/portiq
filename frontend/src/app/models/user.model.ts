export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  avatar: string | null;
  google_id: string | null;
  verify_code: string | null;
  suscription_type: 'free' | 'premium';
  created_at: string;
  updated_at: string;
}
