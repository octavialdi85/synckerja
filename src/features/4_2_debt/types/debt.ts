export interface Debt {
  id: string;
  organization_id: string;
  debt_name: string;
  debt_type: string; // e.g., 'Kartu Kredit', 'Pinjaman Bank', 'Hutang Supplier', etc.
  bank_name?: string; // e.g., 'Jenius', 'BCA', 'Mandiri', etc.
  limit_amount: number; // Total limit/plafon
  available_limit?: number; // Limit tersedia (limit_amount - used_amount)
  used_amount: number; // Jumlah yang sudah terpakai
  debt_amount: number; // Hutang aktual (sama dengan used_amount - jumlah yang terpakai)
  interest_rate?: number; // Bunga per tahun (%)
  due_date?: string; // Tanggal jatuh tempo
  minimum_payment?: number; // Minimum payment
  description?: string;
  status: 'active' | 'paid_off' | 'closed'; // Status hutang
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDebtData {
  debt_name: string;
  debt_type: string;
  bank_name?: string;
  limit_amount: number;
  available_limit?: number; // Limit tersedia (jika diisi, used_amount akan dihitung otomatis)
  used_amount: number;
  debt_amount: number;
  interest_rate?: number;
  due_date?: string;
  minimum_payment?: number;
  description?: string;
  status?: 'active' | 'paid_off' | 'closed';
}

export interface UpdateDebtData extends Partial<CreateDebtData> {
  id: string;
}

export const DEBT_TYPES = [
  'Kartu Kredit',
  'Pinjaman Bank',
  'Hutang Supplier',
  'Pinjaman Online',
  'Hutang Pribadi',
  'Lainnya'
] as const;

export type DebtType = typeof DEBT_TYPES[number];
