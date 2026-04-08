export interface User {
  id:                number;
  name:              string;
  email:             string;
  avatar:            string | null;
  google_id:         string | null;
  verify_code:       string | null;
  subscription_type: 'free' | 'premium';
  created_at:        string;
  updated_at:        string;
}
