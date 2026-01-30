export interface Debt {
  id: string;
  organization_id: string;
  debt_name: string;
  debt_type: string; // e.g., 'Kartu Kredit', 'Pinjaman Bank', 'Hutang Supplier', etc.
  bank_name?: string; // e.g., 'Jenius', 'BCA', 'Mandiri', etc.
  limit_amount: number; // Total limit/plafon
  available_limit?: number; // Limit tersedia; terpakai = limit_amount - available_limit (derived)
  debt_amount: number; // Hutang aktual
  paid_amount?: number; // Jumlah yang sudah dibayar (untuk Pinjaman Online: Total Harus Dibayar - Sisa Harus Dibayar)
  remaining_debt?: number; // Sisa hutang yang harus dibayar (debt_amount - paid_amount untuk regular debts, limit_amount - paid_amount untuk Pinjaman Online)
  total_interest?: number; // Akumulasi bunga (SUM(interest_amount) dari debt_payments); untuk Pinjaman Online kolom Interest = ini
  loan_duration?: number; // Lama pinjaman dalam bulan (untuk Pinjaman Online)
  monthly_payment?: number; // Pembayaran perbulan (untuk Pinjaman Online)
  interest_rate?: number; // Bunga per tahun (%)
  due_date?: string; // Tanggal jatuh tempo
  last_payment_date?: string | null; // Tanggal pembayaran terakhir (MAX(payment_date) dari debt_payments)
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
  available_limit?: number; // Limit tersedia; terpakai = limit_amount - available_limit (derived)
  debt_amount: number;
  paid_amount?: number; // Jumlah yang sudah dibayar
  loan_duration?: number; // Lama pinjaman dalam bulan (untuk Pinjaman Online)
  monthly_payment?: number; // Pembayaran perbulan (untuk Pinjaman Online)
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
