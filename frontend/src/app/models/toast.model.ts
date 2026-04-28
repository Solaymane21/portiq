export interface Toast {
  id: string;
  msg: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}
