
export interface IncomeTransaction {
  id: string;
  organization_id: string;
  user_id: string;
  transaction_date: string;
  amount: number;
  customer_name?: string;
  payment_method?: string;
  bank_account_id?: string;
  income_type_id?: string;
  category_id?: string;
  service_id?: string;
  sub_service_id?: string;
  is_recurring: boolean;
  recurring_frequency?: string;
  description?: string;
  receipt_file_path?: string;
  receipt_file_name?: string;
  receipt_file_size?: number;
  receipt_mime_type?: string;
  status: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface IncomeTransactionWithRelations extends IncomeTransaction {
  income_types?: {
    name: string;
  };
  income_categories?: {
    name: string;
  };
  services?: {
    name: string;
  };
  sub_services?: {
    name: string;
  };
}

export interface CreateIncomeTransactionData {
  transaction_date: string;
  amount: number;
  customer_name?: string;
  payment_method?: string;
  bank_account_id?: string;
  income_type_id?: string;
  category_id?: string;
  service_id?: string;
  sub_service_id?: string;
  is_recurring?: boolean;
  recurring_frequency?: string;
  description?: string;
  receipt_file?: File;
  receipt_url?: string;
}
